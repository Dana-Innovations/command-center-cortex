import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getCortexUserFromRequest } from "@/lib/cortex/user";
import { createServiceClient } from "@/lib/supabase/server";
import {
  type MorningBrief,
  type MorningBriefResponseBody,
  type BriefApiSnapshot,
  buildBriefPrompt,
  computeSnapshotHash,
  parseMorningBriefDraft,
  parseMorningBriefRequestBody,
  parseStoredMorningBrief,
} from "@/lib/morning-brief";
import {
  buildBatchDossiers,
  serializeDossierForPrompt,
} from "@/lib/relationship-dossier";
import { hasVaultAccess, getVaultContext } from "@/lib/vault-client";

const BRIEF_SYSTEM_PROMPT = `You are an executive briefing assistant. Synthesize data from multiple business systems (email, calendar, tasks, Slack, Teams, Salesforce, Monday.com) into a concise, actionable morning brief.

Rules:
- Be direct and specific. Name people, deals, and projects.
- Prioritize actions that have deadlines today or are overdue.
- Highlight cross-service correlations (e.g., a meeting today with someone who also emailed and has an open deal).
- Severity levels: "critical" = needs action in hours, "warning" = needs attention today, "info" = awareness only.
- Headline: 1-2 sentences maximum.
- Each action should be a single, clear directive.
- CRITICAL: For each priorityAction, preserve the source object (itemType, itemId, provider, title) exactly as provided in the input data. This is required for the feedback system.
- Use the peopleContext section to identify VIPs and prioritize their items. When mentioning a person, note their relevance tier if they are a VIP.
- Surface delegation blockers prominently — overdue delegated tasks should be critical severity.
- If yesterdayContext is provided, reference it when today has follow-up items (thread continuity).
- Cross-reference calendar attendees against email/task activity to surface meeting prep needs.
- Return valid JSON matching the exact schema requested. No markdown, no code fences, just raw JSON.`;

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export async function POST(request: NextRequest) {
  const user = await getCortexUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = parseMorningBriefRequestBody(rawBody);
  if (!body.ok) {
    return NextResponse.json(
      { error: body.error },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const todayDate = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Los_Angeles",
  });
  const inputHash = computeSnapshotHash(body.value.snapshot);

  // --- Check cache ---
  if (!body.value.force) {
    const { data: cached } = await supabase
      .from("morning_brief_cache")
      .select("brief_json, expires_at, input_hash")
      .eq("cortex_user_id", user.sub)
      .eq("brief_date", todayDate)
      .maybeSingle();

    const parsedCached = parseStoredMorningBrief(cached?.brief_json);
    if (
      cached &&
      parsedCached.ok &&
      cached.input_hash === inputHash &&
      new Date(cached.expires_at) > new Date()
    ) {
      return NextResponse.json({
        brief: parsedCached.value,
        cached: true,
      } satisfies MorningBriefResponseBody);
    }
  }

  // --- Enrich with relationship intelligence ---
  const enrichment = await buildBriefEnrichment(
    supabase,
    user.sub,
    body.value.snapshot,
    todayDate
  );

  // --- Generate brief via Claude ---
  const prompt = buildBriefPrompt(body.value.snapshot, enrichment);

  try {
    const result = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: BRIEF_SYSTEM_PROMPT,
      prompt,
      maxOutputTokens: 3000,
    });

    const text = result.text.trim();
    if (!text) {
      return NextResponse.json(
        { error: "Empty response from AI" },
        { status: 502 }
      );
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response as JSON" },
        { status: 502 }
      );
    }

    const parsed = parseMorningBriefDraft(parsedJson);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: `AI response schema mismatch: ${parsed.error}` },
        { status: 502 }
      );
    }

    const brief: MorningBrief = {
      generatedAt: new Date().toISOString(),
      ...parsed.value,
    };

    // --- Cache the result ---
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
    const tokenCount = result.usage?.totalTokens ?? null;

    await supabase.from("morning_brief_cache").upsert(
      {
        cortex_user_id: user.sub,
        brief_date: todayDate,
        brief_json: brief,
        input_hash: inputHash,
        generated_at: brief.generatedAt,
        expires_at: expiresAt,
        model_id: "claude-sonnet-4-20250514",
        token_count: tokenCount,
      },
      { onConflict: "cortex_user_id,brief_date" }
    );

    return NextResponse.json({
      brief,
      cached: false,
    } satisfies MorningBriefResponseBody);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Morning brief generation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Enrichment builder ────────────────────────────────────────────────────

async function getUserEmail(
  supabase: ReturnType<typeof createServiceClient>,
  cortexUserId: string
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("user_settings")
      .select("settings")
      .eq("cortex_user_id", cortexUserId)
      .maybeSingle();
    const email = (data?.settings as Record<string, unknown>)?.email;
    return typeof email === "string" ? email : null;
  } catch {
    return null;
  }
}

export interface BriefEnrichment {
  peopleContext: string[];
  yesterdayHeadline: string | null;
  vaultContext: string | null;
}

async function buildBriefEnrichment(
  supabase: ReturnType<typeof createServiceClient>,
  cortexUserId: string,
  snapshot: BriefApiSnapshot,
  todayDate: string
): Promise<BriefEnrichment> {
  // Extract unique person names from the snapshot
  const nameSet = new Set<string>();
  for (const item of snapshot.communications) {
    if (item.sender) nameSet.add(item.sender);
  }
  for (const event of snapshot.calendar) {
    if (event.organizer) nameSet.add(event.organizer);
  }
  for (const item of snapshot.tasks) {
    if (item.sender) nameSet.add(item.sender);
  }

  // Check vault access
  const userEmail = await getUserEmail(supabase, cortexUserId);
  const shouldFetchVault = userEmail !== null && hasVaultAccess(userEmail);

  // Parallel: fetch dossiers + yesterday's brief + vault context
  const [dossiers, yesterdayBrief, vaultContext] = await Promise.all([
    buildBatchDossiers(supabase, cortexUserId, [...nameSet]),
    fetchYesterdayHeadline(supabase, cortexUserId, todayDate),
    shouldFetchVault
      ? getVaultContext([...nameSet]).catch((e) => {
          console.warn("[morning-brief] vault context failed:", e);
          return null;
        })
      : Promise.resolve(null),
  ]);

  return {
    peopleContext: dossiers.map(serializeDossierForPrompt),
    yesterdayHeadline: yesterdayBrief,
    vaultContext,
  };
}

async function fetchYesterdayHeadline(
  supabase: ReturnType<typeof createServiceClient>,
  cortexUserId: string,
  todayDate: string
): Promise<string | null> {
  const yesterday = new Date(todayDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString("en-CA");

  const { data } = await supabase
    .from("morning_brief_cache")
    .select("brief_json")
    .eq("cortex_user_id", cortexUserId)
    .eq("brief_date", yesterdayStr)
    .maybeSingle();

  if (!data?.brief_json) return null;

  const json = data.brief_json as Record<string, unknown>;
  return typeof json.headline === "string" ? json.headline : null;
}
