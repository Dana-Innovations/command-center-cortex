"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { TabId } from "@/lib/tab-config";
import { CollapsibleSection } from "./CollapsibleSection";

interface Opportunity {
  id: string;
  name: string;
  account_name: string;
  days_to_close: number;
  sf_url: string;
}

interface Order {
  id: string;
  name: string;
  status: string;
  location: string | null;
  monday_url: string;
}

interface HomeWatchlistProps {
  performanceItems: Opportunity[];
  operationsItems: Order[];
  onNavigate: (tab: TabId) => void;
  animDelay?: number;
}

export function HomeWatchlist({
  performanceItems,
  operationsItems,
  onNavigate,
  animDelay = 320,
}: HomeWatchlistProps) {
  const totalItems = performanceItems.length + operationsItems.length;

  return (
    <CollapsibleSection
      storageKey="home-watchlist-expanded"
      title="Performance & Operations Watchlist"
      description="Revenue risk and execution blockers at a glance."
      badge={totalItems || null}
      animDelay={animDelay}
    >
      <div className="grid gap-5 xl:grid-cols-2">
        {/* Performance */}
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-text-muted">
                Performance
              </div>
              <p className="mt-1 text-sm text-text-muted">Deals aging or closing soon.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("performance")}>
              Open Performance
            </Button>
          </div>
          <div className="space-y-3">
            {performanceItems.length > 0 ? (
              performanceItems.map((opp) => (
                <a
                  key={opp.id}
                  href={opp.sf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-[20px] border border-[var(--bg-card-border)] bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]"
                >
                  <p className="text-sm font-medium text-text-heading">{opp.name}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {opp.account_name} · closes in {opp.days_to_close}d
                  </p>
                </a>
              ))
            ) : (
              <EmptyState variant="all-clear" context="performance risks" />
            )}
          </div>
        </div>

        {/* Operations */}
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-text-muted">
                Operations
              </div>
              <p className="mt-1 text-sm text-text-muted">Orders or workflows needing intervention.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("operations")}>
              Open Operations
            </Button>
          </div>
          <div className="space-y-3">
            {operationsItems.length > 0 ? (
              operationsItems.map((order) => (
                <a
                  key={order.id}
                  href={order.monday_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-[20px] border border-[var(--bg-card-border)] bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]"
                >
                  <p className="text-sm font-medium text-text-heading">{order.name}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {order.status} · {order.location || "Location pending"}
                  </p>
                </a>
              ))
            ) : (
              <EmptyState variant="all-clear" context="operational blockers" />
            )}
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}
