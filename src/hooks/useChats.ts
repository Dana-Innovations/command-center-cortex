'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Chat } from '@/lib/types';

export function useChats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const supabase = createClient();

  const fetchChats = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('chats')
      .select('*')
      .order('last_activity', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setChats(data as Chat[]);
      if (data && data.length > 0) {
        setLastSynced(data[0].synced_at);
      }
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchChats();

    const channel = supabase
      .channel('chats-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chats' },
        (payload) => {
          setChats((prev) => [payload.new as Chat, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chats' },
        (payload) => {
          setChats((prev) =>
            prev.map((c) => (c.id === (payload.new as Chat).id ? (payload.new as Chat) : c))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chats' },
        (payload) => {
          setChats((prev) => prev.filter((c) => c.id !== (payload.old as Chat).id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchChats, supabase]);

  return { chats, loading, error, lastSynced };
}
