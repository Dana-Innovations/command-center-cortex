import { NextRequest, NextResponse } from 'next/server';
import { getCortexToken, cortexInit, cortexCall } from '@/lib/cortex/client';

export async function GET(request: NextRequest) {
  try {
    const cortexToken = getCortexToken(request);
    if (!cortexToken) {
      return NextResponse.json({ emails: [], error: 'Not authenticated' }, { status: 401 });
    }

    const sessionId = await cortexInit(cortexToken);

    const result = await cortexCall(cortexToken, sessionId, 'hygiene', 'm365__list_emails', {
      limit: 60,
      folder: 'inbox',
    });

    const allEmails: Record<string, unknown>[] = result.emails ?? result.value ?? [];

    // Filter to "other" (non-focused) emails for hygiene analysis
    const msgs = allEmails.filter(
      (m) => m.inferenceClassification === 'other'
    );

    return NextResponse.json({
      emails: msgs.map((m) => {
        const from = m.from as { emailAddress?: { name?: string; address?: string } } | null;
        return {
          id: m.id,
          subject: m.subject || '(no subject)',
          from_name: from?.emailAddress?.name || '',
          from_email: from?.emailAddress?.address || '',
          received_at: m.receivedDateTime,
          is_read: m.isRead,
          preview: m.bodyPreview,
          outlook_url: m.webLink,
          internet_message_id: m.internetMessageId,
        };
      }),
    });
  } catch (e) {
    return NextResponse.json({ emails: [], error: String(e) });
  }
}
