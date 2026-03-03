"use client";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SyncIndicator } from "@/components/ui/SyncIndicator";

interface FooterProps {
  isSyncing?: boolean;
  lastSyncedAt?: Date | null;
  onEodSummary?: () => void;
  className?: string;
}

export function Footer({
  isSyncing = false,
  lastSyncedAt = null,
  onEodSummary,
  className,
}: FooterProps) {
  const [showEod, setShowEod] = useState(false);

  useEffect(() => {
    function checkTime() {
      const now = new Date();
      const pstHour = parseInt(
        now.toLocaleString("en-US", {
          hour: "numeric",
          hour12: false,
          timeZone: "America/Los_Angeles",
        }),
        10
      );
      setShowEod(pstHour >= 16);
    }
    checkTime();
    const interval = setInterval(checkTime, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer
      className={cn(
        "main-footer flex items-center justify-between px-6 py-4 border-t border-[var(--bg-card-border)]",
        className
      )}
    >
      <SyncIndicator isSyncing={isSyncing} lastSyncedAt={lastSyncedAt} />

      {showEod && (
        <Button variant="primary" size="sm" onClick={onEodSummary}>
          EOD Summary
        </Button>
      )}
    </footer>
  );
}
