'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Email } from '@/lib/types';

export function useEmails() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const supabase = createClient();

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('emails')
      .select('*')
      .order('received_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setEmails(data as Email[]);
      if (data && data.length > 0) {
        setLastSynced(data[0].synced_at);
      }
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchEmails();

    const channel = supabase
      .channel('emails-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'emails' },
        (payload) => {
          setEmails((prev) => [payload.new as Email, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'emails' },
        (payload) => {
          setEmails((prev) =>
            prev.map((e) => (e.id === (payload.new as Email).id ? (payload.new as Email) : e))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'emails' },
        (payload) => {
          setEmails((prev) => prev.filter((e) => e.id !== (payload.old as Email).id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEmails, supabase]);

  return { emails, loading, error, lastSynced };
}
