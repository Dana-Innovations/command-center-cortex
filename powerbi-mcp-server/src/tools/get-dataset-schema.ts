import { powerbiRequest } from "../auth.js";

export const getDatasetSchemaTool = {
  name: "get_dataset_schema",
  description:
    "Get the schema (tables, columns, measures) of a Power BI dataset. Useful for understanding the data model before writing DAX queries.",
  inputSchema: {
    type: "object" as const,
    properties: {
      workspace_id: {
        type: "string",
        description: "The workspace (group) ID",
      },
      dataset_id: {
        type: "string",
        description: "The dataset ID to inspect",
      },
    },
    required: ["workspace_id", "dataset_id"],
  },
};

interface Column {
  name: string;
  dataType: string;
  isHidden: boolean;
}

interface Measure {
  name: string;
  expression: string;
  isHidden: boolean;
}

interface Table {
  name: string;
  columns: Column[];
  measures: Measure[];
  isHidden: boolean;
}

export async function getDatasetSchema(
  workspaceId: string,
  datasetId: string
): Promise<string> {
  const result = (await powerbiRequest(
    `groups/${workspaceId}/datasets/${datasetId}`
  )) as { name: string };

  const tablesResult = (await powerbiRequest(
    `groups/${workspaceId}/datasets/${datasetId}/tables`
  )) as { value: Table[] };

  const tables = tablesResult.value || [];

  if (tables.length === 0) {
    return `Dataset "${result.name}" has no tables exposed via the REST API.`;
  }

  const output = tables.map((table) => {
    const cols = (table.columns || [])
      .filter((c) => !c.isHidden)
      .map((c) => `    - ${c.name} (${c.dataType})`)
      .join("\n");

    const measures = (table.measures || [])
      .filter((m) => !m.isHidden)
      .map((m) => `    - [Measure] ${m.name}: ${m.expression}`)
      .join("\n");

    return `Table: ${table.name}${table.isHidden ? " (hidden)" : ""}\n  Columns:\n${cols || "    (none)"}${measures ? `\n  Measures:\n${measures}` : ""}`;
  });

  return `Dataset: ${result.name}\n\n${output.join("\n\n")}`;
}
