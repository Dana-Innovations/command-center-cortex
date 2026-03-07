import { NextRequest, NextResponse } from "next/server";
import { getCortexToken, cortexInit, cortexCall } from "@/lib/cortex/client";

const WORKSPACE_ID = "05fd9b2f-5d90-443f-8927-ebc2a507c0d9";

interface DatasetInfo {
  id: string;
  name: string;
}

interface TableInfo {
  name: string;
  columns: { name: string; dataType: string }[];
}

/**
 * GET: Discover Power BI datasets, find bookings data, and return actuals by segment.
 *
 * Query params:
 *   ?quarter=2026-Q1  (optional, defaults to current quarter)
 *
 * Flow:
 * 1. List datasets in the workspace
 * 2. For each dataset, get tables and look for bookings-related columns
 * 3. Execute a DAX query to pull bookings grouped by vertical/segment
 */
export async function GET(request: NextRequest) {
  const cortexToken = getCortexToken(request);
  if (!cortexToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const quarterParam = request.nextUrl.searchParams.get("quarter");
  const quarter = quarterParam || currentQuarter();

  try {
    const sessionId = await cortexInit(cortexToken);

    // Step 1: List datasets
    const datasetsResult = await cortexCall(
      cortexToken,
      sessionId,
      "pbi_datasets",
      "powerbi__list_datasets",
      { workspace_id: WORKSPACE_ID }
    );

    const datasets: DatasetInfo[] = (datasetsResult?.datasets ?? []).map(
      (d: Record<string, unknown>) => ({
        id: d.id as string,
        name: d.name as string,
      })
    );

    if (datasets.length === 0) {
      return NextResponse.json({
        segments: [],
        quarter,
        message: "No Power BI datasets found in workspace",
        datasets: [],
      });
    }

    // Step 2: For each dataset, discover tables
    const discoveries = await Promise.allSettled(
      datasets.slice(0, 5).map(async (ds) => {
        const tablesResult = await cortexCall(
          cortexToken,
          sessionId,
          `pbi_tables_${ds.id}`,
          "powerbi__get_dataset_tables",
          { workspace_id: WORKSPACE_ID, dataset_id: ds.id }
        );

        const tables: TableInfo[] = (tablesResult?.tables ?? []).map(
          (t: Record<string, unknown>) => ({
            name: t.name as string,
            columns: ((t.columns ?? []) as Record<string, unknown>[]).map(
              (c) => ({
                name: c.name as string,
                dataType: (c.dataType as string) || "",
              })
            ),
          })
        );

        return { dataset: ds, tables };
      })
    );

    // Step 3: Find a table with bookings/revenue data
    // Look for tables with columns matching booking-related patterns
    const bookingKeywords = [
      "booking",
      "revenue",
      "order",
      "sales",
      "amount",
      "invoice",
    ];
    const segmentKeywords = [
      "vertical",
      "segment",
      "category",
      "channel",
      "market",
      "industry",
      "business_unit",
      "division",
    ];

    let bestMatch: {
      datasetId: string;
      datasetName: string;
      tableName: string;
      amountColumn: string;
      segmentColumn: string;
      dateColumn: string | null;
    } | null = null;

    for (const result of discoveries) {
      if (result.status !== "fulfilled") continue;
      const { dataset, tables } = result.value;

      for (const table of tables) {
        const colNames = table.columns.map((c) => c.name.toLowerCase());

        // Find an amount/value column
        const amountCol = table.columns.find((c) => {
          const lower = c.name.toLowerCase();
          return (
            bookingKeywords.some((k) => lower.includes(k)) ||
            lower === "amount" ||
            lower === "total" ||
            lower === "value"
          );
        });

        // Find a segment/vertical column
        const segmentCol = table.columns.find((c) => {
          const lower = c.name.toLowerCase();
          return segmentKeywords.some((k) => lower.includes(k));
        });

        // Find a date column
        const dateCol = table.columns.find((c) => {
          const lower = c.name.toLowerCase();
          return (
            lower.includes("date") ||
            lower.includes("period") ||
            lower.includes("quarter") ||
            c.dataType.toLowerCase().includes("date")
          );
        });

        if (amountCol && segmentCol) {
          bestMatch = {
            datasetId: dataset.id,
            datasetName: dataset.name,
            tableName: table.name,
            amountColumn: amountCol.name,
            segmentColumn: segmentCol.name,
            dateColumn: dateCol?.name ?? null,
          };
          break;
        }

        // Fallback: if we find an amount column but no explicit segment column,
        // check if there's any text/string column that could serve as a category
        if (amountCol && !segmentCol && !bestMatch) {
          const textCol = table.columns.find((c) => {
            const dt = c.dataType.toLowerCase();
            const lower = c.name.toLowerCase();
            return (
              (dt === "string" || dt === "text") &&
              !lower.includes("id") &&
              !lower.includes("date") &&
              !colNames.includes("amount")
            );
          });
          if (textCol) {
            bestMatch = {
              datasetId: dataset.id,
              datasetName: dataset.name,
              tableName: table.name,
              amountColumn: amountCol.name,
              segmentColumn: textCol.name,
              dateColumn: dateCol?.name ?? null,
            };
          }
        }
      }
      if (bestMatch) break;
    }

    if (!bestMatch) {
      // Return dataset/table info so the user can see what's available
      const availableTables = discoveries
        .filter(
          (r): r is PromiseFulfilledResult<{ dataset: DatasetInfo; tables: TableInfo[] }> =>
            r.status === "fulfilled"
        )
        .flatMap((r) =>
          r.value.tables.map((t) => ({
            dataset: r.value.dataset.name,
            table: t.name,
            columns: t.columns.map((c) => c.name),
          }))
        );

      return NextResponse.json({
        segments: [],
        quarter,
        message:
          "Could not auto-detect bookings table. Available tables listed below.",
        availableTables,
      });
    }

    // Step 4: Execute DAX query
    const { datasetId, datasetName, tableName, amountColumn, segmentColumn, dateColumn } =
      bestMatch;

    // Build DAX query — group by segment, sum amounts
    // If there's a date column, filter by quarter
    let daxQuery: string;
    if (dateColumn) {
      const { startDate, endDate } = quarterDates(quarter);
      daxQuery = `EVALUATE SUMMARIZECOLUMNS('${tableName}'[${segmentColumn}], "TotalAmount", SUM('${tableName}'[${amountColumn}]), FILTER('${tableName}', '${tableName}'[${dateColumn}] >= DATE(${startDate.getFullYear()}, ${startDate.getMonth() + 1}, ${startDate.getDate()}) && '${tableName}'[${dateColumn}] < DATE(${endDate.getFullYear()}, ${endDate.getMonth() + 1}, ${endDate.getDate()})))`;
    } else {
      daxQuery = `EVALUATE SUMMARIZECOLUMNS('${tableName}'[${segmentColumn}], "TotalAmount", SUM('${tableName}'[${amountColumn}]))`;
    }

    const daxResult = await cortexCall(
      cortexToken,
      sessionId,
      "pbi_dax",
      "powerbi__execute_dax",
      {
        workspace_id: WORKSPACE_ID,
        dataset_id: datasetId,
        dax_query: daxQuery,
      }
    );

    // Parse DAX result — typically returns { rows: [...] } or similar
    const rows: Record<string, unknown>[] =
      daxResult?.rows ?? daxResult?.results ?? daxResult?.data ?? [];

    const segments = rows
      .map((row) => {
        // DAX returns columns with table prefix like 'Table[Column]'
        const segmentValue =
          (row[`${tableName}[${segmentColumn}]`] as string) ??
          (row[segmentColumn] as string) ??
          (Object.values(row).find((v) => typeof v === "string") as string) ??
          "Unknown";

        const amountValue =
          (row["[TotalAmount]"] as number) ??
          (row["TotalAmount"] as number) ??
          (Object.values(row).find((v) => typeof v === "number") as number) ??
          0;

        return {
          name: String(segmentValue),
          amount: Number(amountValue) || 0,
        };
      })
      .filter((s) => s.name && s.name !== "Unknown")
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      segments,
      quarter,
      dataset_name: datasetName,
      table_name: tableName,
      columns_used: { segment: segmentColumn, amount: amountColumn, date: dateColumn },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function currentQuarter(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${q}`;
}

function quarterDates(quarter: string): { startDate: Date; endDate: Date } {
  const match = quarter.match(/^(\d{4})-Q([1-4])$/);
  if (!match) {
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    const startMonth = (q - 1) * 3;
    return {
      startDate: new Date(now.getFullYear(), startMonth, 1),
      endDate: new Date(now.getFullYear(), startMonth + 3, 1),
    };
  }

  const year = parseInt(match[1]);
  const q = parseInt(match[2]);
  const startMonth = (q - 1) * 3;
  return {
    startDate: new Date(year, startMonth, 1),
    endDate: new Date(year, startMonth + 3, 1),
  };
}
