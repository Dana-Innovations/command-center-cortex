import { powerbiRequest } from "../auth.js";

export const getReportDetailsTool = {
  name: "get_report_details",
  description:
    "Get detailed information about a specific Power BI report, including its embed URL, dataset ID, and web URL.",
  inputSchema: {
    type: "object" as const,
    properties: {
      workspace_id: {
        type: "string",
        description: "The workspace (group) ID",
      },
      report_id: {
        type: "string",
        description: "The report ID to get details for",
      },
    },
    required: ["workspace_id", "report_id"],
  },
};

export async function getReportDetails(
  workspaceId: string,
  reportId: string
): Promise<string> {
  const result = (await powerbiRequest(
    `groups/${workspaceId}/reports/${reportId}`
  )) as {
    id: string;
    name: string;
    embedUrl: string;
    webUrl: string;
    datasetId: string;
    reportType: string;
  };

  return [
    `Report: ${result.name}`,
    `ID: ${result.id}`,
    `Type: ${result.reportType}`,
    `Dataset ID: ${result.datasetId}`,
    `Embed URL: ${result.embedUrl}`,
    `Web URL: ${result.webUrl}`,
  ].join("\n");
}
