/**
 * Cortex MCP client — makes authenticated calls to Cortex MCP endpoints
 * on behalf of the logged-in user.
 */

const CORTEX_URL = process.env.NEXT_PUBLIC_CORTEX_URL!;

interface MCPResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: MCPResult;
  error?: { code: number; message: string };
}

/**
 * Call a Cortex MCP tool on behalf of the authenticated user.
 *
 * @param mcpName - The MCP service name (e.g., "m365", "asana", "slack")
 * @param toolName - The tool to call (e.g., "list_emails", "list_tasks")
 * @param args - Tool arguments
 * @param cortexToken - The user's Cortex access token
 * @returns Parsed JSON result from the tool, or null on error
 */
export async function callCortexMCP(
  mcpName: string,
  toolName: string,
  args: Record<string, unknown>,
  cortexToken: string
): Promise<unknown> {
  const res = await fetch(`${CORTEX_URL}/mcp/${mcpName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cortexToken}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
  });

  if (!res.ok) {
    console.error(
      `Cortex MCP error [${mcpName}/${toolName}]: ${res.status} ${res.statusText}`
    );
    return null;
  }

  const data: MCPResponse = await res.json();

  if (data.error) {
    console.error(
      `Cortex MCP error [${mcpName}/${toolName}]:`,
      data.error.message
    );
    return null;
  }

  // MCP results come as content array with text entries
  if (data.result?.content?.[0]?.text) {
    try {
      return JSON.parse(data.result.content[0].text);
    } catch {
      return data.result.content[0].text;
    }
  }

  return data.result;
}

/**
 * Extract the Cortex access token from the request.
 * Checks the x-cortex-token header (set by middleware) first,
 * then falls back to the cookie.
 */
export function getCortexToken(request: Request): string | null {
  // Middleware forwards the token via header
  const headerToken = request.headers.get("x-cortex-token");
  if (headerToken) return headerToken;

  // Fallback: read from cookie
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/cortex_access_token=([^;]+)/);
  return match ? match[1] : null;
}

// ─── Session-based Cortex MCP helpers ──────────────────────────────────────

/**
 * Initialize a Cortex MCP session and return the session ID.
 * Required before making cortexCall() requests.
 */
export async function cortexInit(token: string): Promise<string> {
  const res = await fetch(`${CORTEX_URL}/mcp/cortex`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "mcp-protocol-version": "2024-11-05",
      "x-cortex-client": "cortex-mcp-stdio",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "init",
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "command-center", version: "2.0.0" },
      },
    }),
  });
  const sessionId = res.headers.get("mcp-session-id");
  if (!sessionId) {
    const body = await res.text();
    throw new Error(
      `Cortex init failed — no session ID. Status: ${res.status}. Body: ${body.slice(0, 200)}`
    );
  }
  return sessionId;
}

/**
 * Call a Cortex MCP tool using a session.
 *
 * @param token - The user's Cortex access token
 * @param sessionId - Session ID from cortexInit()
 * @param id - Request ID (for JSON-RPC)
 * @param tool - The full tool name (e.g., "m365__send_email")
 * @param args - Tool arguments
 * @returns Parsed JSON result from the tool
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function cortexCall(
  token: string,
  sessionId: string,
  id: string,
  tool: string,
  args: Record<string, unknown>
): Promise<any> {
  const res = await fetch(`${CORTEX_URL}/mcp/cortex`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "mcp-protocol-version": "2024-11-05",
      "x-cortex-client": "cortex-mcp-stdio",
      "mcp-session-id": sessionId,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: { name: tool, arguments: args },
    }),
  });
  const data = (await res.json()) as {
    result?: { content?: { text?: string }[] };
  };
  const text = data?.result?.content?.[0]?.text ?? "{}";
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
