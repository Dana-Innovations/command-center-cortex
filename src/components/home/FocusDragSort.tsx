"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { Button } from "@/components/ui/button";

export interface FocusResource {
  id: string;
  name: string;
  provider: string;
  activityHint: string;
  suggestedTier: "important" | "background";
}

interface FocusDragSortProps {
  provider: string;
  providerLabel: string;
  resources: FocusResource[];
  onSave: (important: FocusResource[], background: FocusResource[]) => void;
  onSkip: () => void;
}

function kindFromProvider(provider: string): "email" | "chat" | "slack" | "asana" {
  if (provider === "microsoft" || provider === "outlook") return "email";
  if (provider === "teams") return "chat";
  if (provider === "slack") return "slack";
  return "asana";
}

function SortableItem({ resource, provider }: { resource: FocusResource; provider: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: resource.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-2.5 rounded-xl border border-[var(--bg-card-border)] bg-white/[0.03] px-3 py-2.5 cursor-grab active:cursor-grabbing transition-colors hover:bg-white/[0.05]"
    >
      <ServiceIcon kind={kindFromProvider(provider)} size={14} className="shrink-0 opacity-60" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-text-heading truncate">{resource.name}</div>
        <div className="text-[10px] text-text-muted">{resource.activityHint}</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-text-muted opacity-40">
        <line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="18" x2="16" y2="18" />
      </svg>
    </div>
  );
}

function ResourceCard({ resource, provider }: { resource: FocusResource; provider: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-[var(--bg-card-border)] bg-white/[0.03] px-3 py-2.5">
      <ServiceIcon kind={kindFromProvider(provider)} size={14} className="shrink-0 opacity-60" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-text-heading truncate">{resource.name}</div>
        <div className="text-[10px] text-text-muted">{resource.activityHint}</div>
      </div>
    </div>
  );
}

export function FocusDragSort({
  provider,
  providerLabel,
  resources,
  onSave,
  onSkip,
}: FocusDragSortProps) {
  const [important, setImportant] = useState<FocusResource[]>(() =>
    resources.filter((r) => r.suggestedTier === "important")
  );
  const [background, setBackground] = useState<FocusResource[]>(() =>
    resources.filter((r) => r.suggestedTier === "background")
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const allResources = useMemo(
    () => new Map([...important, ...background].map((r) => [r.id, r])),
    [important, background]
  );

  const activeResource = activeId ? allResources.get(activeId) : null;

  const findContainer = useCallback(
    (id: string): "important" | "background" | null => {
      if (important.some((r) => r.id === id)) return "important";
      if (background.some((r) => r.id === id)) return "background";
      return null;
    },
    [important, background]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const activeContainer = findContainer(String(active.id));
      const overContainer = findContainer(String(over.id));

      const targetContainer =
        String(over.id) === "important-droppable"
          ? "important"
          : String(over.id) === "background-droppable"
            ? "background"
            : overContainer;

      if (!activeContainer || !targetContainer || activeContainer === targetContainer) return;

      const resource = allResources.get(String(active.id));
      if (!resource) return;

      if (activeContainer === "important" && targetContainer === "background") {
        setImportant((prev) => prev.filter((r) => r.id !== resource.id));
        setBackground((prev) => [...prev, resource]);
      } else if (activeContainer === "background" && targetContainer === "important") {
        setBackground((prev) => prev.filter((r) => r.id !== resource.id));
        setImportant((prev) => [...prev, resource]);
      }
    },
    [allResources, findContainer]
  );

  const toggleItem = useCallback((resource: FocusResource) => {
    const container = findContainer(resource.id);
    if (container === "important") {
      setImportant((prev) => prev.filter((r) => r.id !== resource.id));
      setBackground((prev) => [...prev, resource]);
    } else {
      setBackground((prev) => prev.filter((r) => r.id !== resource.id));
      setImportant((prev) => [...prev, resource]);
    }
  }, [findContainer]);

  return (
    <div>
      <p className="text-sm text-text-muted mb-4">
        Drag between columns or click to move. Your most active {providerLabel} resources are at the top.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-2 gap-4">
          <div
            id="important-droppable"
            className="rounded-2xl border-2 border-dashed border-accent-amber/25 p-3 min-h-[200px]"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-amber mb-3">
              Important to me
            </div>
            <SortableContext items={important.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {important.map((resource) => (
                  <div key={resource.id} onClick={() => toggleItem(resource)}>
                    <SortableItem resource={resource} provider={provider} />
                  </div>
                ))}
              </div>
            </SortableContext>
            {important.length === 0 && (
              <div className="flex h-[120px] items-center justify-center text-[11px] text-text-muted">
                Drag items here
              </div>
            )}
          </div>

          <div
            id="background-droppable"
            className="rounded-2xl border-2 border-dashed border-white/8 p-3 min-h-[200px]"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted mb-3">
              Background
            </div>
            <SortableContext items={background.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {background.map((resource) => (
                  <div key={resource.id} onClick={() => toggleItem(resource)}>
                    <SortableItem resource={resource} provider={provider} />
                  </div>
                ))}
              </div>
            </SortableContext>
            {background.length === 0 && (
              <div className="flex h-[120px] items-center justify-center text-[11px] text-text-muted">
                Drag items here
              </div>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeResource && <ResourceCard resource={activeResource} provider={provider} />}
        </DragOverlay>
      </DndContext>

      <div className="mt-5 flex items-center gap-3">
        <Button variant="primary" size="sm" onClick={() => onSave(important, background)}>
          Save & continue
        </Button>
        <button
          className="text-sm text-text-muted underline underline-offset-2 hover:text-text-body"
          onClick={onSkip}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
