"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { MorningBrief } from "@/components/command-center/MorningBrief";
import { AttentionHero } from "@/components/home/AttentionHero";
import { QuickActions } from "@/components/home/QuickActions";
import { HomeCommunications } from "@/components/home/HomeCommunications";
import { HomeCalendar } from "@/components/home/HomeCalendar";
import { HomeTasks } from "@/components/home/HomeTasks";
import { HomePeople } from "@/components/home/HomePeople";
import { HomeWatchlist } from "@/components/home/HomeWatchlist";
import { useHomeData, type QuickAction } from "@/components/home/useHomeData";
import { useAuth } from "@/hooks/useAuth";
import {
  OnboardingHighlight,
  ONBOARDING_HIGHLIGHTS,
  useOnboardingHighlights,
} from "@/components/home/OnboardingHighlights";
import { FocusDragSort, type FocusResource } from "@/components/home/FocusDragSort";
import { FocusExceptions } from "@/components/home/FocusExceptions";
import type { SetupFocusTab, TabId } from "@/lib/tab-config";

type OnboardingStep =
  | "welcome"
  | "sort-m365"
  | "exceptions-m365"
  | "connect-asana"
  | "sort-asana"
  | "exceptions-asana"
  | "global-rules"
  | "syncing";

const VALUE_PROPS = [
  { icon: "\u{1F4C8}", label: "Prioritized", desc: "What matters surfaces first" },
  { icon: "\u{1F517}", label: "Connected", desc: "People & threads across tools" },
  { icon: "\u26A1", label: "Actionable", desc: "Act without switching apps" },
] as const;

function ConnectedBadge({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-accent-green/25 bg-accent-green/10 px-2.5 py-1">
      <span className="text-accent-green">&#10003;</span>
      <span className="text-xs text-accent-green">{label}</span>
    </div>
  );
}

const StepDots = ({ current }: { current: 1 | 2 | 3 }) => (
  <div className="flex gap-1.5 mb-5">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className={`h-[3px] w-7 rounded-full transition-colors duration-300 ${
          i < current ? "bg-accent-green" : i === current ? "bg-blue-500" : "bg-white/10"
        }`}
      />
    ))}
  </div>
);

interface HomeViewProps {
  onNavigate: (tab: TabId) => void;
  onOpenCalendarPrep: (eventId?: string) => void;
  onOpenSetup: (tab?: SetupFocusTab) => void;
  onConnectService: (provider: string) => Promise<void>;
  recentlyConnectedProvider?: string | null;
  isSyncingLiveData?: boolean;
}

export function HomeView({
  onNavigate,
  onOpenCalendarPrep,
  onOpenSetup,
  onConnectService,
  recentlyConnectedProvider = null,
  isSyncingLiveData = false,
}: HomeViewProps) {
  const data = useHomeData();
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name?.split(" ")[0] ?? "";

  const [manualStep, setManualStep] = useState<OnboardingStep | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem("cc-onboarding-completed") === "true";
    } catch { return false; }
  });
  const [revealing, setRevealing] = useState(false);
  const [focusResources, setFocusResources] = useState<FocusResource[]>([]);

  const onboardingStep: OnboardingStep | null = onboardingCompleted
    ? null
    : manualStep !== null
      ? manualStep
      : !data.hasM365
        ? "welcome"
        : !data.hasAsana
          ? "connect-asana"
          : null;

  useEffect(() => {
    if (onboardingStep === "syncing" && data.hasAnyService) {
      const timer = setTimeout(() => {
        setRevealing(true);
        setTimeout(() => {
          try { localStorage.setItem("cc-onboarding-completed", "true"); } catch {}
          setOnboardingCompleted(true);
          setRevealing(false);
        }, 400);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [onboardingStep, data.hasAnyService]);

  const fetchFocusResources = useCallback(async (provider: string) => {
    try {
      const res = await fetch("/api/focus/map");
      if (!res.ok) return;
      const data = await res.json();
      const providerNode = data.tree?.children?.find(
        (node: { provider?: string }) => node.provider === provider
      );
      if (!providerNode?.children) return;
      const resources: FocusResource[] = providerNode.children
        .filter((node: { id?: string; label?: string }) => node.id && node.label)
        .map((node: { id: string; label: string }, index: number) => ({
          id: node.id,
          name: node.label,
          provider,
          activityHint: "",
          suggestedTier: (index < 3 ? "important" : "background") as "important" | "background",
        }));
      setFocusResources(resources);
    } catch {
      // If focus map fails, skip sort step
    }
  }, []);

  const handleConnectProvider = useCallback(
    async (provider: string, sortStep: OnboardingStep) => {
      try {
        await onConnectService(provider);
        await fetchFocusResources(provider);
        setManualStep(sortStep);
      } catch {
        // Stay on current step
      }
    },
    [onConnectService, fetchFocusResources]
  );

  const handleSkipAsana = useCallback(() => {
    setManualStep("syncing");
  }, []);

  const handleSaveFocusSort = useCallback(
    async (important: FocusResource[], background: FocusResource[]) => {
      const focusUpserts = [
        ...important.map((r) => ({
          provider: r.provider,
          entity_type: "project",
          entity_id: r.id,
          label_snapshot: r.name,
          importance: "critical" as const,
        })),
        ...background.map((r) => ({
          provider: r.provider,
          entity_type: "project",
          entity_id: r.id,
          label_snapshot: r.name,
          importance: "quiet" as const,
        })),
      ];
      try {
        await fetch("/api/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ focusUpserts }),
        });
      } catch {}

      if (onboardingStep === "sort-m365") setManualStep("exceptions-m365");
      else if (onboardingStep === "sort-asana") setManualStep("exceptions-asana");
    },
    [onboardingStep]
  );

  const handleSaveExceptions = useCallback(
    async (rules: Array<{
      provider: string | null;
      entity_id: string | null;
      entity_name: string | null;
      condition_type: string;
      condition_value: string;
      override_tier: string;
    }>) => {
      if (rules.length > 0) {
        try {
          await fetch("/api/focus/exceptions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rules }),
          });
        } catch {}
      }
      if (onboardingStep === "exceptions-m365") setManualStep("connect-asana");
      else if (onboardingStep === "exceptions-asana") setManualStep("global-rules");
      else if (onboardingStep === "global-rules") setManualStep("syncing");
    },
    [onboardingStep]
  );

  const highlights = useOnboardingHighlights();

  const handleQuickAction = useCallback(
    (action: QuickAction) => {
      switch (action.handler) {
        case "navigate":
          onNavigate(action.payload as TabId);
          break;
        case "external":
          window.open(action.payload, "_blank", "noopener,noreferrer");
          break;
        case "calendarPrep":
          onOpenCalendarPrep(action.payload);
          break;
        case "setup":
          onOpenSetup(action.payload as SetupFocusTab);
          break;
      }
    },
    [onNavigate, onOpenCalendarPrep, onOpenSetup]
  );

  if (onboardingStep !== null) {
    return (
      <div className="space-y-5">
        <section
          className={`glass-card anim-card overflow-hidden transition-opacity duration-300 ${
            revealing ? "opacity-0" : "opacity-100"
          }`}
          style={{ animationDelay: "0ms" }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,163,225,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(0,178,169,0.12),transparent_32%)]" />
          <div className="relative">
            {onboardingStep === "welcome" && (
              <>
                <StepDots current={1} />
                <h1 className="font-display text-2xl font-semibold leading-tight text-text-heading">
                  {userName ? `Welcome, ${userName}.` : "Welcome."}
                </h1>
                <p className="mt-1.5 text-[15px] text-text-body">
                  One place for everything across your tools.
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
                  Email, calendar, tasks, messages — prioritized and connected. Start by connecting Microsoft 365.
                </p>
                <div className="mt-5 flex flex-wrap gap-5">
                  {VALUE_PROPS.map((vp) => (
                    <div key={vp.label} className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/15 text-sm">
                        {vp.icon}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-text-heading">{vp.label}</div>
                        <div className="text-[11px] text-text-muted">{vp.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center gap-4">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={data.connectingService === "microsoft"}
                    onClick={() => void handleConnectProvider("microsoft", "sort-m365")}
                  >
                    {data.connectingService === "microsoft" ? "Connecting..." : "Connect Microsoft 365"}
                  </Button>
                  <span className="text-xs text-text-muted">About 60 seconds total</span>
                </div>
              </>
            )}

            {onboardingStep === "sort-m365" && (
              <>
                <StepDots current={2} />
                <div className="mb-4">
                  <ConnectedBadge label="Microsoft 365 connected" />
                </div>
                <h1 className="font-display text-[22px] font-semibold leading-tight text-text-heading">
                  What matters most in Outlook &amp; Teams?
                </h1>
                <div className="mt-4">
                  <FocusDragSort
                    provider="microsoft"
                    providerLabel="Microsoft 365"
                    resources={focusResources}
                    onSave={handleSaveFocusSort}
                    onSkip={() => setManualStep("exceptions-m365")}
                  />
                </div>
              </>
            )}

            {onboardingStep === "exceptions-m365" && (
              <>
                <StepDots current={2} />
                <h1 className="font-display text-[22px] font-semibold leading-tight text-text-heading">
                  Any exceptions for Microsoft 365?
                </h1>
                <div className="mt-4">
                  <FocusExceptions
                    provider="microsoft"
                    providerLabel="Microsoft 365"
                    resources={focusResources.map((r) => ({ id: r.id, name: r.name }))}
                    onSave={handleSaveExceptions}
                    onSkip={() => setManualStep("connect-asana")}
                  />
                </div>
              </>
            )}

            {onboardingStep === "connect-asana" && (
              <>
                <StepDots current={2} />
                <div className="mb-4">
                  <ConnectedBadge label="Microsoft 365 connected" />
                </div>
                <h1 className="font-display text-[22px] font-semibold leading-tight text-text-heading">
                  Add Asana for task context.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
                  See your tasks alongside emails and meetings — all prioritized in one view.
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={data.connectingService === "asana"}
                    onClick={() => void handleConnectProvider("asana", "sort-asana")}
                  >
                    {data.connectingService === "asana" ? "Connecting..." : "Connect Asana"}
                  </Button>
                  <button
                    className="text-sm text-text-muted underline underline-offset-2 hover:text-text-body"
                    onClick={handleSkipAsana}
                  >
                    Skip for now
                  </button>
                </div>
              </>
            )}

            {onboardingStep === "sort-asana" && (
              <>
                <StepDots current={3} />
                <div className="mb-4 flex flex-wrap gap-2">
                  <ConnectedBadge label="Microsoft 365" />
                  <ConnectedBadge label="Asana" />
                </div>
                <h1 className="font-display text-[22px] font-semibold leading-tight text-text-heading">
                  Which Asana projects matter most?
                </h1>
                <div className="mt-4">
                  <FocusDragSort
                    provider="asana"
                    providerLabel="Asana"
                    resources={focusResources}
                    onSave={handleSaveFocusSort}
                    onSkip={() => setManualStep("exceptions-asana")}
                  />
                </div>
              </>
            )}

            {onboardingStep === "exceptions-asana" && (
              <>
                <StepDots current={3} />
                <h1 className="font-display text-[22px] font-semibold leading-tight text-text-heading">
                  Any exceptions for Asana?
                </h1>
                <div className="mt-4">
                  <FocusExceptions
                    provider="asana"
                    providerLabel="Asana"
                    resources={focusResources.map((r) => ({ id: r.id, name: r.name }))}
                    onSave={handleSaveExceptions}
                    onSkip={() => setManualStep("global-rules")}
                  />
                </div>
              </>
            )}

            {onboardingStep === "global-rules" && (
              <>
                <StepDots current={3} />
                <h1 className="font-display text-[22px] font-semibold leading-tight text-text-heading">
                  Any rules across all your tools?
                </h1>
                <p className="mt-2 text-sm text-text-muted">
                  Rules that apply everywhere — about people, topics, or patterns.
                </p>
                <div className="mt-4">
                  <FocusExceptions
                    onSave={handleSaveExceptions}
                    onSkip={() => setManualStep("syncing")}
                  />
                </div>
              </>
            )}

            {onboardingStep === "syncing" && (
              <>
                <StepDots current={3} />
                <div className="mb-4 flex flex-wrap gap-2">
                  {data.hasM365 && <ConnectedBadge label="Microsoft 365" />}
                  {data.hasAsana && <ConnectedBadge label="Asana" />}
                </div>
                <h1 className="font-display text-[22px] font-semibold leading-tight text-text-heading">
                  Syncing your data...
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
                  Pulling in your emails, calendar, tasks, and messages.
                </p>
                <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full w-2/3 animate-[progressIndeterminate_1.5s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    );
  }

  /* ── Connected state — attention-focused dashboard ── */
  return (
    <div className="space-y-4">
      {/* 1. Attention Hero — top 1-3 urgent items */}
      <div className="relative">
        <OnboardingHighlight
          id="attention-hero"
          label={ONBOARDING_HIGHLIGHTS[0].label}
          dismissed={highlights.dismissed.has("attention-hero")}
          onDismiss={() => highlights.dismiss("attention-hero")}
        />
        <AttentionHero items={data.heroItems} onAction={handleQuickAction} />
      </div>

      {/* 2. Quick action buttons */}
      <div className="relative">
        <OnboardingHighlight
          id="quick-actions"
          label={ONBOARDING_HIGHLIGHTS[2].label}
          dismissed={highlights.dismissed.has("quick-actions")}
          onDismiss={() => highlights.dismiss("quick-actions")}
        />
        <QuickActions actions={data.quickActions} onAction={handleQuickAction} />
      </div>

      {/* 3. Morning Brief (collapsed by default) */}
      <div className="relative">
        <OnboardingHighlight
          id="morning-brief"
          label={ONBOARDING_HIGHLIGHTS[1].label}
          dismissed={highlights.dismissed.has("morning-brief")}
          onDismiss={() => highlights.dismiss("morning-brief")}
        />
        <MorningBrief
          onOpenCalendarPrep={onOpenCalendarPrep}
          showPendingState={recentlyConnectedProvider === "microsoft" && isSyncingLiveData}
        />
      </div>

      {/* 4. Collapsible sections — progressive disclosure */}
      <HomeCalendar
        events={data.todayEvents}
        heroItemIds={data.heroItemIds}
        onNavigate={onNavigate}
        onOpenCalendarPrep={onOpenCalendarPrep}
        animDelay={160}
      />

      <HomeCommunications
        items={data.communicationItems}
        heroItemIds={data.heroItemIds}
        onNavigate={onNavigate}
        animDelay={200}
      />

      <HomeTasks
        tasks={data.priorityTasks}
        heroItemIds={data.heroItemIds}
        onNavigate={onNavigate}
        animDelay={240}
      />

      <HomePeople
        people={data.peopleToWatch}
        getPersonPreference={data.getPersonPreference}
        onNavigate={onNavigate}
        animDelay={280}
      />

      <HomeWatchlist
        performanceItems={data.performanceWatchlist}
        operationsItems={data.operationsWatchlist}
        onNavigate={onNavigate}
        animDelay={320}
      />
    </div>
  );
}
