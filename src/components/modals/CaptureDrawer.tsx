"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import type { UseVaultCaptureReturn } from "@/hooks/useVaultCapture";
import type { RoutingPlan } from "@/lib/capture-routing";

interface CaptureDrawerProps {
  capture: UseVaultCaptureReturn;
}

export function CaptureDrawer({ capture }: CaptureDrawerProps) {
  const { state, isOpen, close, save, retry } = capture;
  const { addToast } = useToast();
  const [editedPlan, setEditedPlan] = useState<RoutingPlan | null>(null);

  // Sync edited plan when entering preview state
  useEffect(() => {
    if (state.status === "preview") {
      setEditedPlan(state.plan);
    } else if (state.status === "error" && state.plan) {
      setEditedPlan(state.plan);
    }
  }, [state]);

  // Fire success toast when returning to closed state after save
  const [wasSaving, setWasSaving] = useState(false);
  useEffect(() => {
    if (state.status === "saving") {
      setWasSaving(true);
      return;
    }
    if (wasSaving && state.status === "closed" && editedPlan) {
      addToast(`Saved to ${editedPlan.targetTitle}`, "success");
      setWasSaving(false);
      return;
    }
    if (state.status !== "closed") {
      setWasSaving(false);
    }
  }, [state.status, wasSaving, editedPlan, addToast]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
      <div
        className="absolute inset-0 bg-black/40 pointer-events-auto"
        onClick={close}
      />
      <div
        className={cn(
          "relative w-full max-w-md bg-[var(--bg-primary)] border-l border-[var(--bg-card-border)]",
          "shadow-2xl pointer-events-auto overflow-y-auto",
          "flex flex-col"
        )}
      >
        <div className="px-4 py-3 border-b border-[var(--bg-card-border)] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-heading">
            Capture to Vault
          </h2>
          <button
            onClick={close}
            className="text-text-muted hover:text-text-body text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 p-4">
          {state.status === "analyzing" && (
            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
              <div className="animate-pulse text-sm">Analyzing content...</div>
            </div>
          )}

          {(state.status === "preview" || state.status === "saving") &&
            editedPlan && (
              <PreviewForm
                plan={editedPlan}
                onChange={setEditedPlan}
                saving={state.status === "saving"}
              />
            )}

          {state.status === "error" && (
            <div className="space-y-4">
              <div className="text-sm text-accent-red bg-accent-red/10 border border-accent-red/30 rounded p-3">
                {state.error}
              </div>
              {editedPlan && (
                <PreviewForm
                  plan={editedPlan}
                  onChange={setEditedPlan}
                  saving={false}
                />
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-[var(--bg-card-border)] flex items-center justify-end gap-2">
          <button
            onClick={close}
            className="px-3 py-1.5 text-xs text-text-muted hover:text-text-body"
          >
            Cancel
          </button>
          {state.status === "error" && !editedPlan && (
            <button
              onClick={retry}
              className="px-3 py-1.5 text-xs bg-accent-amber/20 text-accent-amber rounded hover:bg-accent-amber/30"
            >
              Try Again
            </button>
          )}
          {(state.status === "preview" ||
            state.status === "error" ||
            state.status === "saving") &&
            editedPlan && (
              <button
                onClick={() => editedPlan && save(editedPlan)}
                disabled={state.status === "saving"}
                className={cn(
                  "px-3 py-1.5 text-xs rounded font-semibold",
                  "bg-accent-amber/20 text-accent-amber hover:bg-accent-amber/30",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {state.status === "saving" ? "Saving..." : "Save to Vault"}
              </button>
            )}
        </div>
      </div>
    </div>
  );
}

interface PreviewFormProps {
  plan: RoutingPlan;
  onChange: (plan: RoutingPlan) => void;
  saving: boolean;
}

function PreviewForm({ plan, onChange, saving }: PreviewFormProps) {
  return (
    <div className="space-y-4">
      <Field label="Action">
        <div className="text-sm text-text-body">
          {plan.action === "append" ? "Append to" : "Create new"}
        </div>
      </Field>

      <Field label="Target">
        <input
          type="text"
          value={plan.targetTitle}
          onChange={(e) => onChange({ ...plan, targetTitle: e.target.value })}
          disabled={saving}
          className="w-full px-2 py-1 text-sm bg-[var(--bg-card)] border border-[var(--bg-card-border)] rounded text-text-body"
        />
        <div className="text-[10px] text-text-muted mt-1 font-mono">
          {plan.targetPath}
        </div>
      </Field>

      <Field label="Reasoning">
        <div className="text-xs text-text-muted italic">{plan.reasoning}</div>
      </Field>

      {plan.detectedPeople.length > 0 && (
        <Field label="Detected People">
          <div className="flex flex-wrap gap-1">
            {plan.detectedPeople.map((p) => (
              <span
                key={p}
                className="text-[10px] px-1.5 py-0.5 bg-accent-teal/20 text-accent-teal rounded"
              >
                {p}
              </span>
            ))}
          </div>
        </Field>
      )}

      {plan.detectedTopics.length > 0 && (
        <Field label="Detected Topics">
          <div className="flex flex-wrap gap-1">
            {plan.detectedTopics.map((t) => (
              <span
                key={t}
                className="text-[10px] px-1.5 py-0.5 bg-accent-amber/20 text-accent-amber rounded"
              >
                {t}
              </span>
            ))}
          </div>
        </Field>
      )}

      <Field label="Content Preview (editable)">
        <textarea
          value={plan.formattedContent}
          onChange={(e) =>
            onChange({ ...plan, formattedContent: e.target.value })
          }
          disabled={saving}
          rows={12}
          className="w-full px-2 py-1 text-xs font-mono bg-[var(--bg-card)] border border-[var(--bg-card-border)] rounded text-text-body resize-y"
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">
        {label}
      </div>
      {children}
    </div>
  );
}
