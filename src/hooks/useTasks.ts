'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Task } from '@/lib/types';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const supabase = createClient();

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('completed', false)
      .order('days_overdue', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setTasks(data as Task[]);
      if (data && data.length > 0) {
        setLastSynced(data[0].synced_at);
      }
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tasks' },
        (payload) => {
          setTasks((prev) => [payload.new as Task, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tasks' },
        (payload) => {
          setTasks((prev) =>
            prev.map((t) => (t.id === (payload.new as Task).id ? (payload.new as Task) : t))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'tasks' },
        (payload) => {
          setTasks((prev) => prev.filter((t) => t.id !== (payload.old as Task).id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTasks, supabase]);

  return { tasks, loading, error, lastSynced };
}
