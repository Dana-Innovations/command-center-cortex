"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { TabId } from "@/lib/tab-config";
import { CollapsibleSection } from "./CollapsibleSection";
import { cn } from "@/lib/utils";

interface Person {
  name: string;
  email?: string | null | undefined;
  urgency: "red" | "amber" | "teal" | "gray";
  touchpoints: number;
  action: string;
}

interface HomePeopleProps {
  people: Person[];
  getPersonPreference: (person: { name: string; email: string | null }) => {
    important?: boolean;
    pinned?: boolean;
  } | null;
  onNavigate: (tab: TabId) => void;
  animDelay?: number;
}

export function HomePeople({
  people,
  getPersonPreference,
  onNavigate,
  animDelay = 280,
}: HomePeopleProps) {
  return (
    <CollapsibleSection
      storageKey="home-people-expanded"
      title="People to Watch"
      description="Keep the relationship layer visible before pipeline or operational detail."
      badge={people.length || null}
      animDelay={animDelay}
      action={
        <Button variant="ghost" size="sm" onClick={() => onNavigate("people")}>
          Open People
        </Button>
      }
    >
      {people.length === 0 ? (
        <EmptyState variant="all-clear" context="relationship signals" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {people.map((person) => {
            const preference = getPersonPreference({
              name: person.name,
              email: person.email ?? null,
            });
            return (
              <div
                key={person.name}
                className="rounded-[20px] border border-[var(--bg-card-border)] bg-white/[0.03] p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold",
                      person.urgency === "red" && "bg-accent-red/15 text-accent-red",
                      person.urgency === "amber" && "bg-accent-amber/15 text-accent-amber",
                      person.urgency === "teal" && "bg-accent-teal/15 text-accent-teal",
                      person.urgency === "gray" && "bg-white/10 text-text-muted"
                    )}
                  >
                    {person.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-text-heading">{person.name}</p>
                      {preference?.important && (
                        <span className="rounded-full bg-accent-amber/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-accent-amber">
                          Important
                        </span>
                      )}
                      {preference?.pinned && (
                        <span className="rounded-full bg-accent-teal/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-accent-teal">
                          Pinned
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted">
                      {person.touchpoints} touchpoint{person.touchpoints === 1 ? "" : "s"} · {person.action}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CollapsibleSection>
  );
}
