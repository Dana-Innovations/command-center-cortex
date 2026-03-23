/**
 * Relationship Dossier Builder
 *
 * Assembles cross-service context about a person from:
 * 1. people_relevance_scores (Supabase) — relevance tier, trend, active channels
 * 2. user_priority_biases (Supabase) — learned user preference for this person
 * 3. Live data arrays (emails, tasks, calendar) — recent interactions, delegation status
 *
 * Used by Morning Brief, Meeting Prep, and Draft Reply to enrich AI prompts.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Email,
  CalendarEvent,
  Task,
  SalesforceOpportunity,
} from "@/lib/types";
import { personKey, normalizeName, shouldExclude } from "@/lib/people-normalize";

// ── Types ──────────────────────────────────────────────────────────────────

export interface RelationshipDossier {
  personName: string;
  personEmail: string | null;
  relevanceScore: number | null;
  relevanceTier: "vip" | "active" | "occasional" | "new" | "unknown";
  trendDirection: "rising" | "stable" | "declining";
  activeChannels: string[];
  totalInteractions30d: number;
  lastInteractionAt: string | null;
  recentEmailSubjects: string[];
  recentEmailSnippet: string | null;
  emailDirection: "mostly_received" | "mostly_sent" | "balanced" | "none";
  openTasksDelegatedTo: DossierTask[];
  openTasksDelegatedBy: DossierTask[];
  relatedOpportunities: DossierOpp[];
  nextMeeting: { subject: string; startTime: string } | null;
  pastMeetingCount: number;
  lastMeetingDate: string | null;
  learnedBias: number;
  isMarkedImportant: boolean;
}

interface DossierTask {
  name: string;
  dueOn: string | null;
  daysOverdue: number;
  projectName: string;
}

interface DossierOpp {
  name: string;
  accountName: string;
  amount: number;
  stage: string;
  daysToClose: number;
}

// ── Relevance tier classification ──────────────────────────────────────────

function classifyRelevanceTier(
  score: number | null
): RelationshipDossier["relevanceTier"] {
  if (score === null) return "unknown";
  if (score >= 75) return "vip";
  if (score >= 50) return "active";
  if (score >= 25) return "occasional";
  return "new";
}

function classifyTrend(
  trendScore: number | null
): RelationshipDossier["trendDirection"] {
  if (trendScore === null) return "stable";
  if (trendScore > 10) return "rising";
  if (trendScore < -10) return "declining";
  return "stable";
}

// ── Person matching ────────────────────────────────────────────────────────

function nameMatchesLoose(a: string, b: string): boolean {
  if (!a || !b) return false;
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (la === lb) return true;
  const firstA = la.split(" ")[0];
  const firstB = lb.split(" ")[0];
  if (firstA.length > 2 && lb.includes(firstA) && la.includes(firstB))
    return true;
  return false;
}

function emailMatchesPerson(email: string, name: string): boolean {
  if (!email || !name) return false;
  const prefix = email.split("@")[0].toLowerCase().replace(/[._]/g, " ");
  const parts = name.toLowerCase().split(" ");
  return (
    parts.length >= 2 && parts.every((p) => p.length > 1 && prefix.includes(p))
  );
}

function personMatches(
  targetName: string,
  targetEmail: string | null,
  candidateName: string,
  candidateEmail: string
): boolean {
  if (targetEmail && candidateEmail) {
    if (targetEmail.toLowerCase() === candidateEmail.toLowerCase()) return true;
  }
  if (nameMatchesLoose(targetName, candidateName)) return true;
  if (targetEmail && emailMatchesPerson(targetEmail, candidateName))
    return true;
  if (candidateEmail && emailMatchesPerson(candidateEmail, targetName))
    return true;
  return false;
}

// ── Supabase queries ──────────────────────────────────────────────────────

interface RelevanceRow {
  person_name: string;
  person_email: string | null;
  relevance_score: number;
  trend_score: number;
  active_channels: string[];
  total_interactions_30d: number;
  last_interaction_at: string | null;
}

interface BiasRow {
  bias_score: number;
}

async function fetchRelevanceScores(
  supabase: SupabaseClient,
  cortexUserId: string,
  personKeys: string[]
): Promise<Map<string, RelevanceRow>> {
  if (personKeys.length === 0) return new Map();

  const { data } = await supabase
    .from("people_relevance_scores")
    .select(
      "person_key, person_name, person_email, relevance_score, trend_score, active_channels, total_interactions_30d, last_interaction_at"
    )
    .eq("cortex_user_id", cortexUserId)
    .in("person_key", personKeys);

  const map = new Map<string, RelevanceRow>();
  for (const row of data ?? []) {
    map.set(row.person_key, row);
  }
  return map;
}

async function fetchActorBiases(
  supabase: SupabaseClient,
  cortexUserId: string,
  dimensionKeys: string[]
): Promise<Map<string, number>> {
  if (dimensionKeys.length === 0) return new Map();

  const { data } = await supabase
    .from("user_priority_biases")
    .select("dimension_key, bias_score")
    .eq("cortex_user_id", cortexUserId)
    .eq("dimension_type", "actor")
    .in("dimension_key", dimensionKeys);

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    map.set(row.dimension_key, (row as BiasRow).bias_score);
  }
  return map;
}

// ── Live data enrichment ──────────────────────────────────────────────────

interface LiveDataContext {
  emails?: Email[];
  sentEmails?: Email[];
  tasks?: Task[];
  calendar?: CalendarEvent[];
  opportunities?: SalesforceOpportunity[];
}

function enrichFromLiveData(
  name: string,
  email: string | null,
  liveData: LiveDataContext
): Pick<
  RelationshipDossier,
  | "recentEmailSubjects"
  | "recentEmailSnippet"
  | "emailDirection"
  | "openTasksDelegatedTo"
  | "openTasksDelegatedBy"
  | "relatedOpportunities"
  | "nextMeeting"
  | "pastMeetingCount"
  | "lastMeetingDate"
> {
  const result: ReturnType<typeof enrichFromLiveData> = {
    recentEmailSubjects: [],
    recentEmailSnippet: null,
    emailDirection: "none",
    openTasksDelegatedTo: [],
    openTasksDelegatedBy: [],
    relatedOpportunities: [],
    nextMeeting: null,
    pastMeetingCount: 0,
    lastMeetingDate: null,
  };

  // Emails — recent subjects + direction
  const allEmails = [
    ...(liveData.emails ?? []),
    ...(liveData.sentEmails ?? []),
  ];
  const matchingEmails = allEmails
    .filter((e) =>
      personMatches(
        name,
        email,
        normalizeName(e.from_name || e.from_email || ""),
        e.from_email || ""
      ) ||
      personMatches(
        name,
        email,
        normalizeName(e.to_name || e.to_email || ""),
        e.to_email || ""
      )
    )
    .sort(
      (a, b) =>
        new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    );

  result.recentEmailSubjects = [
    ...new Set(matchingEmails.slice(0, 5).map((e) => e.subject)),
  ];
  if (matchingEmails.length > 0) {
    result.recentEmailSnippet =
      matchingEmails[0].preview?.slice(0, 120) ?? null;
  }

  const received = matchingEmails.filter(
    (e) => e.direction !== "sent"
  ).length;
  const sent = matchingEmails.filter((e) => e.direction === "sent").length;
  if (received + sent === 0) {
    result.emailDirection = "none";
  } else if (received > sent * 2) {
    result.emailDirection = "mostly_received";
  } else if (sent > received * 2) {
    result.emailDirection = "mostly_sent";
  } else {
    result.emailDirection = "balanced";
  }

  // Tasks — delegation context
  const now = new Date();
  for (const task of liveData.tasks ?? []) {
    if (task.completed) continue;

    const assigneeMatches = personMatches(
      name,
      email,
      task.assignee_name ?? task.assignee ?? "",
      task.assignee_email ?? ""
    );
    const creatorMatches = personMatches(
      name,
      email,
      task.created_by_name ?? "",
      task.created_by_email ?? ""
    );

    const dossierTask: DossierTask = {
      name: task.name,
      dueOn: task.due_on,
      daysOverdue: task.days_overdue,
      projectName: task.project_name,
    };

    // Delegated TO this person (user created, person is assignee)
    if (assigneeMatches && !creatorMatches) {
      result.openTasksDelegatedTo.push(dossierTask);
    }
    // Delegated BY this person (person created, user is assignee)
    if (creatorMatches && !assigneeMatches) {
      result.openTasksDelegatedBy.push(dossierTask);
    }
  }

  // Sort by overdue first
  result.openTasksDelegatedTo.sort(
    (a, b) => b.daysOverdue - a.daysOverdue
  );
  result.openTasksDelegatedBy.sort(
    (a, b) => b.daysOverdue - a.daysOverdue
  );

  // Salesforce opportunities
  for (const opp of liveData.opportunities ?? []) {
    if (opp.is_closed) continue;
    if (
      nameMatchesLoose(name, opp.owner_name) ||
      nameMatchesLoose(name, opp.account_name)
    ) {
      result.relatedOpportunities.push({
        name: opp.name,
        accountName: opp.account_name,
        amount: opp.amount,
        stage: opp.stage,
        daysToClose: opp.days_to_close,
      });
    }
  }

  // Calendar — next meeting + past meeting count
  const calendarEvents = liveData.calendar ?? [];
  for (const event of calendarEvents) {
    const eventStart = new Date(event.start_time);
    const attendeeMatch =
      (event.attendees ?? []).some((a) =>
        nameMatchesLoose(name, a)
      ) || nameMatchesLoose(name, event.organizer);

    if (!attendeeMatch) continue;

    if (eventStart > now) {
      if (
        !result.nextMeeting ||
        eventStart < new Date(result.nextMeeting.startTime)
      ) {
        result.nextMeeting = {
          subject: event.subject,
          startTime: event.start_time,
        };
      }
    } else {
      result.pastMeetingCount++;
      if (
        !result.lastMeetingDate ||
        eventStart > new Date(result.lastMeetingDate)
      ) {
        result.lastMeetingDate = event.start_time;
      }
    }
  }

  return result;
}

// ── Main builder ──────────────────────────────────────────────────────────

export interface BuildDossierOptions {
  supabase: SupabaseClient;
  cortexUserId: string;
  personName: string;
  personEmail?: string | null;
  liveData?: LiveDataContext;
}

export async function buildRelationshipDossier(
  options: BuildDossierOptions
): Promise<RelationshipDossier> {
  const {
    supabase,
    cortexUserId,
    personName,
    personEmail = null,
    liveData = {},
  } = options;

  const key = personKey(normalizeName(personName));

  // Parallel Supabase queries
  const [relevanceMap, biasMap] = await Promise.all([
    fetchRelevanceScores(supabase, cortexUserId, [key]),
    fetchActorBiases(supabase, cortexUserId, [key]),
  ]);

  const relevance = relevanceMap.get(key);
  const bias = biasMap.get(key) ?? 0;

  // Build base dossier from Supabase data
  const dossier: RelationshipDossier = {
    personName: normalizeName(personName),
    personEmail: personEmail ?? relevance?.person_email ?? null,
    relevanceScore: relevance ? Number(relevance.relevance_score) : null,
    relevanceTier: classifyRelevanceTier(
      relevance ? Number(relevance.relevance_score) : null
    ),
    trendDirection: classifyTrend(
      relevance ? Number(relevance.trend_score) : null
    ),
    activeChannels: relevance?.active_channels ?? [],
    totalInteractions30d: relevance?.total_interactions_30d ?? 0,
    lastInteractionAt: relevance?.last_interaction_at ?? null,
    recentEmailSubjects: [],
    recentEmailSnippet: null,
    emailDirection: "none",
    openTasksDelegatedTo: [],
    openTasksDelegatedBy: [],
    relatedOpportunities: [],
    nextMeeting: null,
    pastMeetingCount: 0,
    lastMeetingDate: null,
    learnedBias: bias,
    isMarkedImportant: bias > 0.3,
  };

  // Enrich from live data if provided
  if (
    liveData.emails ||
    liveData.sentEmails ||
    liveData.tasks ||
    liveData.calendar ||
    liveData.opportunities
  ) {
    const enriched = enrichFromLiveData(
      personName,
      dossier.personEmail,
      liveData
    );
    Object.assign(dossier, enriched);
  }

  return dossier;
}

// ── Batch builder (for Morning Brief) ─────────────────────────────────────

export async function buildBatchDossiers(
  supabase: SupabaseClient,
  cortexUserId: string,
  personNames: string[],
  liveData: LiveDataContext = {}
): Promise<RelationshipDossier[]> {
  // Dedupe and normalize
  const uniqueNames = [
    ...new Map(
      personNames
        .map((n) => normalizeName(n))
        .filter((n) => n.length > 0 && !shouldExclude(n, ""))
        .map((n) => [personKey(n), n])
    ).values(),
  ];

  const keys = uniqueNames.map(personKey);

  // Batch Supabase queries
  const [relevanceMap, biasMap] = await Promise.all([
    fetchRelevanceScores(supabase, cortexUserId, keys),
    fetchActorBiases(supabase, cortexUserId, keys),
  ]);

  // Build dossiers, enriching from live data
  const dossiers: RelationshipDossier[] = [];

  for (const name of uniqueNames) {
    const key = personKey(name);
    const relevance = relevanceMap.get(key);
    const bias = biasMap.get(key) ?? 0;

    const dossier: RelationshipDossier = {
      personName: name,
      personEmail: relevance?.person_email ?? null,
      relevanceScore: relevance ? Number(relevance.relevance_score) : null,
      relevanceTier: classifyRelevanceTier(
        relevance ? Number(relevance.relevance_score) : null
      ),
      trendDirection: classifyTrend(
        relevance ? Number(relevance.trend_score) : null
      ),
      activeChannels: relevance?.active_channels ?? [],
      totalInteractions30d: relevance?.total_interactions_30d ?? 0,
      lastInteractionAt: relevance?.last_interaction_at ?? null,
      recentEmailSubjects: [],
      recentEmailSnippet: null,
      emailDirection: "none",
      openTasksDelegatedTo: [],
      openTasksDelegatedBy: [],
      relatedOpportunities: [],
      nextMeeting: null,
      pastMeetingCount: 0,
      lastMeetingDate: null,
      learnedBias: bias,
      isMarkedImportant: bias > 0.3,
    };

    if (
      liveData.emails ||
      liveData.sentEmails ||
      liveData.tasks ||
      liveData.calendar ||
      liveData.opportunities
    ) {
      const enriched = enrichFromLiveData(
        name,
        dossier.personEmail,
        liveData
      );
      Object.assign(dossier, enriched);
    }

    dossiers.push(dossier);
  }

  // Sort by relevance score descending, limit to top 10
  return dossiers
    .sort(
      (a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0)
    )
    .slice(0, 10);
}

// ── Serializer for AI prompts ─────────────────────────────────────────────

export function serializeDossierForPrompt(d: RelationshipDossier): string {
  const parts: string[] = [];

  // Name + tier
  const tierLabel =
    d.relevanceTier === "vip"
      ? "VIP"
      : d.relevanceTier === "active"
        ? "Active"
        : d.relevanceTier === "occasional"
          ? "Occasional"
          : d.relevanceTier === "new"
            ? "New"
            : "";
  const scoreStr =
    d.relevanceScore !== null ? `, relevance ${Math.round(d.relevanceScore)}/100` : "";
  const trendStr =
    d.trendDirection !== "stable" ? `, ${d.trendDirection}` : "";
  parts.push(
    `${d.personName}${tierLabel ? ` (${tierLabel}${scoreStr}${trendStr})` : ""}`
  );

  // Interaction summary
  if (d.totalInteractions30d > 0) {
    const channels = d.activeChannels.join(", ");
    parts.push(
      `  ${d.totalInteractions30d} interactions in 30d via ${channels}`
    );
  }

  // Recent emails
  if (d.recentEmailSubjects.length > 0) {
    parts.push(
      `  Recent emails: ${d.recentEmailSubjects.slice(0, 3).join("; ")}`
    );
  }

  // Delegation
  const overdueToCount = d.openTasksDelegatedTo.filter(
    (t) => t.daysOverdue > 0
  ).length;
  if (d.openTasksDelegatedTo.length > 0) {
    parts.push(
      `  You delegated ${d.openTasksDelegatedTo.length} tasks${overdueToCount > 0 ? ` (${overdueToCount} overdue)` : ""}`
    );
    for (const t of d.openTasksDelegatedTo.slice(0, 2)) {
      const overdue = t.daysOverdue > 0 ? ` [${t.daysOverdue}d overdue]` : "";
      parts.push(`    - ${t.name}${overdue}`);
    }
  }
  if (d.openTasksDelegatedBy.length > 0) {
    parts.push(
      `  ${d.personName} assigned you ${d.openTasksDelegatedBy.length} tasks`
    );
  }

  // Deals
  for (const opp of d.relatedOpportunities.slice(0, 2)) {
    parts.push(
      `  Deal: ${opp.name} ($${(opp.amount / 1000).toFixed(0)}K, ${opp.stage}, ${opp.daysToClose}d to close)`
    );
  }

  // Next meeting
  if (d.nextMeeting) {
    const when = new Date(d.nextMeeting.startTime);
    const now = new Date();
    const diffHours = Math.round(
      (when.getTime() - now.getTime()) / 3600000
    );
    const whenStr =
      diffHours < 24
        ? `in ${diffHours}h`
        : `in ${Math.round(diffHours / 24)}d`;
    parts.push(`  Next meeting: "${d.nextMeeting.subject}" ${whenStr}`);
  }

  return parts.join("\n");
}

// ── Delegation summary builder ────────────────────────────────────────────

export interface DelegationSummary {
  totalDelegated: number;
  overdueCount: number;
  staleCount: number;
  topBlockedItems: string[];
}

export function buildDelegationSummary(
  tasks: Task[],
  ownName: string,
  ownEmail: string
): DelegationSummary {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const delegated = tasks.filter((t) => {
    if (t.completed) return false;
    const isCreator =
      (t.created_by_email &&
        t.created_by_email.toLowerCase() === ownEmail.toLowerCase()) ||
      nameMatchesLoose(t.created_by_name ?? "", ownName);
    const isAssignee =
      (t.assignee_email &&
        t.assignee_email.toLowerCase() === ownEmail.toLowerCase()) ||
      nameMatchesLoose(t.assignee_name ?? t.assignee ?? "", ownName);
    return isCreator && !isAssignee;
  });

  const overdue = delegated.filter((t) => t.days_overdue > 0);
  const stale = delegated.filter((t) => {
    const modified = t.modified_at ? new Date(t.modified_at) : null;
    return !modified || modified < sevenDaysAgo;
  });

  const topBlocked = overdue
    .sort((a, b) => b.days_overdue - a.days_overdue)
    .slice(0, 3)
    .map(
      (t) =>
        `"${t.name}" assigned to ${t.assignee_name ?? t.assignee ?? "unknown"} (${t.days_overdue}d overdue)`
    );

  return {
    totalDelegated: delegated.length,
    overdueCount: overdue.length,
    staleCount: stale.length,
    topBlockedItems: topBlocked,
  };
}
