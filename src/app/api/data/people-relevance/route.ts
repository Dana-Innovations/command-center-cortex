import { NextRequest, NextResponse } from "next/server";
import { getCortexUserFromRequest } from "@/lib/cortex/user";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const cortexUser = await getCortexUserFromRequest(request);
  if (!cortexUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("people_relevance_scores")
    .select("*")
    .eq("cortex_user_id", cortexUser.sub)
    .order("relevance_score", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ scores: [], computedAt: null });
  }

  const computedAt = data.length > 0 ? data[0].computed_at : null;

  return NextResponse.json({
    scores: data.map((row) => ({
      personKey: row.person_key,
      personName: row.person_name,
      personEmail: row.person_email,
      recencyScore: Number(row.recency_score),
      frequencyScore: Number(row.frequency_score),
      diversityScore: Number(row.diversity_score),
      bidirectionalityScore: Number(row.bidirectionality_score),
      trendScore: Number(row.trend_score),
      relevanceScore: Number(row.relevance_score),
      totalInteractions30d: row.total_interactions_30d,
      activeChannels: row.active_channels,
      lastInteractionAt: row.last_interaction_at,
    })),
    computedAt,
  });
}
