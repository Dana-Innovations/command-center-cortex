"use client";

import { useCallback } from "react";
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
import type { SetupFocusTab, TabId } from "@/lib/tab-config";

const M365_WIN_CARDS = [
  { title: "Morning brief", description: "AI summary from your live email, meetings, and work." },
  { title: "Ranked replies", description: "The most important threads rise first from your own inbox." },
  { title: "Calendar prep", description: "Meeting context and next actions before the day gets busy." },
  { title: "Teams context", description: "Chats and channel signals alongside the rest of your day." },
] as const;

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

  /* ── No services connected — onboarding state ── */
  if (!data.hasAnyService) {
    return (
      <div className="space-y-5">
        <section className="glass-card anim-card overflow-hidden" style={{ animationDelay: "0ms" }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,163,225,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(0,178,169,0.12),transparent_32%)]" />
          <div className="relative grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="type-eyebrow text-accent-amber">Real-Data Start</div>
              <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-text-heading">
                Connect Microsoft 365 to light up your command center.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
                It is the fastest way to unlock a live morning brief, ranked replies, calendar prep, and Teams context from your own account. Nothing here is mocked or prefilled.
              </p>
              <div className="mt-5">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={data.connectingService === "microsoft"}
                  onClick={() => void onConnectService("microsoft")}
                >
                  {data.connectingService === "microsoft" ? "Connecting Microsoft 365..." : "Connect Microsoft 365"}
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {M365_WIN_CARDS.map((card) => (
                <div key={card.title} className="rounded-[22px] border border-[var(--bg-card-border)] bg-black/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-accent-teal">Unlocks</div>
                  <div className="mt-2 text-lg font-semibold text-text-heading">{card.title}</div>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  /* ── Connected state — attention-focused dashboard ── */
  return (
    <div className="space-y-4">
      {/* 1. Attention Hero — top 1-3 urgent items */}
      <AttentionHero items={data.heroItems} onAction={handleQuickAction} />

      {/* 2. Quick action buttons */}
      <QuickActions actions={data.quickActions} onAction={handleQuickAction} />

      {/* 3. Morning Brief (collapsed by default) */}
      <MorningBrief
        onOpenCalendarPrep={onOpenCalendarPrep}
        showPendingState={recentlyConnectedProvider === "microsoft" && isSyncingLiveData}
      />

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
