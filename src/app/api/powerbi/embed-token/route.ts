import { NextRequest, NextResponse } from "next/server";
import { generateEmbedToken } from "@/lib/powerbi/client";

export async function POST(request: NextRequest) {
  try {
    const { reportId, datasetIds, workspaceId } = await request.json();

    if (!reportId || !workspaceId) {
      return NextResponse.json(
        { error: "reportId and workspaceId are required" },
        { status: 400 }
      );
    }

    const result = await generateEmbedToken(
      reportId,
      datasetIds || [],
      workspaceId
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
