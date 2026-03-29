"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "cc-onboarding-highlights-dismissed";
const AUTO_DISMISS_MS = 30_000;

interface HighlightConfig {
  id: string;
  label: string;
}

export const ONBOARDING_HIGHLIGHTS: HighlightConfig[] = [
  { id: "attention-hero", label: "Your top priorities, ranked by urgency" },
  { id: "morning-brief", label: "Your daily summary — expand to read the full brief" },
  { id: "quick-actions", label: "Suggested next steps based on your priorities" },
];

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {}
}

export function useOnboardingHighlights() {
  const [dismissed, setDismissed] = useState<Set<string>>(() => getDismissed());

  useEffect(() => {
    const timer = setTimeout(() => {
      const all = new Set(ONBOARDING_HIGHLIGHTS.map((h) => h.id));
      setDismissed(all);
      saveDismissed(all);
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(next);
      return next;
    });
  }, []);

  const allDismissed = ONBOARDING_HIGHLIGHTS.every((h) => dismissed.has(h.id));

  return { dismissed, dismiss, allDismissed };
}

interface OnboardingHighlightProps {
  id: string;
  label: string;
  dismissed: boolean;
  onDismiss: () => void;
}

export function OnboardingHighlight({ id, label, dismissed, onDismiss }: OnboardingHighlightProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="absolute right-3 top-3 z-10"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={(e) => {
        e.stopPropagation();
        onDismiss();
      }}
    >
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-lg border border-[var(--bg-card-border)] bg-[var(--bg-card)] px-3 py-1.5 text-[11px] text-text-body shadow-lg">
          {label}
          <div className="absolute -bottom-1 right-3 h-2 w-2 rotate-45 border-b border-r border-[var(--bg-card-border)] bg-[var(--bg-card)]" />
        </div>
      )}

      {/* Pulsing dot */}
      <button
        aria-label={`Highlight: ${label}. Click to dismiss.`}
        className="relative flex h-5 w-5 cursor-pointer items-center justify-center"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
        <span className="absolute inset-0 rounded-full border-2 border-blue-500/40 animate-[onboardingPulse_2s_ease-in-out_infinite]" />
      </button>
    </div>
  );
}
