import { powerbiRequest } from "../auth.js";

export const listWorkspacesTool = {
  name: "list_workspaces",
  description:
    "List all Power BI workspaces (groups) accessible to the service principal. Returns workspace IDs, names, and types.",
  inputSchema: {
    type: "object" as const,
    properties: {},
  },
};

export async function listWorkspaces(): Promise<string> {
  const result = (await powerbiRequest("groups")) as {
    value: Array<{ id: string; name: string; type: string; isReadOnly: boolean }>;
  };

  if (!result.value || result.value.length === 0) {
    return "No workspaces found. Verify the service principal has workspace access.";
  }

  const lines = result.value.map(
    (ws) => `- ${ws.name} (ID: ${ws.id}, Type: ${ws.type})`
  );

  return `Found ${result.value.length} workspace(s):\n${lines.join("\n")}`;
}
