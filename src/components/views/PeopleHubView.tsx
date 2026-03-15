"use client";

import { Button } from "@/components/ui/button";
import { useConnections } from "@/hooks/useConnections";
import { SurfaceConnectState } from "@/components/views/SurfaceConnectState";
import { SurfaceIntro } from "@/components/views/SurfaceChrome";
import { UnifiedPeopleView } from "@/components/views/UnifiedPeopleView";

interface PeopleHubViewProps {
  onOpenSetup?: () => void;
}

export function PeopleHubView({ onOpenSetup }: PeopleHubViewProps) {
  const connections = useConnections();
  const connected =
    connections.m365 ||
    connections.salesforce ||
    connections.asana ||
    connections.slack;

  return (
    <div className="space-y-5">
      <SurfaceIntro
        eyebrow="People"
        title="People"
        description="Keep relationships, recent touchpoints, and follow-up risk visible before you dive into pipeline or operations."
        actions={
          onOpenSetup ? (
            <Button variant="secondary" size="sm" onClick={onOpenSetup}>
              Setup & Focus
            </Button>
          ) : undefined
        }
      />

      {!connected ? (
        <SurfaceConnectState
          title="Connect collaboration systems for People"
          description="The People surface combines contact, meeting, task, and sales signals, so it needs at least one connected collaboration source."
          services={["Microsoft 365", "Salesforce", "Asana", "Slack"]}
          onOpenSetup={onOpenSetup}
        />
      ) : (
        <UnifiedPeopleView />
      )}
    </div>
  );
}
