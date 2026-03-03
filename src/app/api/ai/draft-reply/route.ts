import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { NextResponse } from 'next/server';
import { WRITING_STYLE } from '@/lib/constants';

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { message, prompt, channel, sender, subject } = body;

  if (!message || !prompt || !channel || !sender || !subject) {
    return NextResponse.json({ error: 'Missing required fields: message, prompt, channel, sender, subject' }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const systemPrompt = `${WRITING_STYLE}

You are drafting a reply to a ${channel} message.
Subject: ${subject}
From: ${sender}

The user will provide the original message they received and their thoughts on how to reply. Draft a polished reply based on their instructions. Output ONLY the reply text — no subject line, no "Dear X" unless it fits naturally, no explanations.`;

  try {
    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Original message from ${sender}:\n"${message}"\n\nMy thoughts on the reply:\n${prompt}`,
        },
      ],
      maxOutputTokens: 500,
    });

    // Consume the stream to catch errors (auth, rate limit, etc.)
    // then return the full text. Short replies don't need chunked streaming.
    const text = await result.text;

    if (!text.trim()) {
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 502 });
    }

    return new Response(text, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err) {
    const message2 = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message2 }, { status: 500 });
  }
}
