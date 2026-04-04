"use client";

import { Button } from "@/components/ui/button";

interface SetupContinueBarProps {
  connectedCount: number;
  totalCount: number;
  onContinue: () => void;
}

export function SetupContinueBar({
  connectedCount,
  totalCount,
  onContinue,
}: SetupContinueBarProps) {
  return (
    <div className="sticky bottom-0 z-10 border-t border-white/5 bg-[var(--bg-primary)]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
        <span className="text-sm text-text-muted">
          ({connectedCount} of {totalCount} connected)
        </span>
        <Button variant="primary" size="md" onClick={onContinue}>
          {connectedCount === 0 ? "Skip setup" : "Continue to Command Center"}
        </Button>
      </div>
    </div>
  );
}
