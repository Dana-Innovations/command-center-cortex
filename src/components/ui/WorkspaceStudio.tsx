"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAttention } from "@/lib/attention/client";
import type {
  AttentionFeedbackValue,
  FocusNode,
  ImportanceTier,
} from "@/lib/attention/types";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "connections", label: "Connections" },
  { id: "focus", label: "Focus" },
  { id: "advanced", label: "Advanced learning" },
] as const;

const IMPORTANCE_OPTIONS: Array<{
  value: ImportanceTier;
  label: string;
  short: string;
}> = [
  { value: "critical", label: "Critical", short: "High" },
  { value: "normal", label: "Normal", short: "Norm" },
  { value: "quiet", label: "Quiet", short: "Quiet" },
  { value: "muted", label: "Muted", short: "Mute" },
];

const FEEDBACK_LABELS: Record<AttentionFeedbackValue, string> = {
  raise: "Raised before",
  right: "Held at the right level",
  lower: "Lowered before",
};

function filterNodes(nodes: FocusNode[], query: string): FocusNode[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return nodes;

  return nodes
    .map((node) => ({
      ...node,
      children: filterNodes(node.children ?? [], trimmed),
    }))
    .filter((node) => {
      const text = `${node.label} ${node.description ?? ""}`.toLowerCase();
      return (
        text.includes(trimmed) || Boolean(node.children && node.children.length > 0)
      );
    });
}

function FocusTierControl({
  value,
  inheritedValue,
  onChange,
  disabled,
}: {
  value: ImportanceTier;
  inheritedValue: ImportanceTier;
  onChange: (next: ImportanceTier) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex rounded-2xl border border-[var(--bg-card-border)] bg-black/10 p-1">
      {IMPORTANCE_OPTIONS.map((option) => {
        const active = option.value === value;
        const inherited = !active && option.value === inheritedValue;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-xl px-2.5 py-1.5 text-[11px] font-medium transition-colors",
              active
                ? "bg-[var(--tab-active-bg)] text-[var(--text-heading)]"
                : inherited
                  ? "text-accent-amber"
                  : "text-text-muted hover:text-text-body"
            )}
            title={option.label}
          >
            {option.short}
          </button>
        );
      })}
    </div>
  );
}

function FocusTree({
  nodes,
  depth = 0,
  pendingNodeId,
  onSelectNode,
  onChangeImportance,
}: {
  nodes: FocusNode[];
  depth?: number;
  pendingNodeId: string | null;
  onSelectNode: (node: FocusNode) => void;
  onChangeImportance: (node: FocusNode, next: ImportanceTier) => void;
}) {
  return (
    <div className="space-y-2">
      {nodes.map((node) => {
        const countParts = [
          node.counts?.unread ? `${node.counts.unread} unread` : null,
          node.counts?.total ? `${node.counts.total} items` : null,
          node.counts?.children ? `${node.counts.children} children` : null,
        ].filter(Boolean);

        return (
          <div key={node.id} className="space-y-2">
            <div
              className="rounded-2xl border border-[var(--bg-card-border)] bg-black/10 px-3 py-3"
              style={{ marginLeft: depth * 12 }}
            >
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <button
                  type="button"
                  onClick={() => onSelectNode(node)}
                  className="min-w-0 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-heading">
                      {node.label}
                    </span>
                    {node.lazy && (!node.children || node.children.length === 0) && (
                      <span className="rounded-full border border-accent-amber/20 bg-accent-amber/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-accent-amber">
                        Load
                      </span>
                    )}
                  </div>
                  {(node.description || countParts.length > 0) && (
                    <div className="mt-1 text-xs text-text-muted">
                      {[node.description, ...countParts].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </button>
                <FocusTierControl
                  value={node.importance}
                  inheritedValue={node.inheritedImportance}
                  disabled={pendingNodeId === node.id}
                  onChange={(next) => onChangeImportance(node, next)}
                />
              </div>
            </div>
            {node.children && node.children.length > 0 && (
              <FocusTree
                nodes={node.children}
                depth={depth + 1}
                pendingNodeId={pendingNodeId}
                onSelectNode={onSelectNode}
                onChangeImportance={onChangeImportance}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface SetupFocusViewProps {
  onBack?: () => void;
}

export function SetupFocusView({ onBack }: SetupFocusViewProps) {
  const {
    profile,
    focusProviders,
    services,
    profileLoading,
    focusMapLoading,
    servicesLoading,
    setupTab,
    setSetupTab,
    refreshServices,
    ensureTeamChannels,
    setNodeImportance,
    completeOnboarding,
  } = useAttention();
  const [search, setSearch] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [pendingNodeId, setPendingNodeId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProvider && focusProviders.length > 0) {
      setSelectedProvider(focusProviders[0].provider);
    }
  }, [focusProviders, selectedProvider]);

  const providerNode = useMemo(
    () =>
      focusProviders.find((provider) => provider.provider === selectedProvider) ??
      focusProviders[0] ??
      null,
    [focusProviders, selectedProvider]
  );

  const filteredNodes = useMemo(
    () => filterNodes(providerNode?.children ?? [], search),
    [providerNode, search]
  );

  const preview = useMemo(() => {
    const records = profile?.focusPreferences ?? [];
    return {
      rise: records.filter((record) => record.importance === "critical").slice(0, 8),
      fade: records
        .filter(
          (record) => record.importance === "quiet" || record.importance === "muted"
        )
        .slice(0, 8),
    };
  }, [profile]);

  const feedbackStats = useMemo(() => {
    const feedback = profile?.feedback ?? [];
    return {
      raise: feedback.filter((item) => item.feedback === "raise").slice(0, 8),
      right: feedback.filter((item) => item.feedback === "right").slice(0, 8),
      lower: feedback.filter((item) => item.feedback === "lower").slice(0, 8),
      biases: (profile?.biases ?? []).slice(0, 10),
    };
  }, [profile]);

  const handleConnect = useCallback(
    async (provider: string) => {
      setConnecting(provider);
      try {
        const response = await fetch("/api/connections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider }),
        });
        if (!response.ok) return;
        const data = (await response.json()) as { authorization_url?: string };
        if (!data.authorization_url) return;

        const popup = window.open(
          data.authorization_url,
          "cortex-connect",
          "width=640,height=760,popup=yes"
        );

        const interval = window.setInterval(async () => {
          if (popup?.closed) {
            window.clearInterval(interval);
            setConnecting(null);
            await refreshServices();
          }
        }, 1200);

        window.setTimeout(() => {
          window.clearInterval(interval);
          setConnecting(null);
        }, 300000);
      } catch {
        setConnecting(null);
      }
    },
    [refreshServices]
  );

  const handleSelectNode = useCallback(
    async (node: FocusNode) => {
      if (node.provider === "teams" && node.entityType === "teams_team" && node.lazy) {
        await ensureTeamChannels(node.entityId);
      }
    },
    [ensureTeamChannels]
  );

  const handleChangeImportance = useCallback(
    async (node: FocusNode, importance: ImportanceTier) => {
      setPendingNodeId(node.id);
      try {
        await setNodeImportance(node, importance);
      } finally {
        setPendingNodeId(null);
      }
    },
    [setNodeImportance]
  );

  const connectedCount = services.filter((service) => service.connected).length;

  return (
    <div className="space-y-5">
      <section className="glass-card anim-card overflow-hidden" style={{ animationDelay: "60ms" }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,163,225,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(0,178,169,0.12),transparent_32%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="text-[11px] uppercase tracking-[0.28em] text-accent-amber">
              Setup & Focus
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-text-heading">
              Shape what rises, fades, and gets your attention first.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
              Connect the systems you care about, set structural focus once, and
              let lightweight learning fine-tune the queue over time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onBack && (
              <Button variant="secondary" size="sm" onClick={onBack}>
                Back to Home
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={() => void completeOnboarding()}>
              Finish setup
            </Button>
          </div>
        </div>

        <div className="relative mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--bg-card-border)] bg-black/10 p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-text-muted">
              Step 1
            </div>
            <div className="mt-2 text-lg font-semibold text-text-heading">
              Connect your systems
            </div>
            <p className="mt-2 text-sm text-text-muted">
              {connectedCount} of {services.length} services connected.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--bg-card-border)] bg-black/10 p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-text-muted">
              Step 2
            </div>
            <div className="mt-2 text-lg font-semibold text-text-heading">
              Define focus
            </div>
            <p className="mt-2 text-sm text-text-muted">
              {(profile?.focusPreferences ?? []).length} structural focus rule
              {(profile?.focusPreferences ?? []).length === 1 ? "" : "s"} saved.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--bg-card-border)] bg-black/10 p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-text-muted">
              Step 3
            </div>
            <div className="mt-2 text-lg font-semibold text-text-heading">
              Review learning
            </div>
            <p className="mt-2 text-sm text-text-muted">
              Feedback stays conservative and never overrides explicit focus.
            </p>
          </div>
        </div>
      </section>

      <section className="glass-card anim-card overflow-hidden" style={{ animationDelay: "120ms" }}>
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--bg-card-border)] pb-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSetupTab(tab.id)}
              className={cn(
                "rounded-2xl px-4 py-2 text-sm font-medium transition-colors",
                setupTab === tab.id
                  ? "bg-[var(--tab-active-bg)] text-text-heading"
                  : "text-text-muted hover:text-text-body"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {setupTab === "connections" && (
          <div className="grid gap-5 pt-5 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[24px] border border-[var(--bg-card-border)] bg-black/10 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-text-heading">
                    Connected services
                  </h2>
                  <p className="mt-1 text-sm text-text-muted">
                    Connect the sources that should appear in the command center.
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => void refreshServices()}>
                  Refresh
                </Button>
              </div>

              <div className="mt-5 space-y-3">
                {(servicesLoading ? [] : services).map((service) => (
                  <div
                    key={service.provider}
                    className="flex items-center justify-between rounded-2xl border border-[var(--bg-card-border)] bg-white/[0.03] p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            service.connected ? "bg-accent-green" : "bg-text-muted/40"
                          )}
                        />
                        <span className="text-sm font-medium text-text-heading">
                          {service.label}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-text-muted">
                        {service.connected
                          ? service.account_email || "Connected"
                          : service.description}
                      </div>
                    </div>
                    {!service.connected && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={connecting === service.provider}
                        onClick={() => void handleConnect(service.provider)}
                      >
                        {connecting === service.provider ? "Connecting..." : "Connect"}
                      </Button>
                    )}
                  </div>
                ))}
                {servicesLoading && (
                  <div className="rounded-2xl border border-[var(--bg-card-border)] bg-white/[0.03] p-5 text-sm text-text-muted">
                    Loading connected services...
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[24px] border border-[var(--bg-card-border)] bg-black/10 p-5">
              <h2 className="text-lg font-semibold text-text-heading">
                What happens next
              </h2>
              <div className="mt-4 space-y-4 text-sm text-text-muted">
                <div className="rounded-2xl border border-[var(--bg-card-border)] bg-white/[0.03] p-4">
                  Once connected, those sources become available across Home and the
                  domain tabs.
                </div>
                <div className="rounded-2xl border border-[var(--bg-card-border)] bg-white/[0.03] p-4">
                  Focus rules tell the system which folders, projects, calendars,
                  and channels deserve structural priority.
                </div>
                <div className="rounded-2xl border border-[var(--bg-card-border)] bg-white/[0.03] p-4">
                  Learning only trims the edges. Your explicit focus rules remain the
                  steering wheel.
                </div>
              </div>
            </section>
          </div>
        )}

        {setupTab === "focus" && (
          <div className="grid gap-5 overflow-hidden pt-5 xl:grid-cols-[250px_minmax(0,1fr)_300px]">
            <section className="overflow-y-auto rounded-[24px] border border-[var(--bg-card-border)] bg-black/10 p-4">
              <div className="mb-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-text-muted">
                  Providers
                </div>
                <p className="mt-1 text-sm text-text-muted">
                  Start broad, then drill into the specific resources that matter.
                </p>
              </div>
              <div className="space-y-2">
                {focusProviders.map((provider) => {
                  const explicitCount = (profile?.focusPreferences ?? []).filter(
                    (entry) => entry.provider === provider.provider
                  ).length;
                  return (
                    <button
                      key={provider.provider}
                      type="button"
                      onClick={() => setSelectedProvider(provider.provider)}
                      className={cn(
                        "w-full rounded-2xl border px-3 py-3 text-left transition-colors",
                        provider.provider === providerNode?.provider
                          ? "border-accent-amber/40 bg-[var(--tab-active-bg)]"
                          : "border-[var(--bg-card-border)] bg-white/[0.03] hover:bg-white/[0.06]"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-text-heading">
                          {provider.label}
                        </span>
                        <span className="text-[10px] uppercase tracking-[0.18em] text-text-muted">
                          {provider.importance}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-text-muted">
                        {explicitCount > 0
                          ? `${explicitCount} saved focus rules`
                          : provider.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-[var(--bg-card-border)] bg-black/10">
              <div className="border-b border-[var(--bg-card-border)] px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-text-heading">
                      {providerNode?.label ?? "Focus"}
                    </h2>
                    <p className="mt-1 text-sm text-text-muted">
                      Set the attention tier for the resources that matter most.
                    </p>
                  </div>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search folders, projects, teams..."
                    className="h-10 w-full rounded-2xl border border-[var(--bg-card-border)] bg-white/[0.04] px-3 text-sm text-text-heading outline-none placeholder:text-text-muted lg:w-72"
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                {focusMapLoading || profileLoading ? (
                  <div className="rounded-2xl border border-[var(--bg-card-border)] bg-white/[0.03] p-5 text-sm text-text-muted">
                    Loading focus map...
                  </div>
                ) : filteredNodes.length === 0 ? (
                  <div className="rounded-2xl border border-[var(--bg-card-border)] bg-white/[0.03] p-5 text-sm text-text-muted">
                    No matching resources yet.
                  </div>
                ) : (
                  <FocusTree
                    nodes={filteredNodes}
                    pendingNodeId={pendingNodeId}
                    onSelectNode={(node) => void handleSelectNode(node)}
                    onChangeImportance={(node, next) =>
                      void handleChangeImportance(node, next)
                    }
                  />
                )}
              </div>
            </section>

            <section className="overflow-y-auto rounded-[24px] border border-[var(--bg-card-border)] bg-black/10 p-5">
              <h2 className="text-lg font-semibold text-text-heading">
                Live preview
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                This is the current structural focus profile that will drive
                default surfacing and fetch priority.
              </p>

              <div className="mt-5 space-y-5">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-accent-green">
                    What will rise
                  </div>
                  <div className="mt-3 space-y-2">
                    {preview.rise.length > 0 ? (
                      preview.rise.map((record) => (
                        <div
                          key={`${record.provider}-${record.entity_type}-${record.entity_id}`}
                          className="rounded-2xl border border-accent-green/20 bg-accent-green/10 px-3 py-3 text-sm text-text-body"
                        >
                          <div className="font-medium text-text-heading">
                            {record.label_snapshot || record.entity_id}
                          </div>
                          <div className="mt-1 text-xs text-text-muted">
                            {record.provider} · {record.entity_type}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-[var(--bg-card-border)] bg-white/[0.03] px-3 py-3 text-sm text-text-muted">
                        No critical focus rules yet.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-accent-red">
                    What will fade
                  </div>
                  <div className="mt-3 space-y-2">
                    {preview.fade.length > 0 ? (
                      preview.fade.map((record) => (
                        <div
                          key={`${record.provider}-${record.entity_type}-${record.entity_id}`}
                          className="rounded-2xl border border-accent-red/20 bg-accent-red/10 px-3 py-3 text-sm text-text-body"
                        >
                          <div className="font-medium text-text-heading">
                            {record.label_snapshot || record.entity_id}
                          </div>
                          <div className="mt-1 text-xs text-text-muted">
                            {record.provider} · {record.importance}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-[var(--bg-card-border)] bg-white/[0.03] px-3 py-3 text-sm text-text-muted">
                        No quiet or muted rules yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {setupTab === "advanced" && (
          <div className="grid gap-5 pt-5 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-[24px] border border-[var(--bg-card-border)] bg-black/10 p-5">
              <h2 className="text-lg font-semibold text-text-heading">
                Recent item feedback
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                Raised, lowered, and right-level feedback is stored here so the
                system can learn conservatively over time.
              </p>

              <div className="mt-5 space-y-4">
                {(["raise", "right", "lower"] as AttentionFeedbackValue[]).map(
                  (feedback) => (
                    <div key={feedback}>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-text-muted">
                        {FEEDBACK_LABELS[feedback]}
                      </div>
                      <div className="mt-2 space-y-2">
                        {feedbackStats[feedback].length > 0 ? (
                          feedbackStats[feedback].map((item) => (
                            <div
                              key={`${item.item_type}-${item.item_id}`}
                              className="rounded-2xl border border-[var(--bg-card-border)] bg-white/[0.03] px-3 py-3"
                            >
                              <div className="text-sm font-medium text-text-heading">
                                {item.title || item.item_id}
                              </div>
                              <div className="mt-1 text-xs text-text-muted">
                                {item.provider} · {item.surface}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-[var(--bg-card-border)] bg-white/[0.03] px-3 py-3 text-sm text-text-muted">
                            No {feedback} feedback yet.
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>

            <section className="rounded-[24px] border border-[var(--bg-card-border)] bg-black/10 p-5">
              <h2 className="text-lg font-semibold text-text-heading">
                Bias snapshot
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                Learned adjustments are intentionally small and should only trim
                around your explicit focus map.
              </p>

              <div className="mt-5 space-y-2">
                {feedbackStats.biases.length > 0 ? (
                  feedbackStats.biases.map((bias) => (
                    <div
                      key={`${bias.dimension_type}-${bias.dimension_key}`}
                      className="rounded-2xl border border-[var(--bg-card-border)] bg-white/[0.03] px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-text-heading">
                            {bias.dimension_key}
                          </div>
                          <div className="mt-1 text-xs text-text-muted">
                            {bias.dimension_type} · {bias.sample_count} samples
                          </div>
                        </div>
                        <div
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-semibold",
                            bias.bias_score > 0
                              ? "bg-accent-green/15 text-accent-green"
                              : bias.bias_score < 0
                                ? "bg-accent-red/15 text-accent-red"
                                : "bg-white/10 text-text-muted"
                          )}
                        >
                          {bias.bias_score > 0 ? "+" : ""}
                          {bias.bias_score}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-[var(--bg-card-border)] bg-white/[0.03] px-3 py-3 text-sm text-text-muted">
                    No learned bias data yet.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}

export function WorkspaceStudio() {
  return <SetupFocusView />;
}
