import { NextRequest, NextResponse } from "next/server";
import { getCortexUserFromRequest } from "@/lib/cortex/user";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

const RuleSchema = z.object({
  rules: z.array(
    z.object({
      provider: z.string().nullable().describe("Service: outlook, asana, slack, teams, or null for cross-service"),
      entity_id: z.string().nullable().describe("Specific resource ID, or null for all resources in provider"),
      entity_name: z.string().nullable().describe("Human-readable name of the resource"),
      condition_type: z.enum(["topic", "sender", "keyword", "label", "mention"]),
      condition_value: z.string().describe("The value to match: topic keyword, sender name, etc."),
      override_tier: z.enum(["critical", "normal", "quiet", "muted"]),
    })
  ),
});

/**
 * POST /api/ai/parse-focus-rules — parse natural language into structured focus rules
 */
export async function POST(request: NextRequest) {
  const user = await getCortexUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { text, provider, resources } = (await request.json()) as {
    text: string;
    provider?: string;
    resources?: Array<{ id: string; name: string }>;
  };

  if (!text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const resourceContext = resources
    ? `\nAvailable resources for ${provider}:\n${resources.map((r) => `- "${r.name}" (id: ${r.id})`).join("\n")}`
    : "";

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-20250514"),
    schema: RuleSchema,
    prompt: `You are parsing natural language focus rules for a productivity app. The user is describing which communications are important or not important to them.

Parse the following text into structured rules. Each rule has:
- provider: which service (outlook, asana, slack, teams) or null for cross-service rules
- entity_id: specific resource ID if mentioned, or null
- entity_name: human name of the resource if mentioned
- condition_type: "topic" (subject/content match), "sender" (person match), "keyword" (substring), "label" (tag/category), or "mention" (user @mentioned)
- condition_value: the specific value to match
- override_tier: "critical" (important), "normal", "quiet" (background), or "muted" (hidden)

${provider ? `Context: The user is configuring ${provider}.` : "Context: The user is setting global cross-service rules."}${resourceContext}

User's text:
"${text}"

Extract all rules. If the user says something is "important" or should "rise", use "critical". If they say "background", "not important", or "quiet", use "quiet". If they say "ignore" or "mute", use "muted".`,
  });

  return NextResponse.json(object);
}
