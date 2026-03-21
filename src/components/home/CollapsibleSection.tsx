"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function getStoredBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === "true";
  } catch {
    return fallback;
  }
}

interface CollapsibleSectionProps {
  storageKey: string;
  defaultExpanded?: boolean;
  title: string;
  description: string;
  animDelay?: number;
  action?: React.ReactNode;
  badge?: string | number | null;
  children: React.ReactNode;
}

export function CollapsibleSection({
  storageKey,
  defaultExpanded = false,
  title,
  description,
  animDelay = 0,
  action,
  badge,
  children,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(() =>
    getStoredBoolean(storageKey, defaultExpanded)
  );

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(expanded));
    } catch {
      // ignore
    }
  }, [expanded, storageKey]);

  const toggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  return (
    <section
      className="glass-card anim-card"
      style={{ animationDelay: `${animDelay}ms` }}
    >
      {/* Header — always visible */}
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-3 text-left"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold text-text-heading">{title}</h2>
            {badge != null && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--accent-blue)]/15 px-1.5 text-[10px] font-semibold text-[var(--accent-blue)]">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-text-muted">{description}</p>
        </div>

        {action && (
          <div
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") e.stopPropagation();
            }}
          >
            {action}
          </div>
        )}

        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "shrink-0 text-text-muted transition-transform duration-300",
            expanded && "rotate-180"
          )}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Body — collapsible */}
      <div className={cn("collapsible-body mt-4", expanded && "expanded")}>
        <div className="collapsible-inner">{children}</div>
      </div>
    </section>
  );
}
