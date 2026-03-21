"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type EmptyStateVariant = "no-connection" | "all-clear" | "no-results" | "error";

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  service?: string;
  context?: string;
  filterActive?: boolean;
  onConnect?: () => void;
  onClearFilter?: () => void;
  onRetry?: () => void;
  className?: string;
}

const icons: Record<EmptyStateVariant, React.ReactNode> = {
  "no-connection": (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-amber">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  "all-clear": (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-green">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  "no-results": (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  error: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-red">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  ),
};

const headings: Record<EmptyStateVariant, (props: EmptyStateProps) => string> = {
  "no-connection": (p) => `Connect ${p.service || "a service"} to see your ${p.context || "data"}`,
  "all-clear": () => "All caught up",
  "no-results": () => "No results for this filter",
  error: (p) => `Couldn't load ${p.context || "data"}`,
};

const descriptions: Record<EmptyStateVariant, (props: EmptyStateProps) => string> = {
  "no-connection": (p) =>
    `Once connected, your ${p.context || "data"} will appear here automatically.`,
  "all-clear": (p) =>
    `No ${p.context || "items"} need attention right now.`,
  "no-results": () =>
    "Try adjusting your filters or search terms.",
  error: () =>
    "Check your connection and try again.",
};

export function EmptyState({
  variant = "all-clear",
  service,
  context,
  onConnect,
  onClearFilter,
  onRetry,
  className,
}: EmptyStateProps) {
  const props = { variant, service, context } as EmptyStateProps;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04]">
        {icons[variant]}
      </div>
      <p className="text-sm font-medium text-text-heading">
        {headings[variant](props)}
      </p>
      <p className="mt-1.5 max-w-xs text-xs text-text-muted">
        {descriptions[variant](props)}
      </p>

      {variant === "no-connection" && onConnect && (
        <Button variant="primary" size="sm" className="mt-4" onClick={onConnect}>
          Connect {service}
        </Button>
      )}
      {variant === "no-results" && onClearFilter && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onClearFilter}>
          Clear filters
        </Button>
      )}
      {variant === "error" && onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
