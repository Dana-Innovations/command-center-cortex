import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { listWorkspacesTool, listWorkspaces } from "./tools/list-workspaces.js";
import { listDatasetsTool, listDatasets } from "./tools/list-datasets.js";
import {
  getDatasetSchemaTool,
  getDatasetSchema,
} from "./tools/get-dataset-schema.js";
import {
  executeDaxQueryTool,
  executeDaxQuery,
} from "./tools/execute-dax-query.js";
import { listReportsTool, listReports } from "./tools/list-reports.js";
import {
  getReportDetailsTool,
  getReportDetails,
} from "./tools/get-report-details.js";

const server = new Server(
  { name: "powerbi-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// List all available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    listWorkspacesTool,
    listDatasetsTool,
    getDatasetSchemaTool,
    executeDaxQueryTool,
    listReportsTool,
    getReportDetailsTool,
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: string;

    switch (name) {
      case "list_workspaces":
        result = await listWorkspaces();
        break;

      case "list_datasets":
        result = await listDatasets(args!.workspace_id as string);
        break;

      case "get_dataset_schema":
        result = await getDatasetSchema(
          args!.workspace_id as string,
          args!.dataset_id as string
        );
        break;

      case "execute_dax_query":
        result = await executeDaxQuery(
          args!.workspace_id as string,
          args!.dataset_id as string,
          args!.dax_query as string
        );
        break;

      case "list_reports":
        result = await listReports(args!.workspace_id as string);
        break;

      case "get_report_details":
        result = await getReportDetails(
          args!.workspace_id as string,
          args!.report_id as string
        );
        break;

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }

    return { content: [{ type: "text", text: result }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
