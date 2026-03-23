import { NextRequest, NextResponse } from "next/server";
import { getCortexUserFromRequest } from "@/lib/cortex/user";
import { createServiceClient } from "@/lib/supabase/server";
import {
  buildBatchDossiers,
  serializeDossierForPrompt,
} from "@/lib/relationship-dossier";

export async function GET(request: NextRequest) {
  const user = await getCortexUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const names = request.nextUrl.searchParams.get("names");
  if (!names) {
    return NextResponse.json(
      { error: "Missing required param: names" },
      { status: 400 }
    );
  }

  const personNames = names
    .split(",")
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  if (personNames.length === 0) {
    return NextResponse.json({ dossiers: [] });
  }

  const supabase = createServiceClient();

  const dossiers = await buildBatchDossiers(
    supabase,
    user.sub,
    personNames
  );

  return NextResponse.json({
    dossiers: dossiers.map((d) => ({
      ...d,
      serialized: serializeDossierForPrompt(d),
    })),
  });
}
