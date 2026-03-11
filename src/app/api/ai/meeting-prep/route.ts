import { NextRequest, NextResponse } from "next/server";
import { generateText, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

interface MeetingPrepRequest {
  subject: string;
  organizer: string;
  location: string;
  startTime: string;
  endTime: string;
  existingContext: {
    attendeeNames: string[];
    emailSubjects: string[];
    relatedOpps: Array<{
      name: string;
      account: string;
      amount: number;
      stage: string;
    }>;
    relatedTaskNames: string[];
  };
}

interface AIMeetingPrep {
  summary: string;
  attendeeInsights: Array<{
    name: string;
    role?: string;
    company?: string;
    insight: string;
  }>;
  companyInsights: Array<{
    company: string;
    insight: string;
  }>;
  talkingPoints: string[];
  risks: string[];
}

export async function POST(request: NextRequest) {
  let body: MeetingPrepRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { subject, organizer, location, startTime, endTime, existingContext } =
    body;

  if (!subject) {
    return NextResponse.json(
      { error: "Missing required field: subject" },
      { status: 400 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  // Build context summary from existing Cortex data
  const contextLines: string[] = [];
  if (existingContext?.attendeeNames?.length) {
    contextLines.push(
      `Known attendees: ${existingContext.attendeeNames.join(", ")}`
    );
  }
  if (existingContext?.emailSubjects?.length) {
    contextLines.push(
      `Recent email threads with attendees: ${existingContext.emailSubjects.join("; ")}`
    );
  }
  if (existingContext?.relatedOpps?.length) {
    const oppSummaries = existingContext.relatedOpps.map(
      (o) => `${o.name} (${o.account}, $${o.amount?.toLocaleString()}, ${o.stage})`
    );
    contextLines.push(
      `Related Salesforce opportunities: ${oppSummaries.join("; ")}`
    );
  }
  if (existingContext?.relatedTaskNames?.length) {
    contextLines.push(
      `Related open tasks: ${existingContext.relatedTaskNames.join("; ")}`
    );
  }

  const prompt = `You are an executive meeting prep researcher. Research and prepare a briefing for this meeting.

Meeting: ${subject}
When: ${startTime} – ${endTime}
Organizer: ${organizer || "Unknown"}
Location: ${location || "Not specified"}

${contextLines.length > 0 ? `Internal context from CRM and email:\n${contextLines.join("\n")}` : "No internal context available."}

Instructions:
1. Search the web for each attendee and their company to find their current role, recent news, and relevant background.
2. Search for any companies mentioned in the meeting subject or attendee affiliations for recent developments.
3. Based on ALL gathered context (internal CRM data + web research), generate:
   - A 2-3 sentence executive summary of what this meeting is likely about and how to approach it
   - Insights for each attendee (current role, company, relevant background)
   - Insights for each company involved (recent news, developments, market position)
   - 3-5 specific, actionable talking points
   - Any risks or sensitive topics to be aware of

Return your response as JSON matching this exact schema (no markdown, no code fences, just JSON):
{
  "summary": "string",
  "attendeeInsights": [{ "name": "string", "role": "string", "company": "string", "insight": "string" }],
  "companyInsights": [{ "company": "string", "insight": "string" }],
  "talkingPoints": ["string"],
  "risks": ["string"]
}`;

  try {
    const result = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      tools: {
        web_search: anthropic.tools.webSearch_20250305(),
      },
      system:
        "You are an executive meeting prep researcher. Use web search to find current information about attendees and companies. Always return valid JSON.",
      prompt,
      stopWhen: stepCountIs(8),
      maxOutputTokens: 3000,
    });

    const text = result.text.trim();
    if (!text) {
      return NextResponse.json(
        { error: "Empty response from AI" },
        { status: 502 }
      );
    }

    // Extract JSON — handle potential markdown code fences
    let jsonStr = text;
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }

    let parsed: AIMeetingPrep;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // Try to find JSON object in the response
      const objMatch = text.match(/\{[\s\S]*\}/);
      if (objMatch) {
        parsed = JSON.parse(objMatch[0]);
      } else {
        return NextResponse.json(
          {
            summary: text.slice(0, 500),
            attendeeInsights: [],
            companyInsights: [],
            talkingPoints: [],
            risks: [],
          },
          { status: 200 }
        );
      }
    }

    return NextResponse.json({
      summary: parsed.summary || "",
      attendeeInsights: parsed.attendeeInsights || [],
      companyInsights: parsed.companyInsights || [],
      talkingPoints: parsed.talkingPoints || [],
      risks: parsed.risks || [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("AI meeting prep error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
