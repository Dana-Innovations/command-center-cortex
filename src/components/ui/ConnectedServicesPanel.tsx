"use client";

import { useState, useEffect, useCallback } from "react";

interface ServiceStatus {
  provider: string;
  label: string;
  description: string;
  connected: boolean;
  account_email?: string;
}

export function ConnectedServicesPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch("/api/connections");
      if (res.ok) {
        const data = await res.json();
        setServices(data.services ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchServices();
    }
  }, [open, fetchServices]);

  async function handleConnect(provider: string) {
    setConnecting(provider);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) return;
      const { authorization_url } = await res.json();
      if (authorization_url) {
        // Open in popup
        const popup = window.open(
          authorization_url,
          "cortex-connect",
          "width=600,height=700,popup=yes"
        );

        // Poll for completion
        const interval = setInterval(async () => {
          if (popup?.closed) {
            clearInterval(interval);
            setConnecting(null);
            fetchServices(); // Refresh status
          }
        }, 1000);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(interval);
          setConnecting(null);
        }, 300000);
      }
    } catch {
      // ignore
    } finally {
      if (!connecting) setConnecting(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-card max-w-lg w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-lg font-semibold text-text-heading">
            Connected Services
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-text-muted mb-4">
          Connect your accounts through Cortex to see your data in the
          dashboard.
        </p>

        {loading ? (
          <div className="text-center text-text-muted py-8">
            Loading services...
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((svc) => (
              <div
                key={svc.provider}
                className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02]"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        svc.connected ? "bg-accent-green" : "bg-text-muted/30"
                      }`}
                    />
                    <span className="text-sm font-medium text-text-primary">
                      {svc.label}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted ml-4">
                    {svc.connected
                      ? svc.account_email || "Connected"
                      : svc.description}
                  </p>
                </div>
                {!svc.connected && (
                  <button
                    onClick={() => handleConnect(svc.provider)}
                    disabled={connecting === svc.provider}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 text-text-primary transition-colors disabled:opacity-50"
                  >
                    {connecting === svc.provider
                      ? "Connecting..."
                      : "Connect"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-text-muted mt-4 text-center">
          Services are connected via your Cortex account. Data is scoped to your
          personal accounts.
        </p>
      </div>
    </div>
  );
}
