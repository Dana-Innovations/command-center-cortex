import { getAccessToken } from "./auth";

const BASE_URL = "https://api.powerbi.com/v1.0/myorg";

async function pbiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();

  const res = await fetch(`${BASE_URL}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Power BI API ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// Execute a DAX query against a dataset
export async function executeDAXQuery(
  workspaceId: string,
  datasetId: string,
  daxQuery: string
): Promise<Record<string, unknown>[]> {
  const result = await pbiRequest<{
    results: Array<{ tables: Array<{ rows: Record<string, unknown>[] }> }>;
  }>(`groups/${workspaceId}/datasets/${datasetId}/executeQueries`, {
    method: "POST",
    body: JSON.stringify({
      queries: [{ query: daxQuery }],
      serializerSettings: { includeNulls: true },
    }),
  });

  return result.results?.[0]?.tables?.[0]?.rows ?? [];
}

// Generate an embed token for a report
export async function generateEmbedToken(
  reportId: string,
  datasetIds: string[],
  workspaceId: string
): Promise<{ token: string; expiration: string; embedUrl: string }> {
  // First get the report to obtain embedUrl
  const report = await pbiRequest<{ embedUrl: string }>(
    `groups/${workspaceId}/reports/${reportId}`
  );

  // Generate embed token
  const tokenResult = await pbiRequest<{ token: string; expiration: string }>(
    "GenerateToken",
    {
      method: "POST",
      body: JSON.stringify({
        datasets: datasetIds.map((id) => ({ id })),
        reports: [{ id: reportId }],
        targetWorkspaces: [{ id: workspaceId }],
      }),
    }
  );

  return {
    token: tokenResult.token,
    expiration: tokenResult.expiration,
    embedUrl: report.embedUrl,
  };
}

// List reports in a workspace
export async function listReports(
  workspaceId: string
): Promise<Array<{ id: string; name: string; embedUrl: string; datasetId: string }>> {
  const result = await pbiRequest<{
    value: Array<{ id: string; name: string; embedUrl: string; datasetId: string }>;
  }>(`groups/${workspaceId}/reports`);

  return result.value ?? [];
}
