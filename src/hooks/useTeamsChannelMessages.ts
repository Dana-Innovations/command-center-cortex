"use client";

import { useLiveData } from "@/lib/live-data-context";
import type { TeamsChannelMessage } from "@/lib/types";

export function useTeamsChannelMessages() {
  const { teamsChannelMessages, loading, error, fetchedAt } = useLiveData();
  return {
    messages: teamsChannelMessages as TeamsChannelMessage[],
    loading,
    error,
    lastSynced: fetchedAt?.toISOString() ?? null,
  };
}
