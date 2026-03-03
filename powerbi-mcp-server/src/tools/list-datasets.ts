import { powerbiRequest } from "../auth.js";

export const listDatasetsTool = {
  name: "list_datasets",
  description:
    "List all datasets (semantic models) in a Power BI workspace. Returns dataset IDs, names, and configuration status.",
  inputSchema: {
    type: "object" as const,
    properties: {
      workspace_id: {
        type: "string",
        description: "The workspace (group) ID to list datasets from",
      },
    },
    required: ["workspace_id"],
  },
};

export async function listDatasets(workspaceId: string): Promise<string> {
  const result = (await powerbiRequest(
    `groups/${workspaceId}/datasets`
  )) as {
    value: Array<{
      id: string;
      name: string;
      configuredBy: string;
      isRefreshable: boolean;
      isEffectiveIdentityRequired: boolean;
    }>;
  };

  if (!result.value || result.value.length === 0) {
    return "No datasets found in this workspace.";
  }

  const lines = result.value.map(
    (ds) =>
      `- ${ds.name} (ID: ${ds.id}, Configured by: ${ds.configuredBy}, Refreshable: ${ds.isRefreshable})`
  );

  return `Found ${result.value.length} dataset(s):\n${lines.join("\n")}`;
}
