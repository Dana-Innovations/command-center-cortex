'use client';

import { useLiveData } from '@/lib/live-data-context';

export function useChats() {
  const { chats, loading, error, fetchedAt } = useLiveData();
  return {
    chats,
    loading,
    error,
    lastSynced: fetchedAt?.toISOString() ?? null,
  };
}
