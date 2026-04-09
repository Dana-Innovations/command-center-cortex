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
