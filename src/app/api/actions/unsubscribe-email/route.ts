import { NextRequest, NextResponse } from 'next/server';
import { getCortexToken, cortexInit, cortexCall } from '@/lib/cortex/client';

function parseListUnsubscribeUrl(headerValue: string): string | null {
  const matches = headerValue.match(/<(https?:\/\/[^>]+)>/gi);
  if (!matches) return null;
  const httpMatch = matches.find(m => m.toLowerCase().startsWith('<https') || m.toLowerCase().startsWith('<http'));
  if (!httpMatch) return null;
  return httpMatch.slice(1, -1);
}

function parseMailtoAddress(headerValue: string): string | null {
  const match = headerValue.match(/<mailto:([^>]+)>/i);
  if (!match) return null;
  return match[1];
}

export async function POST(request: NextRequest) {
  try {
    const cortexToken = getCortexToken(request);
    if (!cortexToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { messageId } = await request.json();
    if (!messageId) return NextResponse.json({ error: 'Missing messageId' }, { status: 400 });

    const sessionId = await cortexInit(cortexToken);

    // 1. Fetch the message to get List-Unsubscribe headers
    const msg = await cortexCall(cortexToken, sessionId, 'get-msg', 'm365__get_email', {
      message_id: messageId,
    });

    // Try to extract unsubscribe headers from the message
    const internetHeaders: { name: string; value: string }[] =
      (msg.internetMessageHeaders as { name: string; value: string }[]) || [];
    const unsubHeader = internetHeaders.find(
      (h: { name: string }) => h.name.toLowerCase() === 'list-unsubscribe'
    );
    const unsubPostHeader = internetHeaders.find(
      (h: { name: string }) => h.name.toLowerCase() === 'list-unsubscribe-post'
    );

    let unsubMethod = 'none';
    let unsubResult = '';

    if (unsubHeader) {
      const httpUrl = parseListUnsubscribeUrl(unsubHeader.value);
      const isOneClick = unsubPostHeader?.value?.toLowerCase().includes('list-unsubscribe=one-click');

      if (httpUrl && isOneClick) {
        // RFC 8058 one-click: POST with body
        try {
          const r = await fetch(httpUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'List-Unsubscribe=One-Click',
          });
          unsubMethod = 'one-click-post';
          unsubResult = `HTTP ${r.status}`;
        } catch (e) {
          unsubResult = `POST failed: ${e}`;
        }
      } else if (httpUrl) {
        // Standard HTTP GET unsubscribe link
        try {
          const r = await fetch(httpUrl, { method: 'GET', redirect: 'follow' });
          unsubMethod = 'http-get';
          unsubResult = `HTTP ${r.status}`;
        } catch (e) {
          unsubResult = `GET failed: ${e}`;
        }
      } else {
        // mailto: unsubscribe — send email via Cortex MCP
        const mailtoRaw = parseMailtoAddress(unsubHeader.value);
        if (mailtoRaw) {
          const [toAddress, queryString] = mailtoRaw.split('?');
          const subjectMatch = queryString?.match(/subject=([^&]+)/i);
          const subject = subjectMatch ? decodeURIComponent(subjectMatch[1]) : 'Unsubscribe';
          try {
            await cortexCall(cortexToken, sessionId, 'unsub-mailto', 'm365__send_email', {
              to: toAddress,
              subject,
              body: 'Unsubscribe',
              content_type: 'Text',
            });
            unsubMethod = 'mailto';
            unsubResult = `Sent to ${toAddress}`;
          } catch (e) {
            unsubResult = `mailto failed: ${e}`;
          }
        }
      }
    }

    // 2. Always delete the message regardless of unsubscribe result
    await cortexCall(cortexToken, sessionId, 'delete-msg', 'm365__delete_email', {
      message_id: messageId,
    });

    return NextResponse.json({ ok: true, method: unsubMethod, result: unsubResult });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
