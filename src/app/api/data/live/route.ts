import { NextResponse } from 'next/server';

const M365_CLIENT_ID = process.env.M365_CLIENT_ID!;
const M365_TENANT_ID = process.env.M365_TENANT_ID!;
const M365_REFRESH_TOKEN = process.env.M365_REFRESH_TOKEN!;
const ASANA_PAT = process.env.ASANA_PAT!;

// ── M365: get a fresh access token via refresh token ──────────────────────────
async function getM365Token(): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: M365_CLIENT_ID,
    refresh_token: M365_REFRESH_TOKEN,
    scope: 'https://graph.microsoft.com/.default offline_access',
  });
  const res = await fetch(
    `https://login.microsoftonline.com/${M365_TENANT_ID}/oauth2/v2.0/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }
  );
  const data = await res.json();
  if (!data.access_token) throw new Error(`M365 token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

// ── Fetch emails ───────────────────────────────────────────────────────────────
async function fetchEmails(token: string) {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?$top=25&$select=id,subject,from,receivedDateTime,isRead,hasAttachments,bodyPreview&$orderby=receivedDateTime desc&$filter=isDraft eq false`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  return (data.value ?? []).map((m: Record<string, unknown>) => {
    const from = m.from as { emailAddress: { name: string; address: string } };
    return {
      id: m.id,
      subject: m.subject || '(no subject)',
      from: from?.emailAddress?.name || from?.emailAddress?.address || '',
      fromAddress: from?.emailAddress?.address || '',
      preview: (m.bodyPreview as string)?.slice(0, 120) || '',
      receivedAt: m.receivedDateTime,
      isRead: m.isRead,
      hasAttachment: m.hasAttachments,
      outlook_url: `https://outlook.office.com/mail/inbox/id/${encodeURIComponent(m.id as string)}`,
      needs_reply: !(m.isRead as boolean),
      is_read: m.isRead,
      days_overdue: 0,
    };
  });
}

// ── Fetch calendar events ─────────────────────────────────────────────────────
async function fetchCalendar(token: string) {
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const startStr = now.toISOString();
  const endStr = end.toISOString();
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${startStr}&endDateTime=${endStr}&$select=id,subject,start,end,location,isOnlineMeeting,attendees,organizer&$orderby=start/dateTime&$top=20`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  return (data.value ?? []).map((e: Record<string, unknown>) => {
    const start = e.start as { dateTime: string; timeZone: string };
    const end = e.end as { dateTime: string; timeZone: string };
    const location = e.location as { displayName?: string };
    const attendees = e.attendees as unknown[];
    return {
      id: e.id,
      title: e.subject || '(no title)',
      start: start?.dateTime,
      end: end?.dateTime,
      location: location?.displayName || '',
      isOnline: e.isOnlineMeeting,
      attendeeCount: attendees?.length ?? 0,
      organizer: (e.organizer as { emailAddress?: { name?: string } })?.emailAddress?.name || '',
    };
  });
}

// ── Fetch Asana tasks ─────────────────────────────────────────────────────────
async function fetchAsanaTasks() {
  const res = await fetch(
    `https://app.asana.com/api/1.0/tasks?project=1211840949719691&assignee=me&completed_since=now&opt_fields=gid,name,due_on,priority,completed,permalink_url,custom_fields&limit=30`,
    { headers: { Authorization: `Bearer ${ASANA_PAT}` } }
  );
  const data = await res.json();
  const today = new Date();
  return (data.data ?? []).map((t: Record<string, unknown>) => {
    const dueOn = t.due_on as string | null;
    let daysOverdue = 0;
    if (dueOn) {
      const due = new Date(dueOn);
      daysOverdue = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    }
    return {
      id: t.gid,
      name: t.name,
      dueDate: dueOn,
      priority: t.priority || 'normal',
      completed: t.completed,
      permalink_url: t.permalink_url,
      days_overdue: daysOverdue,
    };
  });
}

// ── Fetch Salesforce pipeline ─────────────────────────────────────────────────
async function fetchSalesforcePipeline() {
  // Salesforce requires OAuth — skip for now, return empty
  // (SF credentials aren't available server-side without a separate OAuth flow)
  return [];
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const [tokenResult, asanaResult, sfResult] = await Promise.allSettled([
      getM365Token(),
      fetchAsanaTasks(),
      fetchSalesforcePipeline(),
    ]);

    const token = tokenResult.status === 'fulfilled' ? tokenResult.value : null;

    const [emailsResult, calendarResult] = await Promise.allSettled([
      token ? fetchEmails(token) : Promise.resolve([]),
      token ? fetchCalendar(token) : Promise.resolve([]),
    ]);

    return NextResponse.json({
      emails: emailsResult.status === 'fulfilled' ? emailsResult.value : [],
      calendar: calendarResult.status === 'fulfilled' ? calendarResult.value : [],
      tasks: asanaResult.status === 'fulfilled' ? asanaResult.value : [],
      pipeline: sfResult.status === 'fulfilled' ? sfResult.value : [],
      fetchedAt: new Date().toISOString(),
      source: 'live',
      errors: {
        m365: token ? null : (tokenResult.status === 'rejected' ? String(tokenResult.reason) : null),
        asana: asanaResult.status === 'rejected' ? String(asanaResult.reason) : null,
      }
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
