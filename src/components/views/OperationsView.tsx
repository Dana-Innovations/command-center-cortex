"use client";

import { Button } from "@/components/ui/button";
import { useConnections } from "@/hooks/useConnections";
import type { OperationsSubView } from "@/lib/tab-config";
import { DelegationView } from "@/components/views/DelegationView";
import { MindensView } from "@/components/views/MindensView";
import { SurfaceConnectState } from "@/components/views/SurfaceConnectState";
import { SurfaceIntro, SurfaceSubnav } from "@/components/views/SurfaceChrome";

interface OperationsViewProps {
  activeSubView: OperationsSubView;
  onOpenSetup?: () => void;
  onSubViewChange: (subView: OperationsSubView) => void;
}

export function OperationsView({
  activeSubView,
  onOpenSetup,
  onSubViewChange,
}: OperationsViewProps) {
  const connections = useConnections();
  const hasAnyData = connections.asana || connections.monday;

  return (
    <div className="space-y-5">
      <SurfaceIntro
        eyebrow="Operations"
        title="Operations"
        description="Track delegated work and order flow without mixing execution views into the top-level navigation."
        actions={
          onOpenSetup ? (
            <Button variant="secondary" size="sm" onClick={onOpenSetup}>
              Setup & Focus
            </Button>
          ) : undefined
        }
      />

      <SurfaceSubnav
        active={activeSubView}
        onChange={onSubViewChange}
        items={[
          { id: "delegation", label: "Delegation" },
          { id: "orders", label: "Orders" },
        ]}
      />

      {!hasAnyData ? (
        <SurfaceConnectState
          title="Connect execution systems"
          description="Add Asana or Monday.com so Operations can track delegated work and order flow."
          services={["Asana", "Monday.com"]}
          onOpenSetup={onOpenSetup}
        />
      ) : activeSubView === "orders" ? (
        connections.monday ? (
          <MindensView />
        ) : (
          <SurfaceConnectState
            title="Connect Monday.com to view orders"
            description="The Orders subview uses Monday.com data to monitor production and fulfillment work."
            services={["Monday.com"]}
            onOpenSetup={onOpenSetup}
          />
        )
      ) : connections.asana ? (
        <DelegationView />
      ) : (
        <SurfaceConnectState
          title="Connect Asana to view delegation"
          description="The Delegation subview uses Asana task data to show delegated work that needs follow-up."
          services={["Asana"]}
          onOpenSetup={onOpenSetup}
        />
      )}
    </div>
  );
}
