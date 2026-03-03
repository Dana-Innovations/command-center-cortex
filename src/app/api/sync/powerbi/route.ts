import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { executeDAXQuery } from "@/lib/powerbi/client";
import { CEO_KPI_QUERIES } from "@/lib/powerbi/dax-queries";

export async function POST(request: NextRequest) {
  try {
    const { kpis, reports } = await request.json();

    if (!kpis && !reports) {
      return NextResponse.json(
        { error: "Invalid payload: kpis and/or reports array required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const now = new Date().toISOString();
    let totalSynced = 0;

    if (kpis && Array.isArray(kpis)) {
      const rows = kpis.map((kpi: Record<string, unknown>) => ({
        ...kpi,
        synced_at: now,
      }));

      const { data, error } = await supabase
        .from("powerbi_kpis")
        .upsert(rows, { onConflict: "kpi_name,period" })
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      totalSynced += data.length;
    }

    if (reports && Array.isArray(reports)) {
      const rows = reports.map((rep: Record<string, unknown>) => ({
        ...rep,
        updated_at: now,
      }));

      const { data, error } = await supabase
        .from("powerbi_report_configs")
        .upsert(rows, { onConflict: "report_id" })
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      totalSynced += data.length;
    }

    await supabase.from("sync_log").insert({
      data_type: "powerbi",
      items_synced: totalSynced,
      status: "completed",
      started_at: now,
      completed_at: new Date().toISOString(),
    });

    return NextResponse.json({ synced: totalSynced, timestamp: now });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET: Pull KPIs directly from Power BI via DAX queries
export async function GET() {
  try {
    const workspaceId = process.env.POWERBI_WORKSPACE_ID;
    const datasetId = process.env.POWERBI_DATASET_ID;

    if (!workspaceId || !datasetId) {
      return NextResponse.json(
        { error: "POWERBI_WORKSPACE_ID and POWERBI_DATASET_ID must be set" },
        { status: 500 }
      );
    }

    const supabase = createServiceClient();
    const now = new Date().toISOString();
    let totalSynced = 0;

    for (const query of CEO_KPI_QUERIES) {
      try {
        const rows = await executeDAXQuery(workspaceId, datasetId, query.dax);
        const value = rows[0] ? Number(Object.values(rows[0])[0]) : null;

        const { error } = await supabase
          .from("powerbi_kpis")
          .upsert(
            {
              kpi_name: query.name,
              kpi_category: query.category,
              current_value: value,
              unit: query.unit,
              period: query.period,
              dataset_id: datasetId,
              dax_query: query.dax,
              raw_result: rows[0] ?? null,
              synced_at: now,
            },
            { onConflict: "kpi_name,period" }
          );

        if (!error) totalSynced++;
      } catch {
        // Log individual query failures but continue with the rest
        console.error(`Failed to sync KPI "${query.name}"`);
      }
    }

    await supabase.from("sync_log").insert({
      data_type: "powerbi",
      items_synced: totalSynced,
      status: "completed",
      started_at: now,
      completed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      synced: totalSynced,
      total: CEO_KPI_QUERIES.length,
      timestamp: now,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
