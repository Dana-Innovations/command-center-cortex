"use client";
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { TabBar, type TabId } from "@/components/layout/TabBar";
import { Footer } from "@/components/layout/Footer";
import { CommandCenterView } from "@/components/views/CommandCenterView";
import { PeopleView } from "@/components/views/PeopleView";
import { TimelineView } from "@/components/views/TimelineView";
import { TrendsView } from "@/components/views/TrendsView";
import { SalesView } from "@/components/views/SalesView";
import { EODSummary } from "@/components/modals/EODSummary";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("command-center");
  const [eodOpen, setEodOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Grain overlay */}
      <div className="grain-overlay" aria-hidden="true" />

      <Header />

      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="mb-5"
      />

      <main className="px-6 pb-8">
        {activeTab === "command-center" && <CommandCenterView />}
        {activeTab === "sales" && <SalesView />}
        {activeTab === "people" && <PeopleView />}
        {activeTab === "timeline" && <TimelineView />}
        {activeTab === "trends" && <TrendsView />}
      </main>

      <Footer onEodSummary={() => setEodOpen(true)} />

      <EODSummary isOpen={eodOpen} onClose={() => setEodOpen(false)} />
    </div>
  );
}
