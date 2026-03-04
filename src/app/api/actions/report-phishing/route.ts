import { NextRequest, NextResponse } from 'next/server';
import { getCortexToken, cortexInit, cortexCall } from '@/lib/cortex/client';

export async function POST(request: NextRequest) {
  try {
    const cortexToken = getCortexToken(request);
    if (!cortexToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { messageId } = await request.json();
    if (!messageId) return NextResponse.json({ error: 'messageId required' }, { status: 400 });

    const sessionId = await cortexInit(cortexToken);

    // Cortex MCP doesn't have a "move to junk" tool directly.
    // Best-effort: delete the email (removes it from inbox).
    await cortexCall(cortexToken, sessionId, 'report-phish', 'm365__delete_email', {
      message_id: messageId,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
