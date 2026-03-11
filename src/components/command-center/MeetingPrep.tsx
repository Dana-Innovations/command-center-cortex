"use client";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import type { MeetingPrepItem } from "@/lib/transformers";

interface MeetingPrepProps {
  meetings?: MeetingPrepItem[];
  onPrepMeeting?: (eventId: string) => void;
}

export function MeetingPrep({ meetings = [], onPrepMeeting }: MeetingPrepProps) {
  // Group meetings by dayLabel
  const grouped = useMemo(() => {
    const map = new Map<string, MeetingPrepItem[]>();
    for (const mtg of meetings) {
      const key = mtg.dayLabel || "Upcoming";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(mtg);
    }
    return map;
  }, [meetings]);

  return (
    <section className="glass-card anim-card" style={{ animationDelay: "400ms" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-text-heading">Meeting Prep</h2>
        {meetings.length > 0 && (
          <span className="text-[10px] font-medium text-text-muted bg-[var(--bg-card-border)] rounded-full px-1.5 py-0.5">
            {meetings.length} this week
          </span>
        )}
      </div>

      {meetings.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {[...grouped.entries()].map(([day, items]) => (
            <div key={day}>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2">
                {day}
              </div>
              <div className="space-y-0 divide-y divide-[var(--bg-card-border)]">
                {items.map((mtg, i) => (
                  <div key={i} className="py-2.5 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-muted shrink-0">
                          {mtg.time}
                        </span>
                        <a
                          className="hot-link text-sm font-medium truncate"
                          href={mtg.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {mtg.name}
                        </a>
                      </div>
                      {mtg.oneLiner && (
                        <div className="text-xs text-text-muted truncate mt-0.5">
                          {mtg.oneLiner}
                        </div>
                      )}
                    </div>
                    {onPrepMeeting && (
                      <button
                        onClick={() => onPrepMeeting(mtg.eventId)}
                        className={cn(
                          "shrink-0 text-[10px] font-semibold uppercase tracking-wider",
                          "px-2.5 py-1 rounded-md cursor-pointer",
                          "bg-accent-amber/10 text-accent-amber",
                          "hover:bg-accent-amber/20 transition-colors"
                        )}
                      >
                        Prep
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
