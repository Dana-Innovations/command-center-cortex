'use client';

import type { Chat } from '@/lib/types';

/** No Cortex source for Teams chats — returns empty for live mode */
export function useChats() {
  return {
    chats: [] as Chat[],
    loading: false,
    error: null,
    lastSynced: null,
  };
}
