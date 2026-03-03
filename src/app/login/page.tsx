"use client";

import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  not_allowed:
    "Your account is not authorized. Contact your admin for access.",
  auth_failed: "Authentication failed. Please try again.",
  no_code: "Invalid authentication response. Please try again.",
};

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const next = searchParams.get("next") ?? "/";

  async function handleSignIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        scopes: "openid profile email",
      },
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <div className="glass-card max-w-md w-full mx-4 p-8 text-center">
        <h1 className="font-display text-2xl font-semibold text-text-heading mb-2">
          Executive Command Center
        </h1>
        <p className="text-sm text-text-muted mb-8">
          Sign in with your Sonance Microsoft account
        </p>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-accent-red/10 border border-accent-red/20 text-sm text-accent-red">
            {ERROR_MESSAGES[error] || "An unexpected error occurred."}
          </div>
        )}

        <button
          onClick={handleSignIn}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-[#2F2F2F] hover:bg-[#3a3a3a] text-white font-medium transition-colors cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 21 21">
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
          Sign in with Microsoft
        </button>

        <p className="text-xs text-text-muted mt-6">
          Invite-only access. Contact your administrator if you need an account.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
          <div className="text-text-muted">Loading...</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
