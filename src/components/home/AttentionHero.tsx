"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { HeroItem, QuickAction } from "./useHomeData";

const urgencyColors: Record<HeroItem["urgency"], { border: string; dot: string; bg: string }> = {
  now: {
    border: "border-l-accent-red",
    dot: "bg-accent-red",
    bg: "bg-accent-red/8",
  },
  today: {
    border: "border-l-accent-amber",
    dot: "bg-accent-amber",
    bg: "bg-accent-amber/8",
  },
  "this-week": {
    border: "border-l-accent-green",
    dot: "bg-accent-green",
    bg: "bg-accent-green/8",
  },
};

const urgencyLabels: Record<HeroItem["urgency"], string> = {
  now: "NOW",
  today: "TODAY",
  "this-week": "THIS WEEK",
};

const kindLabels: Record<string, string> = {
  email: "Email",
  chat: "Teams",
  slack: "Slack",
  asana: "Asana",
  calendar: "Calendar",
  task: "Task",
};

interface AttentionHeroProps {
  items: HeroItem[];
  onAction: (action: QuickAction) => void;
}

export function AttentionHero({ items, onAction }: AttentionHeroProps) {
  if (items.length === 0) {
    return (
      <section className="glass-card anim-card overflow-hidden" style={{ animationDelay: "0ms" }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,178,169,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(0,163,225,0.08),transparent_32%)]" />
        <div className="relative">
          <div className="type-eyebrow text-accent-green">All Clear</div>
          <h1 className="mt-3 font-display text-2xl font-semibold leading-tight text-text-heading">
            Nothing needs your attention right now.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-muted">
            Your inbox, calendar, and tasks are in good shape. Expand the sections below for detail, or head to a tab to dig deeper.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="glass-card anim-card overflow-hidden" style={{ animationDelay: "0ms" }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,93,93,0.10),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(0,163,225,0.08),transparent_30%)]" />
      <div className="relative">
        <div className="type-eyebrow text-accent-red">
          Needs Your Attention
        </div>
        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const colors = urgencyColors[item.urgency];
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-4 rounded-[16px] border-l-[3px] p-4",
                  colors.border,
                  colors.bg
                )}
              >
                <div
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 rounded-full",
                    colors.dot,
                    item.urgency === "now" && "animate-[nowPulse_2s_ease-in-out_infinite]"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-[var(--bg-card-border)] bg-black/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-text-muted">
                      {kindLabels[item.kind] || item.kind}
                    </span>
                    <span className={cn(
                      "text-[10px] font-semibold uppercase tracking-[0.18em]",
                      item.urgency === "now" ? "text-accent-red" : "text-text-muted"
                    )}>
                      {urgencyLabels[item.urgency]}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-text-heading">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {item.subtitle}
                  </p>
                </div>
                {item.action && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    onClick={() => onAction(item.action!)}
                  >
                    {item.action.label}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
