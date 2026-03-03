"use client";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { calcScore, scoreReason, scoreClass, getEnergySlot } from "@/lib/priority";
import type { PriorityItem } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { SlackIcon } from "@/components/ui/icons";

function SourceIcon({ source }: { source: PriorityItem["source"] }) {
  if (source === "email") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    );
  }
  if (source === "teams") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    );
  }
  if (source === "slack") {
    return <SlackIcon size={16} />;
  }
  if (source === "salesforce") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    );
  }
  // asana
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="6" r="4.5" />
      <circle cx="5" cy="17" r="4.5" />
      <circle cx="19" cy="17" r="4.5" />
    </svg>
  );
}

const SOURCE_TAG_CLASSES: Record<PriorityItem["source"], string> = {
  email: "tag-email",
  teams: "tag-teams",
  asana: "tag-asana",
  slack: "tag-slack",
  salesforce: "tag-asana",
};

interface PriorityEngineProps {
  items?: PriorityItem[];
  onJeana?: (title: string, context: string) => void;
}

export function PriorityEngine({ items = [], onJeana }: PriorityEngineProps) {
  const [energyModeOn, setEnergyModeOn] = useState(true);
  const [doneItems, setDoneItems] = useState<Set<string>>(new Set());

  const slot = useMemo(() => getEnergySlot(), []);

  const scored = useMemo(() => {
    return items.map((item) => {
      const score = calcScore(item);
      const energyBonus = energyModeOn ? slot.boost(item) : 0;
      const displayScore = Math.max(0, Math.min(100, score + energyBonus));
      return { ...item, score, energyBonus, displayScore };
    });
  }, [items, energyModeOn, slot]);

  const sorted = useMemo(() => {
    return [...scored].sort((a, b) => (b.displayScore ?? 0) - (a.displayScore ?? 0));
  }, [scored]);

  const top12 = sorted.slice(0, 12);

  function handleMarkDone(title: string) {
    setDoneItems((prev) => new Set(prev).add(title));
  }

  return (
    <section className="glass-card anim-card" style={{ animationDelay: "80ms" }}>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-text-heading mb-4">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        Priority Score Engine
      </h2>

      {/* Energy banner */}
      <div className={cn(
        "rounded-xl p-3 mb-4 flex items-center justify-between gap-3",
        "bg-[var(--accent-amber-dim)] border border-[rgba(212,164,76,0.15)]",
        energyModeOn && "animate-pulse-slow"
      )}>
        <div>
          <div className="text-sm font-medium text-text-heading">
            {energyModeOn ? slot.label : "Energy Mode Off"}
          </div>
          <div className="text-xs text-text-muted">
            {energyModeOn ? "Scores adjusted for your current time slot" : "Using original priority scores"}
          </div>
        </div>
        <button
          className={cn(
            "text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer",
            energyModeOn
              ? "bg-accent-amber text-[#0d0d0d]"
              : "bg-[var(--tab-bg)] text-text-muted"
          )}
          onClick={() => setEnergyModeOn(!energyModeOn)}
        >
          Energy Mode: {energyModeOn ? "ON" : "OFF"}
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState />
      ) : (
      <>
      {/* Priority list */}
      <div className="space-y-0 divide-y divide-[var(--bg-card-border)]">
        {top12.map((item) => {
          const isDone = doneItems.has(item.title);
          return (
            <div
              key={item.title}
              className={cn(
                "flex items-center gap-3 py-2.5 transition-opacity",
                isDone && "opacity-40"
              )}
            >
              {(() => {
                const inner = (
                  <>
                    <span className={cn("text-lg font-bold tabular-nums w-8 text-right shrink-0", scoreClass(item.displayScore ?? 0))}>
                      {item.displayScore}
                      {energyModeOn && item.energyBonus !== 0 && (
                        <span className="text-[10px] ml-0.5 opacity-70">
                          {item.energyBonus > 0 ? "+" : ""}{item.energyBonus}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-text-muted">
                      <SourceIcon source={item.source} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-text-heading truncate">{item.title}</div>
                      <div className="text-xs text-text-muted truncate">{scoreReason(item)}</div>
                    </div>
                  </>
                );
                return item.url ? (
                  <a className="hot-link flex items-center gap-3 min-w-0 flex-1" href={item.url} target="_blank" rel="noopener noreferrer">
                    {inner}
                  </a>
                ) : (
                  <div className="flex items-center gap-3 min-w-0 flex-1">{inner}</div>
                );
              })()}
              <span className={cn("text-[10px] font-semibold uppercase tracking-wide rounded-md px-2 py-0.5 shrink-0", SOURCE_TAG_CLASSES[item.source])}>
                {item.source}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {item.source === "asana" ? (
                  <button
                    className={cn(
                      "text-xs px-2 py-1 rounded-md transition-colors cursor-pointer",
                      isDone
                        ? "bg-accent-teal/20 text-accent-teal"
                        : "hover:bg-accent-teal/20 text-text-muted hover:text-accent-teal"
                    )}
                    onClick={() => handleMarkDone(item.title)}
                    disabled={isDone}
                  >
                    {isDone ? "Done" : "Done"}
                  </button>
                ) : item.url ? (
                  <a
                    className="text-xs px-2 py-1 rounded-md hover:bg-[var(--accent-amber-dim)] text-text-muted hover:text-accent-amber transition-colors"
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open
                  </a>
                ) : null}
                <button
                  className="text-xs text-text-muted hover:text-accent-amber transition-colors px-1 cursor-pointer"
                  onClick={() => onJeana?.(item.title, `Source: ${item.source}. ${scoreReason(item)}`)}
                  title="Delegate to Jeana"
                >
                  Jeana
                </button>
              </div>
            </div>
          );
        })}
      </div>
      </>
      )}
    </section>
  );
}
