"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

interface MeetingPrepItem {
  time: string;
  name: string;
  oneLiner: string;
  details: string[];
  url: string;
}


interface MeetingPrepProps {
  meetings?: MeetingPrepItem[];
}

export function MeetingPrep({ meetings = [] }: MeetingPrepProps) {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  function toggle(idx: number) {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  return (
    <section className="glass-card anim-card" style={{ animationDelay: "400ms" }}>
      <h2 className="text-sm font-semibold text-text-heading mb-4">Meeting Prep</h2>
      {meetings.length === 0 ? (
        <EmptyState />
      ) : (
      <div className="space-y-0 divide-y divide-[var(--bg-card-border)]">
        {meetings.map((mtg, i) => (
          <div key={i} className="py-3">
            <div
              className="flex items-start gap-3 cursor-pointer"
              onClick={() => toggle(i)}
            >
              <svg
                className={cn("w-4 h-4 text-text-muted shrink-0 mt-0.5 transition-transform", openItems.has(i) && "rotate-180")}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted shrink-0">{mtg.time}</span>
                  <a className="hot-link text-sm font-medium" href={mtg.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                    {mtg.name}
                  </a>
                </div>
                <div className="text-xs text-text-muted">{mtg.oneLiner}</div>
              </div>
            </div>
            {openItems.has(i) && (
              <ul className="mt-2 ml-7 space-y-1.5">
                {mtg.details.map((d, j) => (
                  <li key={j} className="text-xs text-text-body flex gap-2">
                    <span className="text-text-muted shrink-0">\u2022</span>
                    {d}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      )}
    </section>
  );
}
