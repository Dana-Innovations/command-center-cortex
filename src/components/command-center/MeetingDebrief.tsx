"use client";
import { useState, useEffect } from "react";
import { cn, getCurrentPSTHour } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

interface DebriefMeeting {
  name: string;
  time: string;
  startH: number;
  endH: number;
  url: string;
}


interface DebriefNotes {
  takeaways: string;
  actions: string;
  followups: string;
}

interface MeetingDebriefProps {
  meetings?: DebriefMeeting[];
}

export function MeetingDebrief({ meetings = [] }: MeetingDebriefProps) {
  const [currentH, setCurrentH] = useState(getCurrentPSTHour);
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState<Record<number, DebriefNotes>>({});
  const [savedBadges, setSavedBadges] = useState<Set<number>>(new Set());

  useEffect(() => {
    const timer = setInterval(() => setCurrentH(getCurrentPSTHour()), 60000);
    return () => clearInterval(timer);
  }, []);

  function getStatus(mtg: DebriefMeeting) {
    if (currentH >= mtg.endH) return { label: "Ended \u2014 Debrief", dotClass: "bg-accent-teal", labelClass: "text-accent-teal" };
    if (currentH >= mtg.startH) return { label: "In Progress", dotClass: "bg-accent-amber animate-pulse", labelClass: "text-accent-amber" };
    return { label: "Upcoming", dotClass: "bg-text-muted", labelClass: "text-text-muted" };
  }

  function toggle(idx: number) {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function updateNote(idx: number, field: keyof DebriefNotes, value: string) {
    setNotes((prev) => ({
      ...prev,
      [idx]: { ...prev[idx], [field]: value },
    }));
  }

  function handleSave(idx: number) {
    setSavedBadges((prev) => new Set(prev).add(idx));
    setTimeout(() => {
      setSavedBadges((prev) => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
    }, 3000);
  }

  function handleCopyAll(idx: number) {
    const n = notes[idx] || { takeaways: "", actions: "", followups: "" };
    const text = `KEY TAKEAWAYS:\n${n.takeaways}\n\nACTION ITEMS:\n${n.actions}\n\nFOLLOW-UPS:\n${n.followups}`;
    navigator.clipboard?.writeText(text);
  }

  return (
    <section className="glass-card anim-card" style={{ animationDelay: "560ms" }}>
      <h2 className="text-sm font-semibold text-text-heading mb-4">Meeting Debrief</h2>
      {meetings.length === 0 ? (
        <EmptyState />
      ) : (
      <div className="space-y-0 divide-y divide-[var(--bg-card-border)]">
        {meetings.map((mtg, i) => {
          const status = getStatus(mtg);
          return (
            <div key={i} className="py-3">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggle(i)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", status.dotClass)} />
                  <span className="text-xs text-text-muted">{mtg.time}</span>
                  <a
                    className="hot-link text-sm font-medium"
                    href={mtg.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {mtg.name}
                  </a>
                </div>
                <span className={cn("text-xs font-medium", status.labelClass)}>{status.label}</span>
              </div>

              {openItems.has(i) && (
                <div className="mt-3 ml-5 space-y-3">
                  {(["takeaways", "actions", "followups"] as const).map((field) => (
                    <div key={field}>
                      <label className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1 block">
                        {field === "takeaways" ? "Key Takeaways" : field === "actions" ? "Action Items" : "Follow-Ups"}
                      </label>
                      <textarea
                        className="w-full h-20 bg-[var(--draft-bg)] border border-[rgba(212,164,76,0.1)] rounded-lg p-2.5 text-xs text-text-body resize-none focus:outline-none focus:border-accent-amber/30"
                        placeholder={
                          field === "takeaways"
                            ? "What were the main outcomes?"
                            : field === "actions"
                            ? "Who owns what? By when?"
                            : "Anything to send to attendees or schedule next?"
                        }
                        value={notes[i]?.[field] || ""}
                        onChange={(e) => updateNote(i, field, e.target.value)}
                      />
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <button
                      className="text-xs px-3 py-1.5 rounded-lg bg-accent-teal/15 text-accent-teal font-medium cursor-pointer hover:bg-accent-teal/25 transition-colors"
                      onClick={() => handleSave(i)}
                    >
                      Save Notes
                    </button>
                    <button
                      className="text-xs px-3 py-1.5 rounded-lg border border-[var(--bg-card-border)] text-text-muted hover:text-text-body cursor-pointer transition-colors"
                      onClick={() => handleCopyAll(i)}
                    >
                      Copy All
                    </button>
                    {savedBadges.has(i) && (
                      <span className="text-xs text-accent-teal font-medium">Saved</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </section>
  );
}
