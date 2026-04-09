import { createClient } from "@supabase/supabase-js";

// ── Vault Types ───────────────────────────────────────────────────────────

export interface VaultSearchResult {
  file_path: string;
  title: string;
  folder: string;
  tags: string[] | null;
  rank: number;
}

export interface VaultPerson {
  file_path: string;
  title: string;
  department: string | null;
  frontmatter: Record<string, unknown>;
  wikilinks: string[];
  backlinks: string[];
  contentSummary: string;
}

export interface VaultConnection {
  direction: "outgoing" | "incoming";
  connected_path: string;
  connected_title: string;
  connected_folder: string;
  connected_tags: string[] | null;
}

// ── Access Gating ─────────────────────────────────────────────────────────

export function hasVaultAccess(userEmail: string): boolean {
  return userEmail.toLowerCase() === "ari@sonance.com";
}

let _client: ReturnType<typeof createClient> | null = null;

/**
 * Read-only Supabase client for the Vault Graph project.
 * Used to fetch Writing Style Guide and other vault pages at draft time.
 *
 * Requires env vars:
 *   VAULT_SUPABASE_URL
 *   VAULT_SUPABASE_SERVICE_ROLE_KEY
 */
export function getVaultClient() {
  if (_client) return _client;

  const url = process.env.VAULT_SUPABASE_URL;
  const key = process.env.VAULT_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  _client = createClient(url, key);
  return _client;
}

/**
 * Fetch a vault page by title and folder.
 * Returns the page content string, or null if not found or vault not configured.
 */
export async function fetchVaultPage(
  title: string,
  folder: string
): Promise<string | null> {
  const client = getVaultClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from("vault_pages")
      .select("content")
      .eq("title", title)
      .eq("folder", folder)
      .single<{ content: string | null }>();

    if (error || !data?.content) return null;
    return data.content;
  } catch {
    return null;
  }
}
