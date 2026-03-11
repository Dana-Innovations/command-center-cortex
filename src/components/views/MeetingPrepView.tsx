"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useCalendar } from "@/hooks/useCalendar";
import { useEmails } from "@/hooks/useEmails";
import { useTasks } from "@/hooks/useTasks";
import { useSalesforce } from "@/hooks/useSalesforce";
import { useAuth } from "@/hooks/useAuth";
import { toPacificDate, parseCalendarDate } from "@/lib/calendar";
import type { CalendarEvent, Email, Task, SalesforceOpportunity } from "@/lib/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nowPST(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
}

function formatTime12(d: Date | null): string {
  if (!d) return "TBD";
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatTimeRange(ev: CalendarEvent): string {
  return `${formatTime12(toPacificDate(ev.start_time))} – ${formatTime12(toPacificDate(ev.end_time))}`;
}

function formatRelativeDate(iso: string): string {
  const now = nowPST();
  const d = toPacificDate(iso);
  if (!d) return "";
  const diff = Math.floor((d.getTime() - now.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function normalizeName(name: string): string {
  return name.replace(/<.*>/, "").replace(/\(.*\)/, "").trim();
}

function nameMatchesLoose(a: string, b: string): boolean {
  if (!a || !b) return false;
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (la === lb) return true;
  const firstA = la.split(" ")[0];
  const firstB = lb.split(" ")[0];
  if (firstA.length > 2 && firstB.length > 2 && la.includes(firstB)) return true;
  if (firstA.length > 2 && firstB.length > 2 && lb.includes(firstA)) return true;
  return false;
}

function emailMatchesPerson(emailAddr: string, personName: string): boolean {
  if (!emailAddr || !personName) return false;
  const prefix = emailAddr.split("@")[0].toLowerCase().replace(/[._]/g, " ");
  const nameParts = personName.toLowerCase().split(" ");
  return nameParts.length >= 2 && nameParts.every((p) => p.length > 1 && prefix.includes(p));
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return "just now";
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Attendee {
  name: string;
  email?: string;
  title?: string;
  company?: string;
}

interface EmailThread {
  subject: string;
  lastSender: string;
  date: string;
  snippet: string;
  emails: Email[];
}

interface PrepBullet {
  text: string;
  type: "context" | "risk";
}

interface MeetingContext {
  attendees: Attendee[];
  emailThreads: EmailThread[];
  relatedTasks: Task[];
  relatedOpps: SalesforceOpportunity[];
  prepBullets: PrepBullet[];
}

interface AIMeetingPrep {
  summary: string;
  attendeeInsights: Array<{
    name: string;
    role?: string;
    company?: string;
    insight: string;
  }>;
  companyInsights: Array<{
    company: string;
    insight: string;
  }>;
  talkingPoints: string[];
  risks: string[];
}

// ─── Data Builder ────────────────────────────────────────────────────────────

function buildMeetingContext(
  event: CalendarEvent,
  allEmails: Email[],
  sentEmails: Email[],
  tasks: Task[],
  opportunities: SalesforceOpportunity[],
  ownName: string
): MeetingContext {
  // Build attendee list from organizer
  const attendees: Attendee[] = [];
  const organizerName = normalizeName(event.organizer || "");
  if (organizerName && !nameMatchesLoose(organizerName, ownName)) {
    attendees.push({ name: organizerName });
  }

  const attendeeNames = attendees.map((a) => a.name);

  // Find related emails — group by subject as conversations
  const combinedEmails = [...allEmails, ...sentEmails];
  const threadMap = new Map<string, Email[]>();
  for (const email of combinedEmails) {
    const sender = normalizeName(email.from_name || email.from_email || "");
    const recipient = normalizeName(email.to_name || email.to_email || "");
    const senderEmail = email.from_email || "";
    const recipientEmail = email.to_email || "";

    const matchesAttendee = attendeeNames.some(
      (name) =>
        nameMatchesLoose(sender, name) ||
        nameMatchesLoose(recipient, name) ||
        emailMatchesPerson(senderEmail, name) ||
        emailMatchesPerson(recipientEmail, name)
    );

    // Also match by meeting subject keywords
    const subjectWords = event.subject
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);
    const emailSubjectLower = email.subject.toLowerCase();
    const matchesSubject =
      subjectWords.length > 0 &&
      subjectWords.some((w) => emailSubjectLower.includes(w));

    if (matchesAttendee || matchesSubject) {
      const key = email.subject
        .replace(/^(re:|fw:|fwd:)\s*/gi, "")
        .trim()
        .toLowerCase();
      if (!threadMap.has(key)) threadMap.set(key, []);
      threadMap.get(key)!.push(email);
    }
  }

  const emailThreads: EmailThread[] = [];
  for (const [, emails] of threadMap) {
    const sorted = [...emails].sort(
      (a, b) =>
        new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    );
    const latest = sorted[0];
    emailThreads.push({
      subject: latest.subject,
      lastSender: normalizeName(latest.from_name || latest.from_email || ""),
      date: latest.received_at,
      snippet: latest.preview?.slice(0, 120) || "",
      emails: sorted,
    });
  }
  emailThreads.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Find related tasks
  const relatedTasks = tasks.filter((task) => {
    if (task.completed) return false;
    const taskPeople = [
      task.assignee_name,
      task.created_by_name,
      ...(task.collaborator_names || []),
    ]
      .filter(Boolean)
      .map((n) => normalizeName(n!));

    const matchesPerson = attendeeNames.some((name) =>
      taskPeople.some((tp) => nameMatchesLoose(tp, name))
    );

    const subjectWords = event.subject
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);
    const matchesSubject =
      subjectWords.length > 0 &&
      subjectWords.some(
        (w) =>
          task.name.toLowerCase().includes(w) ||
          task.project_name?.toLowerCase().includes(w)
      );

    return matchesPerson || matchesSubject;
  });

  // Find related Salesforce opportunities
  const relatedOpps = opportunities.filter((opp) => {
    if (opp.is_closed) return false;
    const matchesPerson = attendeeNames.some(
      (name) =>
        nameMatchesLoose(opp.owner_name, name) ||
        nameMatchesLoose(opp.account_name, name) ||
        opp.name.toLowerCase().includes(name.toLowerCase())
    );
    const subjectWords = event.subject
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);
    const matchesSubject =
      subjectWords.length > 0 &&
      subjectWords.some(
        (w) =>
          opp.name.toLowerCase().includes(w) ||
          opp.account_name.toLowerCase().includes(w)
      );
    return matchesPerson || matchesSubject;
  });

  // Generate prep bullets
  const prepBullets: PrepBullet[] = [];

  if (relatedOpps.length > 0) {
    const totalPipeline = relatedOpps.reduce((s, o) => s + (o.amount || 0), 0);
    prepBullets.push({
      text: `$${totalPipeline.toLocaleString()} in active pipeline across ${relatedOpps.length} deal${relatedOpps.length > 1 ? "s" : ""}`,
      type: "context",
    });
  }

  if (relatedTasks.length > 0) {
    const overdue = relatedTasks.filter((t) => t.days_overdue > 0);
    prepBullets.push({
      text: `${relatedTasks.length} open task${relatedTasks.length > 1 ? "s" : ""} involving attendees${overdue.length > 0 ? ` (${overdue.length} overdue)` : ""}`,
      type: overdue.length > 0 ? "risk" : "context",
    });
  }

  if (emailThreads.length > 0) {
    const recentCount = emailThreads.filter(
      (t) => Date.now() - new Date(t.date).getTime() < 48 * 3600000
    ).length;
    if (recentCount > 0) {
      prepBullets.push({
        text: `${recentCount} active email thread${recentCount > 1 ? "s" : ""} in the last 48 hours`,
        type: "context",
      });
    }
  }

  // Topic-based bullets from meeting subject
  const subjectLower = event.subject.toLowerCase();
  if (
    subjectLower.includes("review") ||
    subjectLower.includes("update") ||
    subjectLower.includes("status")
  ) {
    prepBullets.push({
      text: "Likely a status/progress review — prepare key metrics and blockers",
      type: "context",
    });
  }
  if (
    subjectLower.includes("kickoff") ||
    subjectLower.includes("launch") ||
    subjectLower.includes("intro")
  ) {
    prepBullets.push({
      text: "Kickoff/intro meeting — prepare objectives, roles, and timeline",
      type: "context",
    });
  }
  if (subjectLower.includes("1:1") || subjectLower.includes("one on one")) {
    prepBullets.push({
      text: "1:1 — consider feedback, career development, and priority alignment",
      type: "context",
    });
  }

  // Risk bullets
  const overdueTasks = relatedTasks.filter((t) => t.days_overdue > 0);
  for (const task of overdueTasks.slice(0, 2)) {
    prepBullets.push({
      text: `Overdue: "${task.name}" — ${task.days_overdue}d past due${task.assignee_name ? ` (${task.assignee_name})` : ""}`,
      type: "risk",
    });
  }

  for (const opp of relatedOpps.filter((o) => o.days_to_close <= 14).slice(0, 2)) {
    prepBullets.push({
      text: `Deal closing soon: ${opp.name} — $${opp.amount?.toLocaleString()} in ${opp.days_to_close}d`,
      type: "risk",
    });
  }

  return {
    attendees,
    emailThreads: emailThreads.slice(0, 5),
    relatedTasks: relatedTasks.slice(0, 8),
    relatedOpps: relatedOpps.slice(0, 5),
    prepBullets: prepBullets.slice(0, 8),
  };
}

// ─── Collapsible Section ─────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  icon,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[var(--bg-card-border)] last:border-b-0">
      <button
        className="w-full flex items-center gap-2 py-3 px-1 text-left group cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <svg
          className={cn(
            "w-3.5 h-3.5 text-text-muted transition-transform duration-200",
            open && "rotate-90"
          )}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polyline points="9 6 15 12 9 18" />
        </svg>
        <span className="inline-flex items-center justify-center w-4 h-4 text-text-muted">
          {icon}
        </span>
        <span className="text-xs font-semibold text-text-heading uppercase tracking-wider">
          {title}
        </span>
        {count != null && count > 0 && (
          <span className="text-[10px] font-medium text-text-muted bg-[var(--bg-card-border)] rounded-full px-1.5 py-0.5">
            {count}
          </span>
        )}
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          open ? "max-h-[2000px] opacity-100 pb-4" : "max-h-0 opacity-0"
        )}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function PrepSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-32 bg-[var(--bg-card-border)] rounded" />
          <div className="h-10 w-full bg-[var(--bg-card-border)] rounded-lg" />
          <div className="h-10 w-3/4 bg-[var(--bg-card-border)] rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// ─── Left Rail Item ──────────────────────────────────────────────────────────

function MeetingListItem({
  event,
  isSelected,
  onSelect,
}: {
  event: CalendarEvent;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const start = toPacificDate(event.start_time);
  const dayLabel = formatRelativeDate(event.start_time);

  return (
    <button
      className={cn(
        "w-full text-left p-3 rounded-lg transition-all duration-150 cursor-pointer",
        isSelected
          ? "bg-accent-amber/10 border border-accent-amber/30 shadow-[0_0_12px_rgba(212,164,76,0.08)]"
          : "hover:bg-[var(--bg-card-border)] border border-transparent"
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-wider",
            isSelected ? "text-accent-amber" : "text-text-muted"
          )}
        >
          {dayLabel}
        </span>
        <span className="text-[10px] text-text-muted">
          {event.is_all_day ? "All day" : formatTime12(start)}
        </span>
      </div>
      <div
        className={cn(
          "text-sm font-medium truncate",
          isSelected ? "text-text-heading" : "text-text-body"
        )}
      >
        {event.subject}
      </div>
      <div className="flex items-center gap-3 mt-1">
        {event.organizer && (
          <span className="text-[10px] text-text-muted truncate">
            {normalizeName(event.organizer)}
          </span>
        )}
        {event.location && (
          <span className="text-[10px] text-text-muted truncate">
            {event.location}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function PrepEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-[var(--bg-card-border)] flex items-center justify-center mb-4">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-text-muted"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
        </svg>
      </div>
      <p className="text-sm font-medium text-text-heading mb-1">
        Select a meeting to prep
      </p>
      <p className="text-xs text-text-muted max-w-[240px]">
        Choose an upcoming meeting from the left to see your contextual briefing
        packet
      </p>
    </div>
  );
}

// ─── Right Panel ─────────────────────────────────────────────────────────────

function AIResearchSection({ aiPrep }: { aiPrep: AIMeetingPrep }) {
  return (
    <div className="border-l-2 border-accent-amber/40 pl-4 space-y-4 my-4">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-amber bg-accent-amber/10 px-2 py-0.5 rounded">
          AI Research
        </span>
      </div>

      {/* Summary */}
      {aiPrep.summary && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
            Summary
          </div>
          <p className="text-xs text-text-body leading-relaxed">
            {aiPrep.summary}
          </p>
        </div>
      )}

      {/* Attendee Insights */}
      {aiPrep.attendeeInsights?.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
            Attendee Insights
          </div>
          <div className="space-y-2">
            {aiPrep.attendeeInsights.map((a, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg bg-[var(--bg-card-border)]/50"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-text-heading">
                    {a.name}
                  </span>
                  {a.role && (
                    <span className="text-[10px] text-text-muted">
                      {a.role}
                      {a.company ? ` at ${a.company}` : ""}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-text-body leading-relaxed">
                  {a.insight}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Company Insights */}
      {aiPrep.companyInsights?.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
            Company Intel
          </div>
          <div className="space-y-2">
            {aiPrep.companyInsights.map((c, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg bg-[var(--bg-card-border)]/50"
              >
                <div className="text-xs font-medium text-text-heading mb-1">
                  {c.company}
                </div>
                <p className="text-[11px] text-text-body leading-relaxed">
                  {c.insight}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Talking Points */}
      {aiPrep.talkingPoints?.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
            Suggested Talking Points
          </div>
          <div className="space-y-1.5">
            {aiPrep.talkingPoints.map((tp, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-accent-amber mt-0.5 shrink-0 text-xs">
                  {i + 1}.
                </span>
                <span className="text-xs text-text-body">{tp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risks */}
      {aiPrep.risks?.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
            Watch Out For
          </div>
          <div className="space-y-1.5">
            {aiPrep.risks.map((r, i) => (
              <div
                key={i}
                className="flex gap-2 items-start p-2 rounded-md bg-accent-red/5 border border-accent-red/15"
              >
                <span className="text-accent-red mt-0.5 shrink-0 text-xs">
                  ⚠
                </span>
                <span className="text-xs text-text-body">{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PrepPanel({
  event,
  context,
  aiPrep,
  aiLoading,
  aiError,
  onResearch,
}: {
  event: CalendarEvent;
  context: MeetingContext;
  aiPrep?: AIMeetingPrep | null;
  aiLoading: boolean;
  aiError?: string | null;
  onResearch: () => void;
}) {
  const { attendees, emailThreads, relatedTasks, relatedOpps, prepBullets } =
    context;

  const risks = prepBullets.filter((b) => b.type === "risk");
  const contextBullets = prepBullets.filter((b) => b.type === "context");

  return (
    <div className="space-y-0">
      {/* Meeting header */}
      <div className="pb-4 mb-1 border-b border-[var(--bg-card-border)]">
        <h2 className="text-lg font-semibold text-text-heading mb-1">
          {event.subject}
        </h2>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>{formatRelativeDate(event.start_time)}</span>
          <span>·</span>
          <span>{event.is_all_day ? "All day" : formatTimeRange(event)}</span>
          {event.location && (
            <>
              <span>·</span>
              <span className="truncate">{event.location}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          {event.join_url && event.is_online && (
            <a
              href={event.join_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md bg-accent-teal/15 text-accent-teal hover:bg-accent-teal/25 transition-colors"
            >
              Join Meeting
            </a>
          )}
          {event.outlook_url && (
            <a
              href={event.outlook_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[var(--bg-card-border)] text-text-muted hover:text-text-body transition-colors"
            >
              Open in Calendar
            </a>
          )}
        </div>
      </div>

      {/* Research This Meeting button */}
      <div className="py-3 border-b border-[var(--bg-card-border)]">
        <button
          onClick={onResearch}
          disabled={aiLoading}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg",
            "text-sm font-semibold transition-colors cursor-pointer",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            aiPrep
              ? "bg-[var(--bg-card-border)] text-text-muted hover:text-text-body"
              : "bg-accent-amber/15 text-accent-amber hover:bg-accent-amber/25"
          )}
        >
          {aiLoading ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="32"
                  strokeLinecap="round"
                />
              </svg>
              Researching...
            </>
          ) : (
            <>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              {aiPrep ? "Re-Research" : "Research This Meeting"}
            </>
          )}
        </button>
        {aiError && (
          <p className="text-xs text-accent-red mt-2 text-center">{aiError}</p>
        )}
      </div>

      {/* AI Research Results */}
      {aiPrep && <AIResearchSection aiPrep={aiPrep} />}

      {/* Prep Bullets */}
      {contextBullets.length > 0 && (
        <CollapsibleSection
          title="Prep Bullets"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          }
          count={contextBullets.length}
        >
          <div className="space-y-2 px-1">
            {contextBullets.map((b, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-accent-teal mt-0.5 shrink-0">›</span>
                <span className="text-xs text-text-body">{b.text}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Risks / Blockers */}
      {risks.length > 0 && (
        <CollapsibleSection
          title="Risks & Blockers"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
          count={risks.length}
        >
          <div className="space-y-2 px-1">
            {risks.map((b, i) => (
              <div
                key={i}
                className="flex gap-2 items-start p-2 rounded-md bg-accent-red/5 border border-accent-red/15"
              >
                <span className="text-accent-red mt-0.5 shrink-0 text-xs">⚠</span>
                <span className="text-xs text-text-body">{b.text}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Attendees */}
      <CollapsibleSection
        title="Attendees"
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="4" />
            <path d="M20 21a8 8 0 1 0-16 0" />
          </svg>
        }
        count={attendees.length}
        defaultOpen={attendees.length > 0}
      >
        {attendees.length === 0 ? (
          <p className="text-xs text-text-muted px-1">
            Only organizer data available — attendee details not synced
          </p>
        ) : (
          <div className="space-y-2 px-1">
            {attendees.map((a, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-card-border)]/50"
              >
                <div className="w-8 h-8 rounded-full bg-accent-amber/15 text-accent-amber flex items-center justify-center text-xs font-semibold shrink-0">
                  {initials(a.name)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text-heading truncate">
                    {a.name}
                  </div>
                  {a.email && (
                    <div className="text-[10px] text-text-muted truncate">
                      {a.email}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Email Threads */}
      <CollapsibleSection
        title="Recent Emails"
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M22 7l-10 7L2 7" />
          </svg>
        }
        count={emailThreads.length}
        defaultOpen={emailThreads.length > 0}
      >
        {emailThreads.length === 0 ? (
          <p className="text-xs text-text-muted px-1">
            No recent email threads with attendees
          </p>
        ) : (
          <div className="space-y-2 px-1">
            {emailThreads.map((thread, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg bg-[var(--bg-card-border)]/50"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-text-heading truncate flex-1">
                    {thread.subject}
                  </span>
                  {thread.emails.length > 1 && (
                    <span className="text-[10px] text-text-muted shrink-0">
                      {thread.emails.length} msgs
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-text-muted">
                  <span>{thread.lastSender}</span>
                  <span>·</span>
                  <span>{timeAgo(thread.date)}</span>
                </div>
                {thread.snippet && (
                  <p className="text-[11px] text-text-muted mt-1 line-clamp-2 opacity-70">
                    {thread.snippet}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Open Tasks */}
      <CollapsibleSection
        title="Open Tasks"
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        }
        count={relatedTasks.length}
        defaultOpen={relatedTasks.length > 0}
      >
        {relatedTasks.length === 0 ? (
          <p className="text-xs text-text-muted px-1">
            No open tasks involving attendees
          </p>
        ) : (
          <div className="space-y-1.5 px-1">
            {relatedTasks.map((task) => (
              <a
                key={task.id}
                href={task.permalink_url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-card-border)]/50 hover:bg-[var(--bg-card-border)] transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-text-heading truncate group-hover:text-accent-amber transition-colors">
                    {task.name}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-text-muted mt-0.5">
                    {task.assignee_name && <span>{task.assignee_name}</span>}
                    {task.project_name && (
                      <>
                        <span>·</span>
                        <span>{task.project_name}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {task.due_on && (
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        task.days_overdue > 0
                          ? "text-accent-red"
                          : "text-text-muted"
                      )}
                    >
                      {task.days_overdue > 0
                        ? `${task.days_overdue}d overdue`
                        : new Date(task.due_on).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Salesforce Opportunities */}
      <CollapsibleSection
        title="Salesforce Opportunities"
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 6l-9.5 9.5-5-5L1 18" />
            <path d="M17 6h6v6" />
          </svg>
        }
        count={relatedOpps.length}
        defaultOpen={relatedOpps.length > 0}
      >
        {relatedOpps.length === 0 ? (
          <p className="text-xs text-text-muted px-1">
            No matching opportunities
          </p>
        ) : (
          <div className="space-y-1.5 px-1">
            {relatedOpps.map((opp) => (
              <a
                key={opp.id}
                href={opp.sf_url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--bg-card-border)]/50 hover:bg-[var(--bg-card-border)] transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-text-heading truncate group-hover:text-accent-amber transition-colors">
                    {opp.name}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-text-muted mt-0.5">
                    <span>{opp.account_name}</span>
                    <span>·</span>
                    <span>{opp.stage}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs font-semibold text-accent-teal">
                    ${opp.amount?.toLocaleString() || "—"}
                  </div>
                  {opp.close_date && (
                    <div className="text-[10px] text-text-muted">
                      Close{" "}
                      {new Date(opp.close_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}

// ─── Main View ───────────────────────────────────────────────────────────────

export function MeetingPrepView({ initialEventId }: { initialEventId?: string }) {
  const { events, loading: calLoading } = useCalendar();
  const { emails, sentEmails, loading: emailsLoading } = useEmails();
  const { tasks, loading: tasksLoading } = useTasks();
  const { opportunities, loading: sfLoading } = useSalesforce();
  const { user } = useAuth();
  const fullName = user?.user_metadata?.full_name ?? "";

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aiPreps, setAiPreps] = useState<Record<string, AIMeetingPrep>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const loading = calLoading || emailsLoading || tasksLoading || sfLoading;

  // Auto-select meeting from initialEventId prop
  useEffect(() => {
    if (initialEventId) {
      setSelectedId(initialEventId);
    }
  }, [initialEventId]);

  // Get upcoming meetings (today + future), sorted by start time
  const upcomingMeetings = useMemo(() => {
    const now = new Date();
    return [...events]
      .filter((ev) => {
        const end = parseCalendarDate(ev.end_time);
        return end && end >= now;
      })
      .sort(
        (a, b) =>
          (parseCalendarDate(a.start_time)?.getTime() ?? 0) -
          (parseCalendarDate(b.start_time)?.getTime() ?? 0)
      );
  }, [events]);

  const selectedEvent = useMemo(
    () => upcomingMeetings.find((ev) => ev.id === selectedId) ?? null,
    [upcomingMeetings, selectedId]
  );

  const context = useMemo(() => {
    if (!selectedEvent) return null;
    return buildMeetingContext(
      selectedEvent,
      emails,
      sentEmails,
      tasks,
      opportunities,
      fullName
    );
  }, [selectedEvent, emails, sentEmails, tasks, opportunities, fullName]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setAiError(null);
  }, []);

  const handleResearch = useCallback(async () => {
    if (!selectedEvent || !context) return;
    setAiLoading(true);
    setAiError(null);

    try {
      const res = await fetch("/api/ai/meeting-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: selectedEvent.subject,
          organizer: selectedEvent.organizer,
          location: selectedEvent.location,
          startTime: selectedEvent.start_time,
          endTime: selectedEvent.end_time,
          existingContext: {
            attendeeNames: context.attendees.map((a) => a.name),
            emailSubjects: context.emailThreads.map((t) => t.subject),
            relatedOpps: context.relatedOpps.map((o) => ({
              name: o.name,
              account: o.account_name,
              amount: o.amount,
              stage: o.stage,
            })),
            relatedTaskNames: context.relatedTasks.map((t) => t.name),
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data: AIMeetingPrep = await res.json();
      setAiPreps((prev) => ({ ...prev, [selectedEvent.id]: data }));
    } catch (err) {
      console.error("AI prep failed:", err);
      setAiError(err instanceof Error ? err.message : "Research failed. Try again.");
    } finally {
      setAiLoading(false);
    }
  }, [selectedEvent, context]);

  const currentAiPrep = selectedEvent ? aiPreps[selectedEvent.id] ?? null : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 min-h-[600px]">
      {/* Left Rail */}
      <div className="glass-card anim-card p-4 overflow-hidden flex flex-col" style={{ animationDelay: "80ms" }}>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text-heading mb-3 shrink-0">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Upcoming Meetings
          {upcomingMeetings.length > 0 && (
            <span className="text-[10px] font-medium text-text-muted bg-[var(--bg-card-border)] rounded-full px-1.5 py-0.5">
              {upcomingMeetings.length}
            </span>
          )}
        </h2>
        <div className="flex-1 overflow-y-auto space-y-1.5 -mx-1 px-1 scrollbar-thin">
          {loading && upcomingMeetings.length === 0 ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg bg-[var(--bg-card-border)]"
                />
              ))}
            </div>
          ) : upcomingMeetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-text-muted">No upcoming meetings</p>
              <p className="text-xs text-text-muted mt-1 opacity-60">
                Your calendar is clear
              </p>
            </div>
          ) : (
            upcomingMeetings.map((ev) => (
              <MeetingListItem
                key={ev.id}
                event={ev}
                isSelected={ev.id === selectedId}
                onSelect={() => handleSelect(ev.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="glass-card anim-card p-5 overflow-y-auto" style={{ animationDelay: "160ms" }}>
        {!selectedEvent ? (
          <PrepEmptyState />
        ) : !context ? (
          <PrepSkeleton />
        ) : (
          <PrepPanel
            event={selectedEvent}
            context={context}
            aiPrep={currentAiPrep}
            aiLoading={aiLoading}
            aiError={aiError}
            onResearch={handleResearch}
          />
        )}
      </div>
    </div>
  );
}
