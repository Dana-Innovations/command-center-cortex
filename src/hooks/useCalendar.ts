'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CalendarEvent } from '@/lib/types';

export function useCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const supabase = createClient();

  const fetchEvents = useCallback(async () => {
    setLoading(true);

    const now = new Date();
    const startOfDay = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error: fetchError } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .order('start_time', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setEvents(data as CalendarEvent[]);
      if (data && data.length > 0) {
        setLastSynced(data[0].synced_at);
      }
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchEvents();

    const channel = supabase
      .channel('calendar-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'calendar_events' },
        () => fetchEvents()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'calendar_events' },
        () => fetchEvents()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'calendar_events' },
        () => fetchEvents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEvents, supabase]);

  return { events, loading, error, lastSynced };
}
