"use client";

import { Button } from "@/components/ui/button";
import { useConnections } from "@/hooks/useConnections";
import type { CalendarSubView } from "@/lib/tab-config";
import { CalendarView } from "@/components/views/CalendarView";
import { MeetingPrepView } from "@/components/views/MeetingPrepView";
import { SurfaceConnectState } from "@/components/views/SurfaceConnectState";
import { SurfaceIntro, SurfaceSubnav } from "@/components/views/SurfaceChrome";

interface CalendarHubViewProps {
  activeSubView: CalendarSubView;
  initialEventId?: string;
  onOpenSetup?: () => void;
  onSubViewChange: (subView: CalendarSubView) => void;
}

export function CalendarHubView({
  activeSubView,
  initialEventId,
  onOpenSetup,
  onSubViewChange,
}: CalendarHubViewProps) {
  const connections = useConnections();

  return (
    <div className="space-y-5">
      <SurfaceIntro
        eyebrow="Calendar"
        title="Calendar"
        description="See the week at a glance, then switch into prep mode when a meeting needs context and talking points."
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
          { id: "schedule", label: "Schedule" },
          { id: "prep", label: "Prep" },
        ]}
      />

      {!connections.m365 ? (
        <SurfaceConnectState
          title="Connect Microsoft 365 for calendar context"
          description="Calendar and meeting prep both rely on your Microsoft 365 calendar and related meeting data."
          services={["Microsoft 365"]}
          onOpenSetup={onOpenSetup}
        />
      ) : activeSubView === "prep" ? (
        <MeetingPrepView initialEventId={initialEventId} />
      ) : (
        <CalendarView />
      )}
    </div>
  );
}
