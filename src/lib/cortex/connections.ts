/**
 * Cortex MCP connection status — check which services a user has connected.
 */

const CORTEX_URL =
  process.env.NEXT_PUBLIC_CORTEX_URL || "https://cortex-bice.vercel.app";

export interface CortexConnection {
  provider: string;
  account_email?: string;
  connected: boolean;
}

/** Services the Command Center uses */
export const REQUIRED_SERVICES = [
  {
    provider: "microsoft",
    label: "Microsoft 365",
    description: "Email, Calendar, Teams",
  },
  { provider: "asana", label: "Asana", description: "Tasks & Projects" },
  { provider: "slack", label: "Slack", description: "Channel Messages" },
  {
    provider: "salesforce",
    label: "Salesforce",
    description: "Pipeline & CRM",
  },
  { provider: "monday", label: "Monday.com", description: "Manufacturing" },
  {
    provider: "powerbi",
    label: "Power BI",
    description: "Reports & Dashboards",
  },
] as const;

/**
 * Fetch the user's connected MCP services from Cortex.
 */
export async function getConnections(
  cortexToken: string
): Promise<CortexConnection[]> {
  try {
    const res = await fetch(`${CORTEX_URL}/api/v1/oauth/connections`, {
      headers: { Authorization: `Bearer ${cortexToken}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.connections ?? data ?? []) as CortexConnection[];
  } catch {
    return [];
  }
}

/**
 * Initiate an OAuth connect flow for a provider.
 * Returns the authorization URL to open in a popup.
 */
export async function initiateConnect(
  cortexToken: string,
  provider: string
): Promise<{ authorization_url: string; session_id: string } | null> {
  try {
    const res = await fetch(
      `${CORTEX_URL}/api/v1/oauth/connect/${provider}/initiate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cortexToken}`,
        },
      }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Poll for connect completion.
 */
export async function pollConnect(
  cortexToken: string,
  sessionId: string
): Promise<{ status: string; account_email?: string }> {
  try {
    const res = await fetch(
      `${CORTEX_URL}/api/v1/oauth/connect/poll/${sessionId}`,
      {
        headers: { Authorization: `Bearer ${cortexToken}` },
      }
    );
    if (!res.ok) return { status: "error" };
    return res.json();
  } catch {
    return { status: "error" };
  }
}
