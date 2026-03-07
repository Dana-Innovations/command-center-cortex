import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

function parseUserId(request: NextRequest): string {
  const raw = request.cookies.get("cortex_user")?.value;
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw) as { email?: string };
    return parsed.email ?? "";
  } catch {
    return "";
  }
}

function currentQuarter(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${q}`;
}

export async function GET(request: NextRequest) {
  const userId = parseUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const quarter =
    request.nextUrl.searchParams.get("quarter") || currentQuarter();

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("bookings_targets")
    .select("*")
    .eq("user_id", userId)
    .eq("quarter", quarter)
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ targets: data, quarter });
}

export async function POST(request: NextRequest) {
  const userId = parseUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: {
    quarter?: string;
    targets?: {
      segment: string;
      target_amount: number;
      color?: string;
      display_order?: number;
    }[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const quarter = body.quarter || currentQuarter();
  const targets = body.targets;

  if (!targets || !Array.isArray(targets) || targets.length === 0) {
    return NextResponse.json(
      { error: "targets array is required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Delete existing targets for this user+quarter, then insert fresh
  await supabase
    .from("bookings_targets")
    .delete()
    .eq("user_id", userId)
    .eq("quarter", quarter);

  const rows = targets.map((t, i) => ({
    user_id: userId,
    quarter,
    segment: t.segment,
    target_amount: t.target_amount,
    color: t.color || "bg-accent-teal",
    display_order: t.display_order ?? i,
  }));

  const { data, error } = await supabase
    .from("bookings_targets")
    .insert(rows)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ targets: data, quarter });
}
