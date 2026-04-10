"use client";

import { useState, useCallback } from "react";
import type {
  CaptureRequest,
  CaptureSourceType,
  CaptureSourceMeta,
  RoutingPlan,
} from "@/lib/capture-routing";

type CaptureState =
  | { status: "closed" }
  | { status: "analyzing"; request: CaptureRequest }
  | { status: "preview"; request: CaptureRequest; plan: RoutingPlan }
  | { status: "saving"; request: CaptureRequest; plan: RoutingPlan }
  | { status: "error"; request: CaptureRequest; plan: RoutingPlan | null; error: string };

export interface UseVaultCaptureReturn {
  state: CaptureState;
  isOpen: boolean;
  open: (
    content: string,
    sourceType: CaptureSourceType,
    sourceMeta: CaptureSourceMeta
  ) => Promise<void>;
  close: () => void;
  save: (editedPlan: RoutingPlan) => Promise<void>;
  retry: () => Promise<void>;
}

/**
 * Hook that manages the capture drawer state machine.
 * Calls /api/ai/vault-capture on open, /api/vault/write on save.
 */
export function useVaultCapture(): UseVaultCaptureReturn {
  const [state, setState] = useState<CaptureState>({ status: "closed" });

  const open = useCallback(
    async (
      content: string,
      sourceType: CaptureSourceType,
      sourceMeta: CaptureSourceMeta
    ) => {
      const request: CaptureRequest = { content, sourceType, sourceMeta };
      setState({ status: "analyzing", request });

      try {
        const res = await fetch("/api/ai/vault-capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        if (!res.ok) {
          const errBody = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(errBody?.error || `HTTP ${res.status}`);
        }

        const plan = (await res.json()) as RoutingPlan;
        setState({ status: "preview", request, plan });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        setState({
          status: "error",
          request,
          plan: null,
          error: message,
        });
      }
    },
    []
  );

  const save = useCallback(
    async (editedPlan: RoutingPlan) => {
      if (state.status !== "preview" && state.status !== "error") return;

      const request = state.request;

      setState({ status: "saving", request, plan: editedPlan });

      try {
        const res = await fetch("/api/vault/write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: editedPlan.action,
            targetPath: editedPlan.targetPath,
            targetTitle: editedPlan.targetTitle,
            formattedContent: editedPlan.formattedContent,
            detectedPeople: editedPlan.detectedPeople,
            detectedTopics: editedPlan.detectedTopics,
            sourceType: request.sourceType,
            sourceUrl: request.sourceMeta.url,
          }),
        });

        if (!res.ok) {
          const errBody = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(errBody?.error || `HTTP ${res.status}`);
        }

        setState({ status: "closed" });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        setState({
          status: "error",
          request,
          plan: editedPlan,
          error: message,
        });
      }
    },
    [state]
  );

  const close = useCallback(() => {
    setState({ status: "closed" });
  }, []);

  const retry = useCallback(async () => {
    if (state.status !== "error") return;
    await open(
      state.request.content,
      state.request.sourceType,
      state.request.sourceMeta
    );
  }, [state, open]);

  return {
    state,
    isOpen: state.status !== "closed",
    open,
    close,
    save,
    retry,
  };
}
