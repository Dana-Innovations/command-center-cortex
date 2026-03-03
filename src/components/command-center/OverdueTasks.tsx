"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

interface OverdueItem {
  id: string;
  name: string;
  daysOverdue: number;
  dueDate: string;
  url: string;
}


interface OverdueTasksProps {
  items?: OverdueItem[];
  staleItems?: OverdueItem[];
}

export function OverdueTasks({ items = [], staleItems = [] }: OverdueTasksProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [staleOpen, setStaleOpen] = useState(false);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(new Set());
  const [abandonedIds, setAbandonedIds] = useState<Set<string>>(new Set());

  function handleDone(id: string) {
    setDoneIds((prev) => new Set(prev).add(id));
  }

  function handleSnooze(id: string) {
    setSnoozedIds((prev) => new Set(prev).add(id));
  }

  function handleAbandon(id: string) {
    setAbandonedIds((prev) => new Set(prev).add(id));
  }

  const visibleItems = items.filter((i) => !doneIds.has(i.id));
  const visibleStale = staleItems.filter((i) => !abandonedIds.has(i.id));

  return (
    <section className="glass-card anim-card" style={{ animationDelay: "560ms" }}>
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text-heading">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Other Overdue Tasks
          <span className="inline-flex items-center rounded-full bg-accent-red/15 text-accent-red px-2 py-0.5 text-xs font-medium">
            {visibleItems.length}
          </span>
        </h2>
        <svg
          className={cn("w-4 h-4 text-text-muted transition-transform", isOpen && "rotate-180")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {isOpen && visibleItems.length === 0 && visibleStale.length === 0 && <EmptyState />}

      {isOpen && (visibleItems.length > 0 || visibleStale.length > 0) && (
        <div className="mt-4 space-y-0 divide-y divide-[var(--bg-card-border)]">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 py-2.5 transition-opacity",
                snoozedIds.has(item.id) && "opacity-50"
              )}
            >
              <span className="text-xs font-bold text-accent-red tabular-nums w-8 text-right shrink-0">
                {item.daysOverdue}d
              </span>
              <div className="min-w-0 flex-1">
                <a className="hot-link text-sm font-medium" href={item.url} target="_blank" rel="noopener noreferrer">
                  {item.name}
                </a>
                <div className="text-xs text-text-muted">Due {item.dueDate}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  className={cn(
                    "text-xs px-2 py-1 rounded-md transition-colors cursor-pointer",
                    doneIds.has(item.id)
                      ? "bg-accent-teal/20 text-accent-teal"
                      : "hover:bg-accent-teal/20 text-text-muted hover:text-accent-teal"
                  )}
                  onClick={() => handleDone(item.id)}
                  disabled={doneIds.has(item.id)}
                >
                  Done
                </button>
                <button
                  className={cn(
                    "text-xs px-2 py-1 rounded-md transition-colors cursor-pointer",
                    snoozedIds.has(item.id)
                      ? "bg-accent-amber/20 text-accent-amber"
                      : "hover:bg-accent-amber/20 text-text-muted hover:text-accent-amber"
                  )}
                  onClick={() => handleSnooze(item.id)}
                  disabled={snoozedIds.has(item.id)}
                >
                  {snoozedIds.has(item.id) ? "Snoozed" : "Snooze"}
                </button>
              </div>
            </div>
          ))}

          {/* Stale bucket */}
          {visibleStale.length > 0 && (
            <div className="pt-4">
              <div
                className="flex items-center gap-2 cursor-pointer mb-2"
                onClick={() => setStaleOpen(!staleOpen)}
              >
                <svg
                  className={cn("w-3 h-3 text-text-muted transition-transform", !staleOpen && "-rotate-90")}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Stale Bucket (&gt;30 days)
                </span>
                <span className="text-xs text-text-muted">{visibleStale.length}</span>
              </div>
              {staleOpen && (
                <div className="space-y-2 ml-5">
                  {visibleStale.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-1.5">
                      <span className="text-xs font-bold text-accent-red tabular-nums w-10 text-right shrink-0">
                        {item.daysOverdue}d
                      </span>
                      <a className="hot-link text-sm min-w-0 flex-1 truncate" href={item.url} target="_blank" rel="noopener noreferrer">
                        {item.name}
                      </a>
                      <button
                        className="text-xs px-2 py-1 rounded-md hover:bg-accent-red/20 text-text-muted hover:text-accent-red transition-colors cursor-pointer"
                        onClick={() => handleAbandon(item.id)}
                      >
                        Abandon
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
