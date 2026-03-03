'use client';

import { useLiveData } from '@/lib/live-data-context';

export function useEmails() {
  const { emails, loading, error, fetchedAt } = useLiveData();
  return {
    emails,
    loading,
    error,
    lastSynced: fetchedAt?.toISOString() ?? null,
  };
}
