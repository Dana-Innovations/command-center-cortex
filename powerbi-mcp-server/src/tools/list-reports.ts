import { powerbiRequest } from "../auth.js";

export const listReportsTool = {
  name: "list_reports",
  description:
    "List all reports in a Power BI workspace. Returns report IDs, names, embed URLs, and associated dataset IDs.",
  inputSchema: {
    type: "object" as const,
    properties: {
      workspace_id: {
        type: "string",
        description: "The workspace (group) ID",
      },
    },
    required: ["workspace_id"],
  },
};

export async function listReports(workspaceId: string): Promise<string> {
  const result = (await powerbiRequest(
    `groups/${workspaceId}/reports`
  )) as {
    value: Array<{
      id: string;
      name: string;
      embedUrl: string;
      datasetId: string;
      reportType: string;
    }>;
  };

  if (!result.value || result.value.length === 0) {
    return "No reports found in this workspace.";
  }

  const lines = result.value.map(
    (r) =>
      `- ${r.name} (ID: ${r.id}, Dataset: ${r.datasetId}, Type: ${r.reportType})`
  );

  return `Found ${result.value.length} report(s):\n${lines.join("\n")}`;
}
