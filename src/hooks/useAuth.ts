"use client";

import { useCallback } from "react";

/** Single-user demo — hardcoded identity for Ari Supran */
export function useAuth() {
  const user = {
    email: "ari@sonance.com",
    user_metadata: { full_name: "Ari Supran" },
  };

  const signOut = useCallback(() => {
    // No-op for demo
  }, []);

  return { user, loading: false, signOut };
}
