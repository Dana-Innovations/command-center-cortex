"use client";
import { cn } from "@/lib/utils";

export type TabId = "command-center" | "sales" | "people" | "timeline" | "trends";

const tabs: { id: TabId; label: string }[] = [
  { id: "command-center", label: "Command Center" },
  { id: "sales", label: "Sales" },
  { id: "people", label: "People" },
  { id: "timeline", label: "Timeline" },
  { id: "trends", label: "Trends" },
];

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  className?: string;
}

export function TabBar({ activeTab, onTabChange, className }: TabBarProps) {
  return (
    <nav
      className={cn(
        "tab-bar flex items-center gap-1 rounded-xl bg-[var(--tab-bg)] p-1 mx-6",
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
              isActive
                ? "bg-[var(--tab-active-bg)] text-accent-amber shadow-sm"
                : "text-text-muted hover:text-text-body hover:bg-[var(--tab-bg)]"
            )}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
