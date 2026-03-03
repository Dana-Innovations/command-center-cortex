import { powerbiRequest } from "../auth.js";

export const executeDaxQueryTool = {
  name: "execute_dax_query",
  description:
    "Execute a DAX query against a Power BI dataset and return the results. Use get_dataset_schema first to understand the available tables and measures.",
  inputSchema: {
    type: "object" as const,
    properties: {
      workspace_id: {
        type: "string",
        description: "The workspace (group) ID",
      },
      dataset_id: {
        type: "string",
        description: "The dataset ID to query",
      },
      dax_query: {
        type: "string",
        description:
          'The DAX query to execute. Must start with EVALUATE. Example: EVALUATE ROW("Revenue", [Total Revenue])',
      },
    },
    required: ["workspace_id", "dataset_id", "dax_query"],
  },
};

interface DaxResult {
  results: Array<{
    tables: Array<{
      rows: Array<Record<string, unknown>>;
    }>;
  }>;
}

export async function executeDaxQuery(
  workspaceId: string,
  datasetId: string,
  daxQuery: string
): Promise<string> {
  const result = (await powerbiRequest(
    `groups/${workspaceId}/datasets/${datasetId}/executeQueries`,
    {
      method: "POST",
      body: JSON.stringify({
        queries: [{ query: daxQuery }],
        serializerSettings: { includeNulls: true },
      }),
    }
  )) as DaxResult;

  const tables = result.results?.[0]?.tables;
  if (!tables || tables.length === 0) {
    return "Query returned no results.";
  }

  const rows = tables[0].rows;
  if (rows.length === 0) {
    return "Query returned an empty result set.";
  }

  // Format as a readable table
  const headers = Object.keys(rows[0]);
  const formatted = rows.map((row) =>
    headers.map((h) => `${h}: ${row[h]}`).join(", ")
  );

  return `Query returned ${rows.length} row(s):\n\n${formatted.join("\n")}`;
}
