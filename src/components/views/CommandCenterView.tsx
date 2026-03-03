"use client";
import { WeatherCard } from "@/components/command-center/WeatherCard";
import { SlackCard } from "@/components/command-center/SlackCard";
import { AIFeedCard } from "@/components/command-center/AIFeedCard";
import { PriorityEngine } from "@/components/command-center/PriorityEngine";
import { CalendarTimeline } from "@/components/command-center/CalendarTimeline";
import { ReplyCenter } from "@/components/command-center/ReplyCenter";
import { JeanaSection } from "@/components/command-center/JeanaSection";
import { BookingsDashboard } from "@/components/command-center/BookingsDashboard";
import { SalesforcePipeline } from "@/components/command-center/SalesforcePipeline";
import { SalesforceReports } from "@/components/command-center/SalesforceReports";
import { PowerBIKPIs } from "@/components/command-center/PowerBIKPIs";
import { PowerBIReports } from "@/components/command-center/PowerBIReports";
import { MeetingPrep } from "@/components/command-center/MeetingPrep";
import { MeetingDebrief } from "@/components/command-center/MeetingDebrief";
import { OverdueTasks } from "@/components/command-center/OverdueTasks";
import { EmailHygiene } from "@/components/command-center/EmailHygiene";
import { useCalendar } from "@/hooks/useCalendar";
import { useTasks } from "@/hooks/useTasks";
import { useEmails } from "@/hooks/useEmails";
import { useSlackFeed } from "@/hooks/useSlackFeed";
import { usePriorityScore } from "@/hooks/usePriorityScore";
import {
  transformCalendarEvents,
  transformDebriefMeetings,
  transformMeetingPrep,
  transformOverdueTasks,
  transformJeanaItems,
  transformEmailSenders,
  transformSlackItems,
} from "@/lib/transformers";

export function CommandCenterView() {
  const { events: calEvents } = useCalendar();
  const { tasks } = useTasks();
  const { emails } = useEmails();
  const { items: priorityItems } = usePriorityScore();

  const calTimeline = transformCalendarEvents(calEvents);
  const debriefMeetings = transformDebriefMeetings(calEvents);
  const meetingPrep = transformMeetingPrep(calEvents);
  const { overdue, stale } = transformOverdueTasks(tasks);
  const jeanaItems = transformJeanaItems(tasks);
  const emailSenders = transformEmailSenders(emails);

  return (
    <div className="space-y-5">
      {/* Row 1: 2-col grid - Left: Weather+Slack stacked, Right: PriorityEngine */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-5">
        <div className="space-y-5">
          <WeatherCard />
          <SlackCard />
        </div>
        <PriorityEngine items={priorityItems} />
      </div>

      {/* AI Feed — #topic--ai monitor */}
      <AIFeedCard />

      {/* Calendar Timeline */}
      <CalendarTimeline events={calTimeline} />

      {/* Reply Center */}
      <ReplyCenter />

      {/* Jeana Section */}
      <JeanaSection items={jeanaItems} />

      {/* Bookings Dashboard */}
      <BookingsDashboard />

      {/* Salesforce Pipeline */}
      <SalesforcePipeline />

      {/* Salesforce Reports */}
      <SalesforceReports />

      {/* Power BI KPIs */}
      <PowerBIKPIs />

      {/* Power BI Reports */}
      <PowerBIReports />

      {/* 2-col grid: Meeting Prep + Litigation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <MeetingPrep meetings={meetingPrep} />
        {/* Litigation Docket */}
        <section className="glass-card anim-card" style={{ animationDelay: "480ms" }}>
          <h2 className="text-sm font-semibold text-text-heading mb-4">Litigation Docket</h2>
          <div className="space-y-3">
            <div>
              <a
                className="hot-link text-sm font-medium"
                href="https://www.pacermonitor.com/public/case/CXOWKGY/National_Products_Inc_v_Dana_Innovations_Inc"
                target="_blank"
                rel="noopener noreferrer"
              >
                NPI v. Dana Innovations
              </a>
              <div className="text-xs text-text-muted mt-0.5">
                <a
                  className="hot-link"
                  href="https://ecf.cacd.uscourts.gov/cgi-bin/DktRpt.pl?367416"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Case 8:24-cv-02499
                </a>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex gap-3 text-xs">
                <span className="text-text-muted w-12 shrink-0">Status</span>
                <span className="text-text-body">Claim Construction Ruling Issued — Jan 20, 2026</span>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="text-text-muted w-12 shrink-0">Judge</span>
                <span className="text-text-body">Hon. Mark C. Scarsi — C.D. California</span>
              </div>
            </div>
            <div className="text-xs text-text-muted pt-2 border-t border-[var(--bg-card-border)]">
              Daily docket monitoring active
            </div>
          </div>
        </section>
      </div>

      {/* Meeting Debrief */}
      <MeetingDebrief meetings={debriefMeetings} />

      {/* Overdue Tasks */}
      <OverdueTasks items={overdue} staleItems={stale} />

      {/* Email Hygiene */}
      <EmailHygiene senders={emailSenders} />
    </div>
  );
}
