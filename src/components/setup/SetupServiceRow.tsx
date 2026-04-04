"use client";

import { Button } from "@/components/ui/button";
import type {
  ServiceDefinition,
  ServiceRowState,
  ServicePreference,
} from "@/lib/setup-flow";

interface SetupServiceRowProps {
  definition: ServiceDefinition;
  state: ServiceRowState;
  preference: ServicePreference | null;
  expanded: boolean;
  onConnect: () => void;
  onExpand: () => void;
  onCollapse: () => void;
  children?: React.ReactNode;
}

/* Brand-ish colors for the first-letter icon circle */
const SERVICE_COLORS: Record<string, string> = {
  m365: "bg-blue-500/20 text-blue-400",
  slack: "bg-purple-500/20 text-purple-400",
  asana: "bg-rose-500/20 text-rose-400",
  salesforce: "bg-cyan-500/20 text-cyan-400",
  powerbi: "bg-yellow-500/20 text-yellow-400",
  monday: "bg-orange-500/20 text-orange-400",
};

function ServiceIcon({
  definition,
  connected,
}: {
  definition: ServiceDefinition;
  connected: boolean;
}) {
  if (connected) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-green/10">
        <svg
          width={20}
          height={20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-accent-green"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }

  const colors = SERVICE_COLORS[definition.id] ?? "bg-white/10 text-text-body";
  const letter = definition.label.charAt(0).toUpperCase();

  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${colors}`}
    >
      {letter}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx={12}
        cy={12}
        r={10}
        stroke="currentColor"
        strokeWidth={3}
        strokeDasharray="60 30"
        strokeLinecap="round"
      />
    </svg>
  );
}

function deriveSummary(
  definition: ServiceDefinition,
  preference: ServicePreference | null
): string {
  if (!preference?.config) return "Connected";

  const config = preference.config;

  switch (definition.id) {
    case "m365":
      return "Configured";
    case "slack": {
      const channels = config.channels;
      if (Array.isArray(channels)) {
        return `${channels.length} channel${channels.length === 1 ? "" : "s"}`;
      }
      return "Connected";
    }
    case "asana": {
      const projects = config.projects;
      if (Array.isArray(projects)) {
        return `${projects.length} project${projects.length === 1 ? "" : "s"}`;
      }
      return "Connected";
    }
    default:
      return "Connected";
  }
}

export function SetupServiceRow({
  definition,
  state,
  preference,
  expanded,
  onConnect,
  onExpand,
  onCollapse,
  children,
}: SetupServiceRowProps) {
  const isConnected =
    state === "connected-configuring" || state === "configured";

  return (
    <div className="glass-card !p-0 transition-all duration-300">
      {/* Main row */}
      <div className="flex items-center gap-4 p-4">
        <ServiceIcon definition={definition} connected={isConnected} />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-heading">
            {definition.label}
          </p>
          <p className="text-xs text-text-muted">
            {state === "configured"
              ? deriveSummary(definition, preference)
              : definition.description}
          </p>
        </div>

        {/* Right-side action */}
        {state === "disconnected" && (
          <Button variant="primary" size="sm" onClick={onConnect}>
            Connect
          </Button>
        )}

        {state === "connecting" && (
          <Button variant="primary" size="sm" disabled>
            <Spinner />
            Connecting...
          </Button>
        )}

        {state === "connected-configuring" && !expanded && (
          <Button variant="ghost" size="sm" onClick={onExpand}>
            Configure
          </Button>
        )}

        {state === "connected-configuring" && expanded && (
          <button
            onClick={onCollapse}
            className="text-xs text-text-muted hover:text-text-body transition-colors"
          >
            Skip
          </button>
        )}

        {state === "configured" && (
          <button
            onClick={onExpand}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:text-text-body hover:bg-white/5 transition-colors"
            aria-label={`Edit ${definition.label} configuration`}
          >
            <svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
      </div>

      {/* Expanded config panel */}
      {expanded && isConnected && (
        <div className="border-t border-white/5">
          {children ?? (
            <div className="p-4 text-text-muted text-sm">
              Configuration coming soon...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
