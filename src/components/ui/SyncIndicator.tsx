"use client";
import { cn } from "@/lib/utils";

interface SyncIndicatorProps {
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  className?: string;
}

export function SyncIndicator({ isSyncing, lastSyncedAt, className }: SyncIndicatorProps) {
  const timeStr = lastSyncedAt
    ? lastSyncedAt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/Los_Angeles",
      })
    : null;

  return (
    <div className={cn("inline-flex items-center gap-2 text-xs text-text-muted", className)}>
      {isSyncing ? (
        <>
          <svg
            className="refresh-icon h-3.5 w-3.5 animate-spin text-accent-amber"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          <span>Syncing...</span>
        </>
      ) : (
        <>
          <span className="h-2 w-2 rounded-full bg-accent-green" />
          <span>{timeStr ? `Synced at ${timeStr}` : "Synced"}</span>
        </>
      )}
    </div>
  );
}
