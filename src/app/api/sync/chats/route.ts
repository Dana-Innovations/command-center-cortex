import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { chats, user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    if (!chats || !Array.isArray(chats)) {
      return NextResponse.json({ error: 'Invalid payload: chats array required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const now = new Date().toISOString();

    const rows = chats.map((chat: Record<string, unknown>) => ({
      ...chat,
      user_id,
      synced_at: now,
    }));

    const { data, error } = await supabase
      .from('chats')
      .upsert(rows, { onConflict: 'user_id,chat_id' })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from('sync_log').insert({
      data_type: 'chats',
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
