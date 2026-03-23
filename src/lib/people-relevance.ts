/**
 * Server-side people relevance scoring.
 * Persists daily interaction snapshots and computes composite relevance scores.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Email, CalendarEvent, Task, Chat, SlackFeedMessage } from "@/lib/types";
import {
  normalizeName,
  shouldExclude,
  isOwnName,
  personKey,
} from "@/lib/people-normalize";

// ── Snapshot types ─────────────────────────────────────────────────────────

interface PersonSnapshot {
  person_key: string;
  person_name: string;
  person_email: string | null;
  email_received: number;
  email_sent: number;
  teams_messages: number;
  meetings: number;
  slack_messages: number;
  asana_tasks: number;
  total_interactions: number;
  channel_count: number;
  last_interaction_at: string | null;
}

interface SnapshotRow {
  person_key: string;
  person_name: string;
  person_email: string | null;
  snapshot_date: string;
  email_received: number;
  email_sent: number;
  teams_messages: number;
  meetings: number;
  slack_messages: number;
  asana_tasks: number;
  total_interactions: number;
  channel_count: number;
  last_interaction_at: string | null;
}

// ── Score weights ──────────────────────────────────────────────────────────

const WEIGHTS = {
  recency: 0.30,
  frequency: 0.25,
  diversity: 0.20,
  bidirectionality: 0.15,
  trend: 0.10,
} as const;

const DIVERSITY_MAP: Record<number, number> = {
  0: 0, 1: 20, 2: 50, 3: 75, 4: 90, 5: 100,
};

const LAMBDA = 0.1; // exponential decay constant

// ── Server-side people aggregation ─────────────────────────────────────────

function aggregatePeopleFromLiveData(
  emails: Email[],
  sentEmails: Email[],
  calendar: CalendarEvent[],
  chats: Chat[],
  slack: SlackFeedMessage[],
  tasks: Task[],
  userName: string,
  userEmail: string
): PersonSnapshot[] {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const map = new Map<string, {
    name: string;
    email: string | null;
    emailReceived: number;
    emailSent: number;
    teamsMessages: number;
    meetings: number;
    slackMessages: number;
    asanaTasks: number;
    lastInteractionMs: number;
  }>();

  function upsert(name: string, email: string | null, channel: string, contactMs: number) {
    const key = personKey(name);
    if (!key) return;
    if (!map.has(key)) {
      map.set(key, {
        name,
        email,
        emailReceived: 0,
        emailSent: 0,
        teamsMessages: 0,
        meetings: 0,
        slackMessages: 0,
        asanaTasks: 0,
        lastInteractionMs: 0,
      });
    }
    const p = map.get(key)!;
    if (email && !p.email) p.email = email;
    if (contactMs > p.lastInteractionMs) p.lastInteractionMs = contactMs;

    switch (channel) {
      case "email_received": p.emailReceived++; break;
      case "email_sent": p.emailSent++; break;
      case "teams": p.teamsMessages++; break;
      case "meeting": p.meetings++; break;
      case "slack": p.slackMessages++; break;
      case "asana": p.asanaTasks++; break;
    }
  }

  function skip(name: string, email: string): boolean {
    if (!name) return true;
    if (shouldExclude(name, email || "")) return true;
    if (isOwnName(name, userName)) return true;
    if (userEmail && email && email.toLowerCase() === userEmail.toLowerCase()) return true;
    return false;
  }

  // Received emails
  for (const e of emails) {
    const name = normalizeName(e.from_name || e.from_email || "");
    const addr = e.from_email || "";
    if (skip(name, addr)) continue;
    upsert(name, addr, "email_received", new Date(e.received_at).getTime());
  }

  // Sent emails
  for (const e of sentEmails) {
    const name = normalizeName(e.to_name || e.to_email || "");
    const addr = e.to_email || "";
    if (skip(name, addr)) continue;
    const ms = new Date(e.received_at).getTime();
    if (ms < sevenDaysAgo) continue;
    upsert(name, addr, "email_sent", ms);
  }

  // Teams DMs
  for (const chat of chats) {
    const topic = chat.topic || "";
    if (/taskforce|committee|weekly|sync|standup|all-hands|project|team\b|general|a360/i.test(topic)) continue;
    for (const msg of (chat.messages || [])) {
      if (isOwnName(msg.from, userName)) continue;
      const msgMs = new Date(msg.timestamp).getTime();
      if (msgMs < sevenDaysAgo) continue;
      const pName = msg.from || topic;
      if (!pName || pName === "Teams Chat") continue;
      if (skip(pName, "")) continue;
      upsert(pName, null, "teams", msgMs);
    }
  }

  // Calendar
  const sevenDaysOut = now + 7 * 24 * 60 * 60 * 1000;
  for (const event of calendar) {
    const startMs = new Date(event.start_time).getTime();
    if (startMs > sevenDaysOut || startMs < sevenDaysAgo) continue;
    const organizer = normalizeName(event.organizer || "");
    if (skip(organizer, "")) continue;
    upsert(organizer, null, "meeting", startMs);
  }

  // Slack
  for (const msg of slack) {
    const name = msg.author_name || "";
    if (skip(name, "")) continue;
    const msgMs = new Date(msg.timestamp).getTime();
    if (msgMs < sevenDaysAgo) continue;
    upsert(name, null, "slack", msgMs);
  }

  // Asana tasks
  for (const task of tasks) {
    const people: { name: string; email: string }[] = [];
    if (task.assignee_name) people.push({ name: normalizeName(task.assignee_name), email: task.assignee_email || "" });
    if (task.created_by_name) people.push({ name: normalizeName(task.created_by_name), email: task.created_by_email || "" });
    for (let i = 0; i < (task.collaborator_names?.length || 0); i++) {
      people.push({ name: normalizeName(task.collaborator_names![i]), email: task.collaborator_emails?.[i] || "" });
    }
    const taskMs = task.modified_at ? new Date(task.modified_at).getTime()
      : task.due_on ? new Date(task.due_on).getTime() : 0;
    if (taskMs > 0 && taskMs < sevenDaysAgo) continue;

    for (const person of people) {
      if (skip(person.name, person.email)) continue;
      upsert(person.name, person.email || null, "asana", taskMs);
    }
  }

  // Build snapshots
  const snapshots: PersonSnapshot[] = [];
  for (const [, p] of map) {
    const total = p.emailReceived + p.emailSent + p.teamsMessages + p.meetings + p.slackMessages + p.asanaTasks;
    if (total === 0) continue;
    if (isOwnName(p.name, userName)) continue;

    let channels = 0;
    if (p.emailReceived > 0 || p.emailSent > 0) channels++;
    if (p.teamsMessages > 0) channels++;
    if (p.meetings > 0) channels++;
    if (p.slackMessages > 0) channels++;
    if (p.asanaTasks > 0) channels++;

    snapshots.push({
      person_key: personKey(p.name),
      person_name: p.name,
      person_email: p.email,
      email_received: p.emailReceived,
      email_sent: p.emailSent,
      teams_messages: p.teamsMessages,
      meetings: p.meetings,
      slack_messages: p.slackMessages,
      asana_tasks: p.asanaTasks,
      total_interactions: total,
      channel_count: channels,
      last_interaction_at: p.lastInteractionMs > 0 ? new Date(p.lastInteractionMs).toISOString() : null,
    });
  }

  return snapshots;
}

// ── Persist snapshots ──────────────────────────────────────────────────────

export async function persistPeopleSnapshots(
  cortexUserId: string,
  userName: string,
  userEmail: string,
  resolved: Record<string, unknown>,
  supabase: SupabaseClient
) {
  try {
    const emails = (resolved.emails ?? []) as Email[];
    const sentEmails = (resolved.sentEmails ?? []) as Email[];
    const calendar = (resolved.calendar ?? []) as CalendarEvent[];
    const chats = (resolved.chats ?? []) as Chat[];
    const slack = (resolved.slack ?? []) as SlackFeedMessage[];
    const tasks = (resolved.tasks ?? []) as Task[];

    const snapshots = aggregatePeopleFromLiveData(
      emails, sentEmails, calendar, chats, slack, tasks, userName, userEmail
    );

    if (snapshots.length === 0) return;

    const today = new Date().toISOString().split("T")[0];

    const rows = snapshots.map((s) => ({
      cortex_user_id: cortexUserId,
      person_key: s.person_key,
      person_name: s.person_name,
      person_email: s.person_email,
      snapshot_date: today,
      email_received: s.email_received,
      email_sent: s.email_sent,
      teams_messages: s.teams_messages,
      meetings: s.meetings,
      slack_messages: s.slack_messages,
      asana_tasks: s.asana_tasks,
      total_interactions: s.total_interactions,
      channel_count: s.channel_count,
      last_interaction_at: s.last_interaction_at,
    }));

    await supabase
      .from("people_interaction_snapshots")
      .upsert(rows, { onConflict: "cortex_user_id,person_key,snapshot_date" });

    // Recompute relevance scores after snapshot update
    await computeAndStoreRelevanceScores(cortexUserId, supabase);
  } catch (error) {
    console.error("[people-relevance] snapshot persistence failed:", error);
  }
}

// ── Relevance scoring ──────────────────────────────────────────────────────

export async function computeAndStoreRelevanceScores(
  cortexUserId: string,
  supabase: SupabaseClient
) {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // Fetch all snapshots for the last 90 days
  const { data: allSnapshots, error } = await supabase
    .from("people_interaction_snapshots")
    .select("*")
    .eq("cortex_user_id", cortexUserId)
    .gte("snapshot_date", ninetyDaysAgo)
    .order("snapshot_date", { ascending: false });

  if (error || !allSnapshots || allSnapshots.length === 0) return;

  // Group by person_key
  const byPerson = new Map<string, SnapshotRow[]>();
  for (const row of allSnapshots) {
    const key = row.person_key as string;
    if (!byPerson.has(key)) byPerson.set(key, []);
    byPerson.get(key)!.push(row as SnapshotRow);
  }

  // Find max total interactions in 30 days for frequency normalization
  let maxFreq30d = 0;
  for (const [, rows] of byPerson) {
    const sum30d = rows
      .filter((r) => r.snapshot_date >= thirtyDaysAgo)
      .reduce((acc, r) => acc + r.total_interactions, 0);
    if (sum30d > maxFreq30d) maxFreq30d = sum30d;
  }
  if (maxFreq30d === 0) maxFreq30d = 1;

  const scoreRows: Array<Record<string, unknown>> = [];

  for (const [key, rows] of byPerson) {
    const latestRow = rows[0]; // already sorted desc

    // --- Recency ---
    const lastInteraction = rows
      .map((r) => r.last_interaction_at)
      .filter(Boolean)
      .sort()
      .reverse()[0];
    const daysSinceLast = lastInteraction
      ? Math.max(0, (now.getTime() - new Date(lastInteraction).getTime()) / 86400000)
      : 90;
    const recencyScore = 100 * Math.exp(-LAMBDA * daysSinceLast);

    // --- Frequency (30d) ---
    const total30d = rows
      .filter((r) => r.snapshot_date >= thirtyDaysAgo)
      .reduce((acc, r) => acc + r.total_interactions, 0);
    const frequencyScore = Math.min(100, (total30d / maxFreq30d) * 100);

    // --- Channel Diversity (30d) ---
    const rows30d = rows.filter((r) => r.snapshot_date >= thirtyDaysAgo);
    const hasEmail = rows30d.some((r) => r.email_received > 0 || r.email_sent > 0);
    const hasTeams = rows30d.some((r) => r.teams_messages > 0);
    const hasMeetings = rows30d.some((r) => r.meetings > 0);
    const hasSlack = rows30d.some((r) => r.slack_messages > 0);
    const hasAsana = rows30d.some((r) => r.asana_tasks > 0);
    const channelCount = [hasEmail, hasTeams, hasMeetings, hasSlack, hasAsana].filter(Boolean).length;
    const diversityScore = DIVERSITY_MAP[channelCount] ?? 100;

    const activeChannels: string[] = [];
    if (hasEmail) activeChannels.push("email");
    if (hasTeams) activeChannels.push("teams");
    if (hasMeetings) activeChannels.push("meetings");
    if (hasSlack) activeChannels.push("slack");
    if (hasAsana) activeChannels.push("asana");

    // --- Bidirectionality (30d) ---
    const totalSent = rows30d.reduce((acc, r) => acc + r.email_sent, 0);
    const totalReceived = rows30d.reduce((acc, r) => acc + r.email_received, 0);
    const totalTeams = rows30d.reduce((acc, r) => acc + r.teams_messages, 0);
    const totalMeetings = rows30d.reduce((acc, r) => acc + r.meetings, 0);
    // Email bidirectionality
    const emailTotal = totalSent + totalReceived;
    const emailBidi = emailTotal > 0
      ? 1 - Math.abs(totalSent - totalReceived) / emailTotal
      : 0;
    // Teams and meetings are inherently bidirectional
    const bidiSignals = emailTotal + totalTeams + totalMeetings;
    const bidirectionalityScore = bidiSignals > 0
      ? Math.min(100, ((emailBidi * emailTotal + totalTeams + totalMeetings) / bidiSignals) * 100)
      : 0;

    // --- Trend (7d vs 7-14d) ---
    const recent7d = rows
      .filter((r) => r.snapshot_date >= sevenDaysAgo)
      .reduce((acc, r) => acc + r.total_interactions, 0);
    const prev7d = rows
      .filter((r) => r.snapshot_date >= fourteenDaysAgo && r.snapshot_date < sevenDaysAgo)
      .reduce((acc, r) => acc + r.total_interactions, 0);
    let trendScore: number;
    if (prev7d === 0 && recent7d === 0) {
      trendScore = 50; // stable — no data
    } else if (prev7d === 0) {
      trendScore = 85; // new contact, trending up
    } else {
      const ratio = (recent7d - prev7d) / prev7d;
      // Map ratio to 0-100: -1 or worse → 0, 0 → 50, +1 or more → 100
      trendScore = Math.max(0, Math.min(100, 50 + ratio * 50));
    }

    // --- Composite ---
    const relevanceScore = Math.min(100, Math.max(0,
      recencyScore * WEIGHTS.recency +
      frequencyScore * WEIGHTS.frequency +
      diversityScore * WEIGHTS.diversity +
      bidirectionalityScore * WEIGHTS.bidirectionality +
      trendScore * WEIGHTS.trend
    ));

    scoreRows.push({
      cortex_user_id: cortexUserId,
      person_key: key,
      person_name: latestRow.person_name,
      person_email: latestRow.person_email,
      recency_score: Math.round(recencyScore * 100) / 100,
      frequency_score: Math.round(frequencyScore * 100) / 100,
      diversity_score: diversityScore,
      bidirectionality_score: Math.round(bidirectionalityScore * 100) / 100,
      trend_score: Math.round(trendScore * 100) / 100,
      relevance_score: Math.round(relevanceScore * 100) / 100,
      total_interactions_30d: total30d,
      active_channels: activeChannels,
      last_interaction_at: lastInteraction || null,
      computed_at: now.toISOString(),
    });
  }

  if (scoreRows.length === 0) return;

  await supabase
    .from("people_relevance_scores")
    .upsert(scoreRows, { onConflict: "cortex_user_id,person_key" });
}
