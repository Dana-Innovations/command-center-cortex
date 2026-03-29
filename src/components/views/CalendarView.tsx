"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { MeetingPrep } from "@/components/command-center/MeetingPrep";
import { WeatherCard } from "@/components/command-center/WeatherCard";
import { useCalendar } from "@/hooks/useCalendar";
import {
  eventOccursOnDate,
  parseCalendarDate,
  toCalendarEventDate,
  toPacificDate,
} from "@/lib/calendar";
import { transformMeetingPrep } from "@/lib/transformers";
import { CalendarEvent } from "@/lib/types";

function nowPST(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
  );
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function formatTime12(d: Date | null): string {
  if (!d) {
    return "Time TBD";
  }

  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12}:00 ${period}` : `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatTimeRange(ev: CalendarEvent): string {
  return `${formatTime12(toPacificDate(ev.start_time))} – ${formatTime12(toPacificDate(ev.end_time))}`;
}

function formatWeekRange(start: Date): string {
  const end = addDays(start, 6);
  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endLabel = end.toLocaleDateString("en-US", {
    month: start.getMonth() === end.getMonth() ? undefined : "short",
    day: "numeric",
    year: start.getFullYear() === end.getFullYear() ? undefined : "numeric",
  });

  return `${startLabel} – ${endLabel}`;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function NowMarker() {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="w-3 h-3 rounded-full bg-accent-red shrink-0 shadow-[0_0_8px_rgba(232,93,93,0.6)] animate-pulse" />
      <div className="flex-1 h-px bg-accent-red" />
      <span className="text-xs font-bold text-accent-red uppercase tracking-wider">NOW</span>
      <div className="flex-1 h-px bg-accent-red" />
    </div>
  );
}

function EventCard({ ev, now, onPrepMeeting }: { ev: CalendarEvent; now: Date; onPrepMeeting?: (eventId: string) => void }) {
  const start = toPacificDate(ev.start_time);
  const end = toPacificDate(ev.end_time);
  const isHappening = Boolean(start && end && start <= now && now < end);

  return (
    <div className={cn(
      "glass-card p-3 flex items-start gap-3",
      isHappening && "border border-accent-amber/60 shadow-[0_0_12px_rgba(212,164,76,0.15)]"
    )}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted tabular-nums shrink-0">{formatTimeRange(ev)}</span>
          {isHappening && (
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" title="Happening now" />
          )}
        </div>
        <div className="text-sm font-medium text-text-heading mt-0.5">{ev.subject}</div>
        {(ev.location || ev.organizer) && (
          <div className="text-xs text-text-muted mt-0.5">
            {ev.location || ev.organizer}
          </div>
        )}
      </div>
      {ev.join_url && ev.is_online && (
        <a
          href={ev.join_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md bg-accent-teal/15 text-accent-teal hover:bg-accent-teal/25 transition-colors"
        >
          Join
        </a>
      )}
      {onPrepMeeting && (
        <button
          onClick={() => onPrepMeeting(ev.id)}
          className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md bg-accent-amber/15 text-accent-amber hover:bg-accent-amber/25 transition-colors"
        >
          Prep
        </button>
      )}
    </div>
  );
}

function WeekEventChip({ ev, now, onPrepMeeting }: { ev: CalendarEvent; now: Date; onPrepMeeting?: (eventId: string) => void }) {
  const start = toPacificDate(ev.start_time);
  const end = toPacificDate(ev.end_time);
  const isHappening = Boolean(start && end && start <= now && now < end);

  return (
    <div
      className={cn(
        "rounded-xl border p-2.5 transition-colors bg-white/[0.03] border-white/6 hover:bg-white/[0.05]",
        isHappening && "border-accent-amber/50 bg-accent-amber/10"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono text-text-muted tabular-nums">
          {formatTime12(start)}
        </span>
        {isHappening ? (
          <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-accent-amber">
            Live
          </span>
        ) : ev.is_online ? (
          <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-accent-teal">
            Online
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-[13px] font-medium leading-5 text-text-heading line-clamp-2">
        {ev.subject}
      </p>
      {(ev.location || ev.organizer) && (
        <p className="mt-1 text-[11px] leading-4 text-text-muted line-clamp-2">
          {ev.location || ev.organizer}
        </p>
      )}
      {onPrepMeeting && (
        <button
          onClick={() => onPrepMeeting(ev.id)}
          className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-accent-amber hover:text-accent-amber/80 transition-colors"
        >
          Prep →
        </button>
      )}
    </div>
  );
}

interface DayBucket {
  date: Date;
  allDay: CalendarEvent[];
  timed: CalendarEvent[];
  count: number;
  isToday: boolean;
}

interface CalendarViewProps {
  onPrepMeeting?: (eventId: string) => void;
}

export function CalendarView({ onPrepMeeting }: CalendarViewProps) {
  const { events: calEvents } = useCalendar();
  const meetingPrep = useMemo(() => transformMeetingPrep(calEvents), [calEvents]);

  const [now, setNow] = useState(nowPST);
  useEffect(() => {
    const timer = setInterval(() => setNow(nowPST()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const [weekOffset, setWeekOffset] = useState(0);

  const today = useMemo(() => {
    const n = now;
    return `${n.getFullYear()}-${n.getMonth()}-${n.getDate()}`;
  }, [now]);

  const weekStart = useMemo(() => {
    const base = startOfWeek(now);
    return addDays(base, weekOffset * 7);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, weekOffset]);

  const sortedEvents = useMemo(() => {
    return [...calEvents]
      .filter(
        (event) =>
          parseCalendarDate(event.start_time) && parseCalendarDate(event.end_time)
      )
      .sort((a, b) => {
        const aStart =
          toCalendarEventDate(a.start_time, a.is_all_day) ??
          parseCalendarDate(a.start_time)!;
        const bStart =
          toCalendarEventDate(b.start_time, b.is_all_day) ??
          parseCalendarDate(b.start_time)!;
        return aStart.getTime() - bStart.getTime();
      });
  }, [calEvents]);

  const weekDays = useMemo<DayBucket[]>(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(weekStart, index);
      const allDay = sortedEvents.filter(
        (event) =>
          event.is_all_day &&
          eventOccursOnDate(event.start_time, event.end_time, true, date)
      );
      const timed = sortedEvents.filter(
        (event) =>
          !event.is_all_day &&
          eventOccursOnDate(event.start_time, event.end_time, false, date)
      );

      return {
        date,
        allDay,
        timed,
        count: allDay.length + timed.length,
        isToday: isSameDay(date, now),
      };
    });
  }, [now, sortedEvents, weekStart]);

  const todayBucket = weekOffset === 0
    ? (weekDays.find((day) => day.isToday) ?? weekDays[0])
    : weekDays[0];

  const dayLabel = weekOffset === 0
    ? "Today"
    : todayBucket.date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  const nowInsertBefore = useMemo(() => {
    for (let i = 0; i < todayBucket.timed.length; i++) {
      const start = toPacificDate(todayBucket.timed[i].start_time);
      if (start && start > now) return i;
    }
    return todayBucket.timed.length;
  }, [todayBucket.timed, now]);

  const weekEventCount = useMemo(
    () => weekDays.reduce((sum, day) => sum + day.count, 0),
    [weekDays]
  );

  const busyDays = useMemo(
    () => weekDays.filter((day) => day.count > 0).length,
    [weekDays]
  );

  const onlineMeetings = useMemo(
    () =>
      weekDays.reduce(
        (sum, day) => sum + day.timed.filter((event) => event.is_online).length,
        0
      ),
    [weekDays]
  );

  return (
    <div className="space-y-5">
      <section className="glass-card anim-card p-5" style={{ animationDelay: "80ms" }}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text-heading">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Week at a Glance
            </h2>
            <div className="mt-1.5 flex items-center gap-2">
              <button
                onClick={() => setWeekOffset((o) => o - 1)}
                className="rounded-md border border-[var(--bg-card-border)] px-1.5 py-0.5 text-xs text-text-muted transition-colors hover:text-text-body hover:border-[var(--bg-card-hover-border)]"
                aria-label="Previous week"
              >
                ‹
              </button>
              <span className="text-xs text-text-muted min-w-[140px] text-center">
                {formatWeekRange(weekStart)}
              </span>
              <button
                onClick={() => setWeekOffset((o) => o + 1)}
                className="rounded-md border border-[var(--bg-card-border)] px-1.5 py-0.5 text-xs text-text-muted transition-colors hover:text-text-body hover:border-[var(--bg-card-hover-border)]"
                aria-label="Next week"
              >
                ›
              </button>
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="rounded-md border border-[var(--bg-card-border)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-body hover:border-[var(--bg-card-hover-border)]"
                >
                  Today
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            {[
              { label: "Events", value: weekEventCount },
              { label: "Busy Days", value: busyDays },
              { label: "Online", value: onlineMeetings },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-white/[0.03] px-3 py-2 text-center min-w-[82px]">
                <p className="text-lg font-semibold tabular-nums text-text-heading">
                  {stat.value}
                </p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto pb-2">
          <div className="grid min-w-[1120px] grid-cols-7 gap-3">
            {weekDays.map((day) => (
              <div
                key={day.date.toISOString()}
                className={cn(
                  "rounded-2xl border p-3 min-h-[340px] bg-white/[0.02]",
                  day.isToday
                    ? "border-accent-teal/40 bg-accent-teal/[0.06]"
                    : "border-white/6"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-[0.2em]",
                        day.isToday ? "text-accent-teal" : "text-text-muted"
                      )}
                    >
                      {day.date.toLocaleDateString("en-US", { weekday: "short" })}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-text-heading">
                      {day.date.toLocaleDateString("en-US", { day: "numeric" })}
                    </p>
                    <p className="text-[11px] text-text-muted">
                      {day.date.toLocaleDateString("en-US", { month: "short" })}
                    </p>
                  </div>

                  <span className="rounded-full bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-text-muted">
                    {day.count}
                  </span>
                </div>

                {day.allDay.length > 0 && (
                  <div className="mb-3 space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-amber">
                      All Day
                    </p>
                    {day.allDay.map((event) => (
                      <div
                        key={`${event.id}-${day.date.toISOString()}-all-day`}
                        className="rounded-xl bg-accent-amber/10 px-2.5 py-2 border border-accent-amber/20"
                      >
                        <p className="text-[12px] font-medium leading-5 text-text-heading line-clamp-2">
                          {event.subject}
                        </p>
                        {event.location && (
                          <p className="mt-1 text-[11px] text-text-muted line-clamp-2">
                            {event.location}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {day.timed.length > 0 ? (
                  <div className="space-y-2">
                    {day.timed.map((event) => (
                      <WeekEventChip key={`${event.id}-${day.date.toISOString()}`} ev={event} now={now} onPrepMeeting={onPrepMeeting} />
                    ))}
                  </div>
                ) : day.allDay.length === 0 ? (
                  <div className="flex h-[180px] items-center justify-center rounded-xl border border-dashed border-white/8 text-center">
                    <p className="px-4 text-[11px] uppercase tracking-[0.18em] text-text-muted">
                      Clear
                    </p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
        <section className="glass-card anim-card p-5" style={{ animationDelay: "160ms" }}>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text-heading mb-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {dayLabel}
          </h2>

          {todayBucket.allDay.map((ev) => (
            <div key={`${ev.id}-today`} className="glass-card p-3 mb-2 flex items-center gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent-amber/15 text-accent-amber shrink-0">
                All day
              </span>
              <span className="text-sm font-medium text-text-heading truncate">{ev.subject}</span>
              {ev.location && <span className="text-xs text-text-muted truncate">{ev.location}</span>}
            </div>
          ))}

          {todayBucket.timed.length === 0 && todayBucket.allDay.length === 0 && (
            <div className="text-sm text-text-muted text-center py-6">No events today</div>
          )}

          <div className="space-y-2">
            {todayBucket.timed.map((ev, i) => (
              <div key={ev.id}>
                {i === nowInsertBefore && <NowMarker />}
                <EventCard ev={ev} now={now} onPrepMeeting={onPrepMeeting} />
              </div>
            ))}
            {nowInsertBefore === todayBucket.timed.length && todayBucket.timed.length > 0 && <NowMarker />}
          </div>
        </section>

        <WeatherCard />
      </div>

      <MeetingPrep meetings={meetingPrep} onPrepMeeting={onPrepMeeting} />
    </div>
  );
}
