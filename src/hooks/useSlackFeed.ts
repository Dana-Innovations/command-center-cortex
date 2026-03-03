'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SlackFeedMessage } from '@/lib/types';

const MAX_MESSAGES = 50;
const supabase = createClient();

export function useSlackFeed() {
  const [messages, setMessages] = useState<SlackFeedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('slack_feed')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(MAX_MESSAGES);

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setMessages(data as SlackFeedMessage[]);
      if (data && data.length > 0) {
        setLastSynced(data[0].synced_at);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('slack-feed-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'slack_feed' },
        (payload: { new: unknown }) => {
          setMessages((prev) => [payload.new as SlackFeedMessage, ...prev].slice(0, MAX_MESSAGES));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'slack_feed' },
        (payload: { new: unknown }) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === (payload.new as SlackFeedMessage).id
                ? (payload.new as SlackFeedMessage)
                : m
            )
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'slack_feed' },
        (payload: { old: unknown }) => {
          setMessages((prev) =>
            prev.filter((m) => m.id !== (payload.old as SlackFeedMessage).id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMessages]);

  return { messages, loading, error, lastSynced, refetch: fetchMessages };
}
