import { NextRequest, NextResponse } from "next/server";
import { getCortexUserFromRequest } from "@/lib/cortex/user";
import { createServiceClient } from "@/lib/supabase/server";

const VALID_SERVICES = [
  "m365",
  "slack",
  "asana",
  "salesforce",
  "powerbi",
  "monday",
] as const;

type ValidService = (typeof VALID_SERVICES)[number];

function isValidService(value: unknown): value is ValidService {
  return (
    typeof value === "string" &&
    VALID_SERVICES.includes(value as ValidService)
  );
}

export async function GET(request: NextRequest) {
  const user = await getCortexUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("user_service_preferences")
      .select("*")
      .eq("cortex_user_id", user.sub);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ preferences: data ?? [] });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load service preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await getCortexUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      service?: unknown;
      config?: unknown;
    };

    if (!isValidService(body.service)) {
      return NextResponse.json(
        {
          error: `Invalid service. Must be one of: ${VALID_SERVICES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (!body.config || typeof body.config !== "object" || Array.isArray(body.config)) {
      return NextResponse.json(
        { error: "config must be a JSON object" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("user_service_preferences")
      .upsert(
        {
          cortex_user_id: user.sub,
          service: body.service,
          config: body.config,
          configured_at: new Date().toISOString(),
        },
        { onConflict: "cortex_user_id,service" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ preference: data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save service preference";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
