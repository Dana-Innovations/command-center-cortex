"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { SlackIcon } from "@/components/ui/icons";

interface SlackItem {
  title: string;
  meta: string;
  url: string;
  jeanaTitle: string;
  jeanaContext: string;
}

interface SlackCardProps {
  items?: SlackItem[];
  onJeana?: (title: string, context: string) => void;
}

export function SlackCard({ items = [], onJeana }: SlackCardProps) {
  return (
    <section className="glass-card anim-card" style={{ animationDelay: "80ms" }}>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-text-heading mb-4">
        <SlackIcon />
        Slack
        <span className="inline-flex items-center rounded-full bg-[rgba(90,199,139,0.12)] text-accent-green px-2 py-0.5 text-xs font-medium">
          {items.length} actions
        </span>
      </h2>
      {items.length === 0 ? (
        <EmptyState />
      ) : (
      <div className="space-y-0 divide-y divide-[var(--bg-card-border)]">
        {items.map((item, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start justify-between gap-3 py-3",
              i === 0 && "pt-0",
              i === items.length - 1 && "border-b-0"
            )}
          >
            <div className="flex items-start gap-2 min-w-0">
              <span className="inline-flex items-center rounded-md bg-[rgba(232,93,93,0.12)] text-accent-red px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide shrink-0 mt-0.5">
                ACTION
              </span>
              <div className="min-w-0">
                <a
                  className="hot-link text-sm font-medium block truncate"
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.title}
                </a>
                <span className="text-xs text-text-muted">{item.meta}</span>
              </div>
            </div>
            <button
              className="shrink-0 text-xs text-text-muted hover:text-accent-amber transition-colors px-2 py-1 rounded-md hover:bg-[var(--accent-amber-dim)] cursor-pointer"
              onClick={() => onJeana?.(item.jeanaTitle, item.jeanaContext)}
              title="Delegate to Jeana"
            >
              Jeana
            </button>
          </div>
        ))}
      </div>
      )}
    </section>
  );
}
