import { ClientSecretCredential } from "@azure/identity";

const POWERBI_SCOPE = "https://analysis.windows.net/powerbi/api/.default";

let credential: ClientSecretCredential | null = null;

function getCredential(): ClientSecretCredential {
  if (!credential) {
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
      throw new Error(
        "Missing Azure credentials. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET."
      );
    }

    credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  }
  return credential;
}

export async function getAccessToken(): Promise<string> {
  const cred = getCredential();
  const token = await cred.getToken(POWERBI_SCOPE);
  return token.token;
}

export async function powerbiRequest(
  path: string,
  options: RequestInit = {}
): Promise<unknown> {
  const token = await getAccessToken();
  const url = `https://api.powerbi.com/v1.0/myorg/${path}`;

  const res = await fetch(url, {
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

  return res.json();
}
