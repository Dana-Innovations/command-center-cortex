"use client";

import { Button } from "@/components/ui/button";
import { AttentionFeedbackControl } from "@/components/ui/AttentionFeedbackControl";
import { EmptyState } from "@/components/ui/EmptyState";
import { CollapsibleSection } from "./CollapsibleSection";
import type { TabId } from "@/lib/tab-config";
import type { CommunicationCardItem } from "./useHomeData";

interface HomeCommunicationsProps {
  items: CommunicationCardItem[];
  heroItemIds: Set<string>;
  onNavigate: (tab: TabId) => void;
  animDelay?: number;
}

export function HomeCommunications({
  items,
  heroItemIds,
  onNavigate,
  animDelay = 160,
}: HomeCommunicationsProps) {
  const filtered = items.filter((item) => !heroItemIds.has(item.id));

  return (
    <CollapsibleSection
      storageKey="home-comms-expanded"
      title="Communications Now"
      description="Threads, chats, and channels most likely to need you next."
      badge={filtered.length || null}
      animDelay={animDelay}
      action={
        <Button variant="ghost" size="sm" onClick={() => onNavigate("communications")}>
          View all in Comms
        </Button>
      }
    >
      {filtered.length === 0 ? (
        <EmptyState variant="all-clear" context="communications" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-[20px] border border-[var(--bg-card-border)] bg-white/[0.03] p-4"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-[var(--bg-card-border)] bg-black/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-text-muted">
                      {item.kind}
                    </span>
                    <span className="text-[11px] text-text-muted">{item.meta}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-text-heading">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-muted">
                    {item.preview}
                  </p>
                </div>
                <AttentionFeedbackControl
                  target={item.attentionTarget as Parameters<typeof AttentionFeedbackControl>[0]["target"]}
                  surface="home"
                  compact
                />
              </div>
              {item.url && (
                <div className="mt-3">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-accent-amber hover:underline"
                  >
                    Open source
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}
