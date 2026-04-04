"use client";

interface InlineConnectBannerProps {
  service: string;
  onConnect?: () => void;
}

export function InlineConnectBanner({ service, onConnect }: InlineConnectBannerProps) {
  return (
    <div className="border border-[var(--bg-card-border)] rounded-lg px-4 py-2.5 flex items-center justify-between">
      <span className="text-text-muted text-sm">
        {service} not connected
      </span>
      {onConnect && (
        <button
          type="button"
          onClick={onConnect}
          className="text-text-muted text-sm underline underline-offset-2 hover:text-[var(--text-heading)] transition-colors"
        >
          Connect in Settings
        </button>
      )}
    </div>
  );
}
