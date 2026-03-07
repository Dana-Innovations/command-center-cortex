import { NextRequest, NextResponse } from "next/server";
import { getCortexToken, cortexInit, cortexCall } from "@/lib/cortex/client";

function asArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object"
  );
}

function stripHtml(value: string | null | undefined): string {
  return (value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function nameMatches(candidate: string, target: string): boolean {
  if (!candidate || !target) return false;
  const a = candidate.toLowerCase().trim();
  const b = target.toLowerCase().trim();
  if (a === b) return true;
  // Check if first+last name match
  const partsA = a.split(/\s+/);
  const partsB = b.split(/\s+/);
  if (partsA.length >= 2 && partsB.length >= 2) {
    return partsA[0] === partsB[0] && partsA[partsA.length - 1] === partsB[partsB.length - 1];
  }
  // Substring match for single names
  return a.includes(b) || b.includes(a);
}

export async function GET(request: NextRequest) {
  const token = getCortexToken(request);
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const personName = searchParams.get("name");
  const personEmail = searchParams.get("email") || "";
  const chatId = searchParams.get("chatId") || "";

  if (!personName) {
    return NextResponse.json({ error: "name parameter required" }, { status: 400 });
  }

  try {
    const sessionId = await cortexInit(token);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysOut = new Date();
    ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 30);

    // Build parallel Cortex calls
    const calls = [
      // 0: Search for person identity in M365
      cortexCall(token, sessionId, "people", "m365__search_people", {
        query: personEmail || personName,
        limit: 5,
      }).catch(() => ({})),

      // 1: Inbox emails (wider window)
      cortexCall(token, sessionId, "inbox", "m365__list_emails", {
        limit: 50,
        folder: "inbox",
        search: personEmail || personName,
      }).catch(() => ({})),

      // 2: Sent emails
      cortexCall(token, sessionId, "sent", "m365__list_emails", {
        limit: 50,
        folder: "sentitems",
        search: personEmail || personName,
      }).catch(() => ({})),

      // 3: Calendar events (wider window)
      cortexCall(token, sessionId, "cal", "m365__list_events", {
        start_date: ninetyDaysAgo.toISOString(),
        end_date: ninetyDaysOut.toISOString(),
        limit: 100,
      }).catch(() => ({})),

      // 4: Slack search
      cortexCall(token, sessionId, "slack", "slack__search_messages", {
        query: personName,
        limit: 30,
      }).catch(() => ({})),

      // 5: Asana task search
      cortexCall(token, sessionId, "asana", "asana__search_tasks", {
        query: personName,
        limit: 20,
      }).catch(() => ({})),
    ];

    // 6: Chat messages if chatId provided
    if (chatId) {
      calls.push(
        cortexCall(token, sessionId, "chat", "m365__list_chat_messages", {
          chat_id: chatId,
          limit: 50,
        }).catch(() => ({}))
      );
    }

    const results = await Promise.allSettled(calls);
    const getResult = (i: number) =>
      results[i]?.status === "fulfilled" ? results[i].value : {};

    // Parse identity
    const peopleResult = getResult(0);
    const peopleList = asArray(peopleResult.people ?? peopleResult.value ?? []);
    const matchedPerson = peopleList.find(
      (p) =>
        nameMatches(String(p.displayName ?? p.name ?? ""), personName) ||
        (personEmail && String(p.mail ?? p.email ?? "").toLowerCase() === personEmail.toLowerCase())
    );

    const identity = {
      name: personName,
      email: personEmail || String(matchedPerson?.mail ?? matchedPerson?.email ?? ""),
      title: String(matchedPerson?.jobTitle ?? matchedPerson?.title ?? ""),
      department: String(matchedPerson?.department ?? ""),
    };

    // Parse emails
    const inboxRaw = asArray(getResult(1).emails ?? getResult(1).value ?? []);
    const sentRaw = asArray(getResult(2).emails ?? getResult(2).value ?? []);

    const emails = [
      ...inboxRaw
        .filter((m) => {
          const sender = m.sender as Record<string, unknown> | undefined;
          const senderAddr = sender?.emailAddress as Record<string, unknown> | undefined;
          const from = String(m.from_name ?? m.from ?? senderAddr?.name ?? "");
          const fromEmail = String(m.from_email ?? senderAddr?.address ?? "");
          return nameMatches(from, personName) ||
            (personEmail && fromEmail.toLowerCase() === personEmail.toLowerCase());
        })
        .map((m) => {
          const sender = m.sender as Record<string, unknown> | undefined;
          const senderAddr = sender?.emailAddress as Record<string, unknown> | undefined;
          return {
            subject: String(m.subject ?? ""),
            preview: stripHtml(String(m.bodyPreview ?? m.preview ?? m.body_preview ?? "")).slice(0, 200),
            date: String(m.receivedDateTime ?? m.received_at ?? ""),
            direction: "received" as const,
            isRead: m.isRead === true || m.is_read === true,
            from: String(m.from_name ?? m.from ?? senderAddr?.name ?? ""),
            url: String(m.webLink ?? m.outlook_url ?? "#"),
          };
        }),
      ...sentRaw
        .filter((m) => {
          const to = String(m.to_name ?? "");
          const toEmail = String(m.to_email ?? "");
          if (nameMatches(to, personName)) return true;
          if (personEmail && toEmail.toLowerCase() === personEmail.toLowerCase()) return true;
          const recipients = asArray(m.toRecipients);
          return recipients.some(
            (r) => {
              const addr = r.emailAddress as Record<string, unknown> | undefined;
              return addr && (
                nameMatches(String(addr.name ?? ""), personName) ||
                (personEmail && String(addr.address ?? "").toLowerCase() === personEmail.toLowerCase())
              );
            }
          );
        })
        .map((m) => ({
          subject: String(m.subject ?? ""),
          preview: stripHtml(String(m.bodyPreview ?? m.preview ?? m.body_preview ?? "")).slice(0, 200),
          date: String(m.sentDateTime ?? m.received_at ?? ""),
          direction: "sent" as const,
          isRead: true,
          from: "",
          url: String(m.webLink ?? m.outlook_url ?? "#"),
        })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Parse calendar events — filter for ones involving this person
    const eventsRaw = asArray(getResult(3).events ?? getResult(3).value ?? []);
    const meetings = eventsRaw
      .filter((e) => {
        const organizer = String(e.organizer ?? "");
        const subject = String(e.subject ?? "");
        if (nameMatches(organizer, personName)) return true;
        if (subject.toLowerCase().includes(personName.toLowerCase())) return true;
        // Check attendees
        const attendees = asArray(e.attendees);
        return attendees.some((a) => {
          const addr = a.emailAddress as Record<string, unknown> | undefined;
          return addr && (
            nameMatches(String(addr.name ?? ""), personName) ||
            (personEmail && String(addr.address ?? "").toLowerCase() === personEmail.toLowerCase())
          );
        });
      })
      .map((e) => {
        const attendees = asArray(e.attendees);
        const attendeeNames = attendees
          .map((a) => {
            const addr = a.emailAddress as Record<string, unknown> | undefined;
            return String(addr?.name ?? "");
          })
          .filter(Boolean)
          .slice(0, 5);
        const loc = e.location as Record<string, unknown> | undefined;
        return {
          subject: String(e.subject ?? ""),
          date: String(e.start_time ?? (e.start as Record<string, unknown> | undefined)?.dateTime ?? ""),
          endTime: String(e.end_time ?? (e.end as Record<string, unknown> | undefined)?.dateTime ?? ""),
          location: String(loc?.displayName ?? e.location_name ?? ""),
          isOnline: Boolean(e.isOnlineMeeting ?? e.is_online ?? false),
          attendeeCount: attendees.length,
          attendees: attendeeNames,
          url: String(e.join_url ?? e.joinUrl ?? e.outlook_url ?? e.webLink ?? "#"),
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Parse Slack messages
    const slackResult = getResult(4);
    const slackRaw = asArray(slackResult.messages ?? slackResult.matches ?? slackResult.value ?? []);
    const slackMessages = slackRaw
      .map((m) => ({
        text: stripHtml(String(m.text ?? "")).slice(0, 200),
        channel: String(m.channel_name ?? (m.channel as Record<string, unknown> | undefined)?.name ?? ""),
        date: String(m.timestamp ?? m.ts ?? ""),
        url: String(m.permalink ?? "#"),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Parse Asana tasks
    const asanaResult = getResult(5);
    const tasksRaw = asArray(asanaResult.tasks ?? asanaResult.data ?? asanaResult.value ?? []);
    const tasks = tasksRaw
      .map((t) => ({
        name: String(t.name ?? ""),
        project: String(t.project_name ?? asArray(t.projects)[0]?.name ?? ""),
        status: t.completed ? "completed" : "open",
        due: String(t.due_on ?? ""),
        url: String(t.permalink_url ?? "#"),
      }));

    // Parse chat messages
    const chats: { text: string; from: string; date: string; url: string }[] = [];
    if (chatId && results.length > 6) {
      const chatResult = getResult(6);
      const messagesRaw = asArray(chatResult.messages ?? chatResult.value ?? []);
      for (const m of messagesRaw) {
        chats.push({
          text: stripHtml(String(m.text ?? (m.body as Record<string, unknown> | undefined)?.content ?? "")).slice(0, 200),
          from: String(m.from ?? ""),
          date: String(m.timestamp ?? m.createdDateTime ?? ""),
          url: "",
        });
      }
      chats.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    // Compute stats
    const allDates = [
      ...emails.map((e) => e.date),
      ...meetings.map((m) => m.date),
      ...chats.map((c) => c.date),
      ...slackMessages.map((s) => s.date),
    ]
      .map((d) => new Date(d).getTime())
      .filter((t) => !isNaN(t) && t > 0)
      .sort((a, b) => a - b);

    const stats = {
      totalEmails: emails.length,
      totalMeetings: meetings.length,
      firstContact: allDates.length > 0 ? new Date(allDates[0]).toISOString() : "",
      lastContact: allDates.length > 0 ? new Date(allDates[allDates.length - 1]).toISOString() : "",
    };

    return NextResponse.json({
      identity,
      emails,
      meetings,
      chats,
      slackMessages,
      tasks,
      stats,
    });
  } catch (err) {
    console.error("Person detail error:", err);
    return NextResponse.json(
      { error: "Failed to fetch person details" },
      { status: 500 }
    );
  }
}
