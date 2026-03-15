"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { TabBar, type TabId } from "@/components/layout/TabBar";
import { Footer } from "@/components/layout/Footer";
import { PriorityView } from "@/components/views/PriorityView";
import { SalesTabView } from "@/components/views/SalesTabView";
import { MetricsView } from "@/components/views/MetricsView";
import { UnifiedPeopleView } from "@/components/views/UnifiedPeopleView";
import { CalendarView } from "@/components/views/CalendarView";
import { SignalsView } from "@/components/views/SignalsView";
import { MindensView } from "@/components/views/MindensView";
import { DelegationView } from "@/components/views/DelegationView";
import { MeetingPrepView } from "@/components/views/MeetingPrepView";
import { DigestView } from "@/components/views/DigestView";
import { EODSummary } from "@/components/modals/EODSummary";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { WorkspaceStudio } from "@/components/ui/WorkspaceStudio";
import { AttentionProvider, useAttention } from "@/lib/attention/client";
import { LiveDataProvider, useLiveData } from "@/lib/live-data-context";
import { getVisibleTabs } from "@/lib/tab-config";

export default function Home() {
  return (
    <LiveDataProvider>
      <AttentionProvider>
        <HomeContent />
      </AttentionProvider>
    </LiveDataProvider>
  );
}

function HomeContent() {
  const [activeTab, setActiveTab] = useState<TabId>("digest");
  const [eodOpen, setEodOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [prepEventId, setPrepEventId] = useState<string | undefined>();
  const { loading, fetchedAt, error, refetch, connections } = useLiveData();
  const { focusRevision } = useAttention();

  const visibleTabs = useMemo(
    () => getVisibleTabs(connections, !!fetchedAt),
    [connections, fetchedAt]
  );
  const effectiveActiveTab = useMemo(
    () => (fetchedAt && !visibleTabs.includes(activeTab) ? "digest" : activeTab),
    [activeTab, fetchedAt, visibleTabs]
  );

  const handlePrepNavigate = useCallback((eventId: string) => {
    setPrepEventId(eventId);
    setActiveTab("prep");
  }, []);

  // Listen for navigate-prep custom events from child components
  useEffect(() => {
    const handler = ((e: CustomEvent<{ eventId: string }>) => {
      handlePrepNavigate(e.detail.eventId);
    }) as EventListener;
    window.addEventListener("navigate-prep", handler);
    return () => window.removeEventListener("navigate-prep", handler);
  }, [handlePrepNavigate]);

  useEffect(() => {
    if (focusRevision === 0) return;
    void refetch();
  }, [focusRevision, refetch]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="grain-overlay" aria-hidden="true" />

      <Header
        onRefresh={refetch}
        isSyncing={loading}
        lastSyncedAt={fetchedAt}
        syncError={error}
        onSearchOpen={() => setSearchOpen(true)}
      />

      <TabBar
        activeTab={effectiveActiveTab}
        onTabChange={setActiveTab}
        visibleTabIds={visibleTabs}
        className="mb-5"
      />

      <main className="px-4 md:px-6 pb-24 md:pb-8">
        {effectiveActiveTab === "digest"    && <DigestView />}
        {effectiveActiveTab === "priority"  && <PriorityView />}
        {effectiveActiveTab === "sales"     && <SalesTabView />}
        {effectiveActiveTab === "metrics"   && <MetricsView />}
        {effectiveActiveTab === "people"    && <UnifiedPeopleView />}
        {effectiveActiveTab === "calendar"  && <CalendarView />}
        {effectiveActiveTab === "prep"      && <MeetingPrepView initialEventId={prepEventId} />}
        {effectiveActiveTab === "signals"   && <SignalsView />}
        {effectiveActiveTab === "minden"    && <MindensView />}
        {effectiveActiveTab === "delegation" && <DelegationView />}
      </main>

      <Footer onEodSummary={() => setEodOpen(true)} />
      <EODSummary isOpen={eodOpen} onClose={() => setEodOpen(false)} />
      <WorkspaceStudio />
      <GlobalSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={(tab) => setActiveTab(tab as TabId)}
      />
    </div>
  );
}
