"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { BookingsTarget, BookingsSegment } from "@/lib/types";

// Segment colors for the progress bars
const SEGMENT_COLORS = [
  "bg-accent-teal",
  "bg-accent-amber",
  "bg-accent-red",
  "bg-[#0070D2]",
  "bg-accent-green",
  "bg-[#A078DC]",
  "bg-[#FF9F40]",
  "bg-[#36A2EB]",
];

function currentQuarter(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${q}`;
}

export function useBookings(quarterOverride?: string) {
  const quarter = quarterOverride || currentQuarter();
  const [targets, setTargets] = useState<BookingsTarget[]>([]);
  const [actuals, setActuals] = useState<{ name: string; amount: number }[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch targets from Supabase
  const fetchTargets = useCallback(async () => {
    try {
      const res = await fetch(`/api/bookings/targets?quarter=${quarter}`);
      if (!res.ok) throw new Error("Failed to fetch targets");
      const data = await res.json();
      setTargets(data.targets ?? []);
    } catch (err) {
      console.error("Failed to fetch bookings targets:", err);
    }
  }, [quarter]);

  // Fetch actuals from Power BI
  const fetchActuals = useCallback(async () => {
    try {
      const res = await fetch(`/api/bookings/actuals?quarter=${quarter}`);
      if (!res.ok) throw new Error("Failed to fetch actuals");
      const data = await res.json();
      setActuals(data.segments ?? []);
    } catch (err) {
      console.error("Failed to fetch bookings actuals:", err);
    }
  }, [quarter]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchTargets(), fetchActuals()])
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [fetchTargets, fetchActuals]);

  // Merge targets + actuals into segments
  const segments: BookingsSegment[] = useMemo(() => {
    if (targets.length === 0) return [];

    return targets
      .sort((a, b) => a.display_order - b.display_order)
      .map((target) => {
        // Match actuals by segment name (case-insensitive)
        const actual = actuals.find(
          (a) => a.name.toLowerCase() === target.segment.toLowerCase()
        );
        const actualAmount = actual?.amount ?? 0;
        const pct =
          target.target_amount > 0
            ? Math.round((actualAmount / target.target_amount) * 100)
            : 0;

        return {
          name: target.segment,
          actual: actualAmount,
          target: target.target_amount,
          pct,
          color: target.color || SEGMENT_COLORS[0],
        };
      });
  }, [targets, actuals]);

  const totalTarget = useMemo(
    () => segments.reduce((s, seg) => s + seg.target, 0),
    [segments]
  );

  const totalActual = useMemo(
    () => segments.reduce((s, seg) => s + seg.actual, 0),
    [segments]
  );

  const totalPct = useMemo(
    () => (totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0),
    [totalTarget, totalActual]
  );

  // Save targets
  const saveTargets = useCallback(
    async (
      newTargets: {
        segment: string;
        target_amount: number;
        color?: string;
        display_order?: number;
      }[]
    ) => {
      setSaving(true);
      try {
        const res = await fetch("/api/bookings/targets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quarter, targets: newTargets }),
        });
        if (!res.ok) throw new Error("Failed to save targets");
        const data = await res.json();
        setTargets(data.targets ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [quarter]
  );

  // Manual refresh of actuals
  const refreshActuals = useCallback(async () => {
    setLoading(true);
    await fetchActuals();
    setLoading(false);
  }, [fetchActuals]);

  return {
    quarter,
    segments,
    totalTarget,
    totalActual,
    totalPct,
    targets,
    loading,
    saving,
    error,
    saveTargets,
    refreshActuals,
    segmentColors: SEGMENT_COLORS,
  };
}
