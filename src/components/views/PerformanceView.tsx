"use client";

import { Button } from "@/components/ui/button";
import { useConnections } from "@/hooks/useConnections";
import type { PerformanceSubView } from "@/lib/tab-config";
import { MetricsView } from "@/components/views/MetricsView";
import { SalesTabView } from "@/components/views/SalesTabView";
import { SurfaceConnectState } from "@/components/views/SurfaceConnectState";
import { SurfaceIntro, SurfaceSubnav } from "@/components/views/SurfaceChrome";

interface PerformanceViewProps {
  activeSubView: PerformanceSubView;
  onOpenSetup?: () => void;
  onSubViewChange: (subView: PerformanceSubView) => void;
}

export function PerformanceView({
  activeSubView,
  onOpenSetup,
  onSubViewChange,
}: PerformanceViewProps) {
  const connections = useConnections();
  const hasAnyData = connections.salesforce || connections.powerbi;

  return (
    <div className="space-y-5">
      <SurfaceIntro
        eyebrow="Performance"
        title="Performance"
        description="Use sales and metrics side by side so the command center shows pipeline movement first and supporting dashboards second."
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
          { id: "sales", label: "Sales" },
          { id: "metrics", label: "Metrics" },
        ]}
      />

      {!hasAnyData ? (
        <SurfaceConnectState
          title="Connect business performance data"
          description="Add Salesforce and Power BI to unlock pipeline, KPIs, and supporting reports."
          services={["Salesforce", "Power BI"]}
          onOpenSetup={onOpenSetup}
        />
      ) : activeSubView === "metrics" ? (
        connections.powerbi ? (
          <MetricsView />
        ) : (
          <SurfaceConnectState
            title="Connect Power BI to view metrics"
            description="This subview is reserved for KPI cards and reports from Power BI."
            services={["Power BI"]}
            onOpenSetup={onOpenSetup}
          />
        )
      ) : connections.salesforce ? (
        <SalesTabView />
      ) : (
        <SurfaceConnectState
          title="Connect Salesforce to view sales performance"
          description="This subview is reserved for pipeline, trends, and open opportunity detail from Salesforce."
          services={["Salesforce"]}
          onOpenSetup={onOpenSetup}
        />
      )}
    </div>
  );
}
