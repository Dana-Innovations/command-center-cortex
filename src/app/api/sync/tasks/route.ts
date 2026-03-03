import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { tasks, user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    if (!tasks || !Array.isArray(tasks)) {
      return NextResponse.json({ error: 'Invalid payload: tasks array required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const now = new Date().toISOString();

    const rows = tasks.map((task: Record<string, unknown>) => ({
      ...task,
      user_id,
      synced_at: now,
    }));

    const { data, error } = await supabase
      .from('tasks')
      .upsert(rows, { onConflict: 'user_id,task_gid' })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from('sync_log').insert({
      data_type: 'tasks',
      items_synced: data.length,
      status: 'completed',
      user_id,
      started_at: now,
      completed_at: new Date().toISOString(),
    });

    return NextResponse.json({ synced: data.length, timestamp: now });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
