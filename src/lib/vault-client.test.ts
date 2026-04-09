import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
            maybeSingle: vi.fn(),
          })),
          single: vi.fn(),
          maybeSingle: vi.fn(),
          ilike: vi.fn(() => ({
            single: vi.fn(),
            maybeSingle: vi.fn(),
          })),
          limit: vi.fn(() => ({
            then: vi.fn(),
          })),
        })),
        limit: vi.fn(),
      })),
      rpc: vi.fn(),
    })),
    rpc: vi.fn(),
  })),
}));

describe("searchVaultText", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("VAULT_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("VAULT_SUPABASE_SERVICE_ROLE_KEY", "test-key");
    vi.resetModules();
  });

  it("returns formatted search results", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const mockRpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: "uuid-1",
          file_path: "company/initiatives/studio-visit.md",
          title: "Studio Visit Capture",
          content: "Initiative about capturing studio visits...",
          folder: "company/initiatives",
          tags: ["sonance", "crm", "sales"],
          rank: 0.85,
        },
      ],
      error: null,
    });
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({ rpc: mockRpc, from: vi.fn() });

    const { searchVaultText } = await import("@/lib/vault-client");
    const results = await searchVaultText("studio visit");

    expect(mockRpc).toHaveBeenCalledWith("search_vault_text", {
      search_query: "studio visit",
      match_count: 10,
    });
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      file_path: "company/initiatives/studio-visit.md",
      title: "Studio Visit Capture",
      folder: "company/initiatives",
      tags: ["sonance", "crm", "sales"],
      rank: 0.85,
    });
  });

  it("returns empty array when vault is not configured", async () => {
    vi.stubEnv("VAULT_SUPABASE_URL", "");
    vi.stubEnv("VAULT_SUPABASE_SERVICE_ROLE_KEY", "");
    vi.resetModules();

    const { searchVaultText } = await import("@/lib/vault-client");
    const results = await searchVaultText("anything");
    expect(results).toEqual([]);
  });

  it("returns empty array on error", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: { message: "timeout" } });
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({ rpc: mockRpc, from: vi.fn() });

    const { searchVaultText } = await import("@/lib/vault-client");
    const results = await searchVaultText("test");
    expect(results).toEqual([]);
  });
});

describe("getVaultPerson", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("VAULT_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("VAULT_SUPABASE_SERVICE_ROLE_KEY", "test-key");
    vi.resetModules();
  });

  it("returns person data with department from frontmatter", async () => {
    const { createClient } = await import("@supabase/supabase-js");

    const mockRow = {
      file_path: "company/people/debbie-michelle.md",
      title: "Debbie Michelle",
      content: "Debbie leads the marketing department and is responsible for brand strategy. She reports to the CEO.",
      frontmatter: { type: "person", department: "Marketing", title: "Debbie Michelle", aliases: ["Debbie Michelle"] },
      tags: ["person", "marketing"],
      wikilinks: ["derick-dahl"],
      backlinks: ["company/intelligence/slt-monthly-2026-03/marketing.md"],
    };

    const mockSingle = vi.fn().mockResolvedValue({ data: mockRow, error: null });
    const mockIlike = vi.fn(() => ({ single: mockSingle }));
    const mockEq = vi.fn(() => ({ ilike: mockIlike }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom, rpc: vi.fn() });

    const { getVaultPerson } = await import("@/lib/vault-client");
    const person = await getVaultPerson("Debbie Michelle");

    expect(person).not.toBeNull();
    expect(person!.title).toBe("Debbie Michelle");
    expect(person!.department).toBe("Marketing");
    expect(person!.wikilinks).toEqual(["derick-dahl"]);
    expect(person!.contentSummary.length).toBeLessThanOrEqual(500);
  });

  it("returns null when vault is not configured", async () => {
    vi.stubEnv("VAULT_SUPABASE_URL", "");
    vi.stubEnv("VAULT_SUPABASE_SERVICE_ROLE_KEY", "");
    vi.resetModules();

    const { getVaultPerson } = await import("@/lib/vault-client");
    const person = await getVaultPerson("Anyone");
    expect(person).toBeNull();
  });
});

describe("getVaultConnections", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("VAULT_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("VAULT_SUPABASE_SERVICE_ROLE_KEY", "test-key");
    vi.resetModules();
  });

  it("returns connections from get_connections RPC", async () => {
    const { createClient } = await import("@supabase/supabase-js");

    const mockRpc = vi.fn().mockResolvedValue({
      data: [
        {
          direction: "outgoing",
          connected_path: "company/people/derick-dahl.md",
          connected_title: "Derick Dahl",
          connected_folder: "company/people",
          connected_tags: ["person", "executive"],
        },
        {
          direction: "incoming",
          connected_path: "company/intelligence/slt-monthly-2026-03/marketing.md",
          connected_title: "SLT Monthly — Marketing",
          connected_folder: "company/intelligence/slt-monthly-2026-03",
          connected_tags: ["intelligence", "marketing"],
        },
      ],
      error: null,
    });
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({ rpc: mockRpc, from: vi.fn() });

    const { getVaultConnections } = await import("@/lib/vault-client");
    const connections = await getVaultConnections("company/people/debbie-michelle.md");

    expect(mockRpc).toHaveBeenCalledWith("get_connections", {
      page_path: "company/people/debbie-michelle.md",
    });
    expect(connections).toHaveLength(2);
    expect(connections[0].direction).toBe("outgoing");
    expect(connections[1].connected_folder).toBe("company/intelligence/slt-monthly-2026-03");
  });

  it("returns empty array when vault is not configured", async () => {
    vi.stubEnv("VAULT_SUPABASE_URL", "");
    vi.stubEnv("VAULT_SUPABASE_SERVICE_ROLE_KEY", "");
    vi.resetModules();

    const { getVaultConnections } = await import("@/lib/vault-client");
    const connections = await getVaultConnections("company/people/anyone.md");
    expect(connections).toEqual([]);
  });
});

describe("hasVaultAccess", () => {
  it("returns true for ari@sonance.com", async () => {
    const { hasVaultAccess } = await import("@/lib/vault-client");
    expect(hasVaultAccess("ari@sonance.com")).toBe(true);
  });

  it("returns false for other emails", async () => {
    const { hasVaultAccess } = await import("@/lib/vault-client");
    expect(hasVaultAccess("someone@sonance.com")).toBe(false);
  });

  it("returns false for empty string", async () => {
    const { hasVaultAccess } = await import("@/lib/vault-client");
    expect(hasVaultAccess("")).toBe(false);
  });
});

describe("getVaultContext", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("VAULT_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("VAULT_SUPABASE_SERVICE_ROLE_KEY", "test-key");
    vi.resetModules();
  });

  it("builds formatted context string from people and connections", async () => {
    const { createClient } = await import("@supabase/supabase-js");

    const personRow = {
      file_path: "company/people/debbie-michelle.md",
      title: "Debbie Michelle",
      content: "Debbie leads marketing.",
      frontmatter: { type: "person", department: "Marketing" },
      tags: ["person", "marketing"],
      wikilinks: ["derick-dahl"],
      backlinks: [],
    };

    const connections = [
      {
        direction: "incoming",
        connected_path: "company/initiatives/marketing-summit.md",
        connected_title: "Marketing Summit",
        connected_folder: "company/initiatives",
        connected_tags: ["initiative", "marketing"],
      },
    ];

    // Mock both .from() chain (for getVaultPerson) and .rpc() (for getVaultConnections)
    const mockSingle = vi.fn().mockResolvedValue({ data: personRow, error: null });
    const mockIlike = vi.fn(() => ({ single: mockSingle }));
    const mockEq = vi.fn(() => ({ ilike: mockIlike }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    const mockRpc = vi.fn().mockResolvedValue({ data: connections, error: null });
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom, rpc: mockRpc });

    const { getVaultContext } = await import("@/lib/vault-client");
    const context = await getVaultContext(["Debbie Michelle"]);

    expect(context).not.toBeNull();
    expect(context).toContain("Debbie Michelle");
    expect(context).toContain("Marketing");
    expect(context).toContain("Marketing Summit");
    expect(context).toContain("Organizational Knowledge");
  });

  it("returns null when no people are found", async () => {
    const { createClient } = await import("@supabase/supabase-js");

    // getVaultPerson: primary lookup fails, alias fallback also fails
    const mockPrimarySingle = vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } });
    const mockAliasSingle = vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } });
    const mockLimit = vi.fn(() => ({ single: mockAliasSingle }));
    const mockContains = vi.fn(() => ({ limit: mockLimit }));
    const mockIlike = vi.fn(() => ({ single: mockPrimarySingle }));
    // The eq call needs to return an object with BOTH ilike (primary path) and contains (fallback path)
    const mockEq = vi.fn(() => ({ ilike: mockIlike, contains: mockContains }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom, rpc: vi.fn() });

    const { getVaultContext } = await import("@/lib/vault-client");
    const context = await getVaultContext(["Nobody Real"]);
    expect(context).toBeNull();
  });

  it("returns null when vault is not configured", async () => {
    vi.stubEnv("VAULT_SUPABASE_URL", "");
    vi.stubEnv("VAULT_SUPABASE_SERVICE_ROLE_KEY", "");
    vi.resetModules();

    const { getVaultContext } = await import("@/lib/vault-client");
    const context = await getVaultContext(["Anyone"]);
    expect(context).toBeNull();
  });

  it("truncates output to roughly 2000 tokens", async () => {
    const { createClient } = await import("@supabase/supabase-js");

    const longContent = "A".repeat(10000);
    const personRow = {
      file_path: "company/people/verbose-person.md",
      title: "Verbose Person",
      content: longContent,
      frontmatter: { type: "person", department: "Engineering" },
      tags: ["person"],
      wikilinks: [],
      backlinks: [],
    };

    const mockSingle = vi.fn().mockResolvedValue({ data: personRow, error: null });
    const mockIlike = vi.fn(() => ({ single: mockSingle }));
    const mockEq = vi.fn(() => ({ ilike: mockIlike }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom, rpc: mockRpc });

    const { getVaultContext } = await import("@/lib/vault-client");
    const context = await getVaultContext(["Verbose Person"]);

    expect(context).not.toBeNull();
    // ~2000 tokens ≈ ~8000 chars. Allow some headroom for the truncation marker.
    expect(context!.length).toBeLessThan(9000);
  });
});
