"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface ParsedRule {
  provider: string | null;
  entity_id: string | null;
  entity_name: string | null;
  condition_type: string;
  condition_value: string;
  override_tier: string;
}

interface FocusExceptionsProps {
  provider?: string;
  providerLabel?: string;
  resources?: Array<{ id: string; name: string }>;
  onSave: (rules: ParsedRule[]) => void;
  onSkip: () => void;
}

function RuleChip({ rule, onRemove }: { rule: ParsedRule; onRemove: () => void }) {
  const tierLabel =
    rule.override_tier === "critical"
      ? "Important"
      : rule.override_tier === "quiet"
        ? "Background"
        : rule.override_tier === "muted"
          ? "Muted"
          : "Normal";

  const tierColor =
    rule.override_tier === "critical"
      ? "text-accent-amber border-accent-amber/25 bg-accent-amber/[0.08]"
      : rule.override_tier === "quiet" || rule.override_tier === "muted"
        ? "text-text-muted border-white/10 bg-white/[0.03]"
        : "text-accent-teal border-accent-teal/25 bg-accent-teal/[0.08]";

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${tierColor}`}>
      <span>
        {rule.condition_type === "topic" && "Topic: "}
        {rule.condition_type === "sender" && "From: "}
        {rule.condition_type === "keyword" && "Keyword: "}
        {rule.condition_type === "label" && "Label: "}
        {rule.condition_type === "mention" && "When mentioned in: "}
        <span className="font-medium">{rule.condition_value}</span>
        {rule.entity_name && <span className="text-text-muted"> in {rule.entity_name}</span>}
        {" →"} {tierLabel}
      </span>
      <button
        onClick={onRemove}
        className="text-text-muted hover:text-text-body transition-colors"
      >
        ×
      </button>
    </div>
  );
}

export function FocusExceptions({
  provider,
  providerLabel,
  resources,
  onSave,
  onSkip,
}: FocusExceptionsProps) {
  const [text, setText] = useState("");
  const [rules, setRules] = useState<ParsedRule[]>([]);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseRules = useCallback(async () => {
    if (!text.trim()) return;
    setParsing(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/parse-focus-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, provider, resources }),
      });

      if (!res.ok) throw new Error("Failed to parse rules");

      const data = await res.json();
      if (data.rules && Array.isArray(data.rules)) {
        setRules((prev) => [...prev, ...data.rules]);
        setText("");
      }
    } catch {
      setError("Couldn't parse that. Try rephrasing.");
    } finally {
      setParsing(false);
    }
  }, [text, provider, resources]);

  const removeRule = useCallback((index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-teal mb-2">
        {provider ? `Exceptions for ${providerLabel}` : "Global rules"}
      </div>
      <p className="text-xs text-text-muted mb-3">
        {provider
          ? "Describe any exceptions in plain English. For example: \"Brand Marketing is background, except luxury residential topics.\""
          : "Rules that apply across all your tools. For example: \"Anything from my direct reports is always important.\""}
      </p>

      {rules.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {rules.map((rule, i) => (
            <RuleChip key={i} rule={rule} onRemove={() => removeRule(i)} />
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !parsing && parseRules()}
          placeholder={
            provider
              ? "e.g., SLT Kanban is important except status updates..."
              : "e.g., Anything from Sarah Chen is always important..."
          }
          className="flex-1 rounded-lg border border-[var(--bg-card-border)] bg-white/[0.03] px-3 py-2 text-sm text-text-body placeholder:text-text-muted/50 focus:border-accent-teal/40 focus:outline-none transition-colors"
          disabled={parsing}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={parseRules}
          disabled={!text.trim() || parsing}
        >
          {parsing ? "Parsing..." : "Add rule"}
        </Button>
      </div>

      {error && <p className="mt-2 text-xs text-accent-red">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <Button variant="primary" size="sm" onClick={() => onSave(rules)}>
          {rules.length > 0 ? "Save rules & continue" : "Continue"}
        </Button>
        <button
          className="text-sm text-text-muted underline underline-offset-2 hover:text-text-body"
          onClick={onSkip}
        >
          Skip
        </button>
      </div>
    </div>
  );
}
