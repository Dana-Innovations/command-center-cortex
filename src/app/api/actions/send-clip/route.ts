import { NextRequest, NextResponse } from 'next/server';
import { getCortexToken, cortexInit, cortexCall } from '@/lib/cortex/client';

export async function POST(request: NextRequest) {
  try {
    const cortexToken = getCortexToken(request);
    if (!cortexToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { note, imageBase64, destination, reportUrl, reportName } = await request.json();
    if (!destination) return NextResponse.json({ error: 'No destination' }, { status: 400 });

    const sessionId = await cortexInit(cortexToken);

    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });

    // Build content parts
    const reportLinkText = reportUrl ? `\n\nOpen report: ${reportUrl}` : '';
    const screenshotNote = imageBase64 ? '\n\n[Screenshot attached inline]' : '';
    const plainContent = [
      note || '',
      screenshotNote,
      reportLinkText,
      `\n\n---\nSent from Sonance Command Center - ${timestamp}`,
    ].filter(Boolean).join('');

    if (destination.type === 'teams_chat') {
      // Send a message to an existing Teams chat via Cortex MCP
      await cortexCall(cortexToken, sessionId, 'teams-chat', 'm365__send_chat_message', {
        chat_id: destination.id,
        content: plainContent,
      });
      return NextResponse.json({ ok: true, to: destination.name });
    }

    if (destination.type === 'teams_person') {
      // Create a 1:1 chat and send a message
      const chatResult = await cortexCall(cortexToken, sessionId, 'create-chat', 'm365__create_chat', {
        member_emails: [destination.address],
      });
      const chatId = chatResult.id || chatResult.chatId;
      if (!chatId) {
        return NextResponse.json({ error: 'Could not create Teams chat' }, { status: 500 });
      }

      await cortexCall(cortexToken, sessionId, 'teams-dm', 'm365__send_chat_message', {
        chat_id: chatId,
        content: plainContent,
      });
      return NextResponse.json({ ok: true, to: destination.name });
    }

    if (destination.type === 'email') {
      const reportBtnHtml = reportUrl
        ? `<p style="margin:14px 0"><a href="${reportUrl}" style="display:inline-block;background:#d4a44c;color:#0d0d0d;padding:9px 18px;border-radius:6px;text-decoration:none;font-weight:700;font-size:13px">Open ${reportName || 'Report'}</a></p>`
        : '';

      const htmlBody = [
        `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;max-width:680px">`,
        note ? `<p style="font-size:15px;line-height:1.5;color:#1a1a1a">${note.replace(/\n/g, '<br>')}</p>` : '',
        imageBase64 ? `<p style="margin:16px 0"><img src="${imageBase64}" style="max-width:100%;border-radius:8px;border:1px solid #ddd;display:block" /></p>` : '',
        reportBtnHtml,
        `<hr style="border:none;border-top:1px solid #eee;margin:20px 0" />`,
        `<p style="color:#999;font-size:12px">Sent from Sonance Command Center - ${timestamp}</p>`,
        `</div>`,
      ].filter(Boolean).join('');

      await cortexCall(cortexToken, sessionId, 'send-clip-email', 'm365__send_email', {
        to: destination.address,
        subject: `${reportName || 'Command Center'} Clip - ${timestamp}`,
        body: htmlBody,
        content_type: 'HTML',
      });
      return NextResponse.json({ ok: true, drafted: false, sent: true, to: destination.address });
    }

    return NextResponse.json({ error: 'Unknown destination type' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
