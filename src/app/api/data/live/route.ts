import { NextResponse } from "next/server";

const CORTEX_URL = "https://cortex-bice.vercel.app/mcp";

interface CortexCall {
  tool: string;
  args: Record<string, unknown>;
}

async function callCortex({ tool, args }: CortexCall): Promise<unknown> {
  const apiKey = process.env.CORTEX_API_KEY ?? "";
  const res = await fetch(CORTEX_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: tool, arguments: args },
    }),
  });

  if (!res.ok) {
    throw new Error(`Cortex HTTP ${res.status}`);
  }

  const rpc = await res.json();
  if (rpc.error) {
    throw new Error(rpc.error.message ?? JSON.stringify(rpc.error));
  }

  const content = rpc.result?.content;
  if (!Array.isArray(content) || content.length === 0) return null;

  const text = content.find((c: { type: string }) => c.type === "text")?.text;
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/* ── Parsers ─────────────────────────────────────────── */

function parseEmails(raw: unknown) {
  if (!raw || typeof raw !== "object") return [];
  const arr = Array.isArray(raw) ? raw : (raw as Record<string, unknown>).value;
  if (!Array.isArray(arr)) return [];

  const now = new Date().toISOString();
  return arr.map((e: Record<string, unknown>, i: number) => {
    const from = e.from as Record<string, unknown> | undefined;
    const addr = from?.emailAddress as Record<string, string> | undefined;
    const receivedAt = (e.receivedDateTime as string) ?? now;
    const daysOld = Math.max(
      0,
      Math.floor((Date.now() - new Date(receivedAt).getTime()) / 86_400_000)
    );

    return {
      id: (e.id as string) ?? `email-${i}`,
      message_id: (e.id as string) ?? `email-${i}`,
      from_name: addr?.name ?? "",
      from_email: addr?.address ?? "",
      subject: (e.subject as string) ?? "(no subject)",
      preview: (e.bodyPreview as string) ?? "",
      body_html: "",
      received_at: receivedAt,
      is_read: (e.isRead as boolean) ?? false,
      folder: "inbox",
      has_attachments: (e.hasAttachments as boolean) ?? false,
      outlook_url: (e.webLink as string) ?? "",
      needs_reply: !(e.isRead as boolean),
      days_overdue: daysOld > 1 ? daysOld : 0,
      synced_at: now,
    };
  });
}

function parseCalendar(raw: unknown) {
  if (!raw || typeof raw !== "object") return [];
  const arr = Array.isArray(raw) ? raw : (raw as Record<string, unknown>).value;
  if (!Array.isArray(arr)) return [];

  const now = new Date().toISOString();
  return arr.map((e: Record<string, unknown>, i: number) => {
    const start = e.start as Record<string, string> | undefined;
    const end = e.end as Record<string, string> | undefined;
    const loc = e.location as Record<string, string> | undefined;
    const org = e.organizer as Record<string, Record<string, string>> | undefined;
    const meeting = e.onlineMeeting as Record<string, string> | undefined;
    const attendees = e.attendees as unknown[] | undefined;

    return {
      id: (e.id as string) ?? `cal-${i}`,
      event_id: (e.id as string) ?? `cal-${i}`,
      subject: (e.subject as string) ?? "(no subject)",
      location: loc?.displayName ?? "",
      start_time: start?.dateTime ?? now,
      end_time: end?.dateTime ?? now,
      is_all_day: (e.isAllDay as boolean) ?? false,
      organizer: org?.emailAddress?.name ?? "",
      is_online: (e.isOnlineMeeting as boolean) ?? false,
      join_url: meeting?.joinUrl ?? (e.onlineMeetingUrl as string) ?? "",
      outlook_url: (e.webLink as string) ?? "",
      attendee_count: attendees?.length ?? 0,
      synced_at: now,
    };
  });
}

function parseTasks(raw: unknown) {
  if (!raw || typeof raw !== "object") return [];
  const arr = Array.isArray(raw) ? raw : (raw as Record<string, unknown>).data;
  if (!Array.isArray(arr)) return [];

  const now = new Date().toISOString();
  return arr.map((t: Record<string, unknown>, i: number) => {
    const dueOn = (t.due_on as string) ?? null;
    let daysOverdue = 0;
    if (dueOn) {
      daysOverdue = Math.max(
        0,
        Math.floor((Date.now() - new Date(dueOn).getTime()) / 86_400_000)
      );
    }

    const assignee = t.assignee as Record<string, string> | undefined;
    const memberships = t.memberships as Array<{
      project?: { name?: string };
    }> | undefined;

    return {
      id: (t.gid as string) ?? `task-${i}`,
      task_gid: (t.gid as string) ?? `task-${i}`,
      name: (t.name as string) ?? "",
      notes: (t.notes as string) ?? "",
      due_on: dueOn,
      completed: (t.completed as boolean) ?? false,
      assignee: assignee?.name ?? "me",
      project_name: memberships?.[0]?.project?.name ?? "My Tasks",
      permalink_url: (t.permalink_url as string) ?? "",
      priority: "medium",
      days_overdue: daysOverdue,
      synced_at: now,
    };
  });
}

function parsePipeline(raw: unknown) {
  if (!raw || typeof raw !== "object") return [];
  const arr = Array.isArray(raw) ? raw : (raw as Record<string, unknown>).records;
  if (!Array.isArray(arr)) return [];

  const now = new Date().toISOString();
  return arr.map((r: Record<string, unknown>, i: number) => {
    const closeDate = (r.CloseDate as string) ?? "";
    const daysToClose = closeDate
      ? Math.max(
          0,
          Math.floor((new Date(closeDate).getTime() - Date.now()) / 86_400_000)
        )
      : 999;

    const sfId = (r.Id as string) ?? `opp-${i}`;
    const account = r.Account as Record<string, string> | undefined;
    const accountName = account?.Name ?? (r.AccountId as string) ?? "";

    return {
      id: sfId,
      sf_opportunity_id: sfId,
      name: (r.Name as string) ?? "",
      account_name: accountName,
      owner_name: "",
      stage: (r.StageName as string) ?? "",
      amount: Number(r.Amount) || 0,
      probability: 0,
      close_date: closeDate,
      days_to_close: daysToClose,
      is_closed: false,
      is_won: false,
      last_activity_date: null,
      next_step: null,
      sf_url: `https://sonance.lightning.force.com/lightning/r/Opportunity/${sfId}/view`,
      synced_at: now,
    };
  });
}

/* ── Route handler ───────────────────────────────────── */

export async function GET() {
  const [emailsRes, calendarRes, tasksRes, pipelineRes] =
    await Promise.allSettled([
      callCortex({
        tool: "m365_list_emails",
        args: { folder: "inbox", top: 20 },
      }),
      callCortex({
        tool: "m365_list_events",
        args: { days: 7 },
      }),
      callCortex({
        tool: "asana_get_tasks",
        args: { project_id: "1211840949719691", assignee: "me" },
      }),
      callCortex({
        tool: "salesforce_query",
        args: {
          soql: "SELECT Id,Name,Amount,StageName,CloseDate,AccountId FROM Opportunity WHERE StageName NOT IN ('Closed Won','Closed Lost') ORDER BY Amount DESC LIMIT 20",
        },
      }),
    ]);

  const emails =
    emailsRes.status === "fulfilled" ? parseEmails(emailsRes.value) : [];
  const calendar =
    calendarRes.status === "fulfilled"
      ? parseCalendar(calendarRes.value)
      : [];
  const tasks =
    tasksRes.status === "fulfilled" ? parseTasks(tasksRes.value) : [];
  const pipeline =
    pipelineRes.status === "fulfilled"
      ? parsePipeline(pipelineRes.value)
      : [];

  return NextResponse.json({
    emails,
    calendar,
    tasks,
    pipeline,
    fetchedAt: new Date().toISOString(),
    source: "cortex-live",
  });
}
