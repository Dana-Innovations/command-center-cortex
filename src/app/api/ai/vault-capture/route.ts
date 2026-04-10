import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getCortexUserFromRequest } from "@/lib/cortex/user";
import { hasVaultAccess, searchVaultText } from "@/lib/vault-client";
import {
  buildCapturePrompt,
  type CaptureRequest,
  type RoutingPlan,
} from "@/lib/capture-routing";

export async function POST(request: NextRequest) {
  // Auth
  const user = await getCortexUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!hasVaultAccess(user.email ?? "")) {
    return NextResponse.json({ error: "Vault access denied" }, { status: 403 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  let body: CaptureRequest;
  try {
    body = (await request.json()) as CaptureRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.content || !body.sourceType || !body.sourceMeta) {
    return NextResponse.json(
      { error: "Missing required fields: content, sourceType, sourceMeta" },
      { status: 400 }
    );
  }

  // Search vault for candidate pages using sender name + first 80 chars of content
  const searchTerms: string[] = [];
  if (body.sourceMeta.from) searchTerms.push(body.sourceMeta.from);
  if (body.sourceMeta.subject) searchTerms.push(body.sourceMeta.subject);
  const query = searchTerms.join(" ").trim() || body.content.slice(0, 80);

  const candidates = await searchVaultText(query, 10);

  const prompt = buildCapturePrompt(body, candidates);

  try {
    const result = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      system:
        "You are a knowledge graph router. Analyze content and decide where it belongs in a personal vault. Always return valid JSON matching the requested schema.",
      prompt,
      maxOutputTokens: 2000,
    });

    const text = result.text.trim();
    if (!text) {
      return NextResponse.json(
        { error: "Empty response from AI" },
        { status: 502 }
      );
    }

    let jsonStr = text;
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }

    let parsed: RoutingPlan;
    try {
      parsed = JSON.parse(jsonStr) as RoutingPlan;
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response as JSON", raw: text },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[vault-capture] AI routing failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
