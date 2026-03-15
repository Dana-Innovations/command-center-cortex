export interface CortexSessionUser {
  sub: string;
  name: string;
  email: string;
  picture?: string;
}

export function parseCortexUserFromCookieHeader(
  cookieHeader: string | null | undefined
) {
  const match = (cookieHeader || "").match(/(?:^|;\s*)cortex_user=([^;]+)/);
  if (!match) return null;

  try {
    const decoded = decodeURIComponent(match[1]);
    const parsed = JSON.parse(decoded) as Partial<CortexSessionUser>;
    if (!parsed.sub) return null;

    return {
      sub: parsed.sub,
      name: parsed.name || "",
      email: parsed.email || "",
      picture: parsed.picture,
    } satisfies CortexSessionUser;
  } catch {
    return null;
  }
}

export function getCortexUserFromRequest(request: Request) {
  return parseCortexUserFromCookieHeader(request.headers.get("cookie"));
}

