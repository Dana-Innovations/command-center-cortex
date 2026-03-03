'use client';

import { useLiveData } from '@/lib/live-data-context';

export function useTasks() {
  const { tasks, loading, error, fetchedAt } = useLiveData();
  return {
    tasks,
    loading,
    error,
    lastSynced: fetchedAt?.toISOString() ?? null,
  };
}
