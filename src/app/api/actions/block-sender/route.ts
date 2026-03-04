import { NextRequest, NextResponse } from 'next/server';
import { getCortexToken, cortexInit, cortexCall } from '@/lib/cortex/client';

export async function POST(request: NextRequest) {
  try {
    const cortexToken = getCortexToken(request);
    if (!cortexToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { fromEmail, fromName } = await request.json();
    if (!fromEmail) return NextResponse.json({ error: 'fromEmail required' }, { status: 400 });

    const sessionId = await cortexInit(cortexToken);

    // Cortex MCP does not have a direct mail-rules tool.
    // Best-effort: delete recent emails from this sender to simulate blocking,
    // and return a note that a full block requires Outlook rules.
    const listResult = await cortexCall(cortexToken, sessionId, 'list-from', 'm365__list_emails', {
      limit: 20,
      folder: 'inbox',
      filter: `from/emailAddress/address eq '${fromEmail}'`,
    });

    const emails: { id: string }[] = listResult.emails ?? listResult.value ?? [];
    let deleted = 0;
    for (const email of emails) {
      if (email.id) {
        await cortexCall(cortexToken, sessionId, `del-${deleted}`, 'm365__delete_email', {
          message_id: email.id,
        });
        deleted++;
      }
    }

    return NextResponse.json({
      ok: true,
      deleted,
      note: `Deleted ${deleted} email(s) from ${fromName || fromEmail}. For a permanent block, create a rule in Outlook settings.`,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
