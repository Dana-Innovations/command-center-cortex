"use client";

import { ReplyCenter } from "@/components/command-center/ReplyCenter";
import { Button } from "@/components/ui/button";
import { useConnections } from "@/hooks/useConnections";
import { SurfaceIntro } from "@/components/views/SurfaceChrome";
import { SurfaceConnectState } from "@/components/views/SurfaceConnectState";
import { SignalsView } from "@/components/views/SignalsView";

interface CommunicationsViewProps {
  onOpenSetup?: () => void;
}

export function CommunicationsView({ onOpenSetup }: CommunicationsViewProps) {
  const connections = useConnections();
  const connected = connections.m365 || connections.slack || connections.asana;

  return (
    <div className="space-y-5">
      <SurfaceIntro
        eyebrow="Comms"
        title="Communications"
        description="Start with the ranked reply queue, then move through channel activity, hygiene, and AI assistance."
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
          title="Connect communications data"
          description="Connect Microsoft 365, Slack, or Asana so the command center can build your reply queue and channel activity."
          services={["Microsoft 365", "Slack", "Asana"]}
          onOpenSetup={onOpenSetup}
        />
      ) : (
        <>
          <ReplyCenter />
          <SignalsView />
        </>
      )}
    </div>
  );
}
