"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

export interface RelevanceScore {
  personKey: string;
  personName: string;
  personEmail: string | null;
  recencyScore: number;
  frequencyScore: number;
  diversityScore: number;
  bidirectionalityScore: number;
  trendScore: number;
  relevanceScore: number;
  totalInteractions30d: number;
  activeChannels: string[];
  lastInteractionAt: string | null;
}

export function usePeopleRelevance() {
  const [scores, setScores] = useState<RelevanceScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [computedAt, setComputedAt] = useState<string | null>(null);

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch("/api/data/people-relevance");
      if (!res.ok) return;
      const data = await res.json();
      setScores(data.scores ?? []);
      setComputedAt(data.computedAt ?? null);
    } catch {
      // silently fail — relevance is optional enhancement
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchScores();
  }, [fetchScores]);

  const scoreMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of scores) {
      map.set(s.personKey, s.relevanceScore);
    }
    return map;
  }, [scores]);

  const getRelevanceScore = useCallback(
    (personKey: string): number | null => {
      return scoreMap.get(personKey) ?? null;
    },
    [scoreMap]
  );

  const hasData = scores.length > 0;

  return { scores, loading, hasData, computedAt, getRelevanceScore, refetch: fetchScores };
}
