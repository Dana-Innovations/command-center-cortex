'use client';

import { useLiveData } from '@/lib/live-data-context';

export function useCalendar() {
  const { calendar: events, loading, error, fetchedAt } = useLiveData();
  return {
    events,
    loading,
    error,
    lastSynced: fetchedAt?.toISOString() ?? null,
  };
}
