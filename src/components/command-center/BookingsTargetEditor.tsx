"use client";
import { useState } from "react";
import type { BookingsTarget } from "@/lib/types";

const SEGMENT_COLORS = [
  { value: "bg-accent-teal", label: "Teal" },
  { value: "bg-accent-amber", label: "Amber" },
  { value: "bg-accent-red", label: "Red" },
  { value: "bg-[#0070D2]", label: "Blue" },
  { value: "bg-accent-green", label: "Green" },
  { value: "bg-[#A078DC]", label: "Purple" },
  { value: "bg-[#FF9F40]", label: "Orange" },
  { value: "bg-[#36A2EB]", label: "Sky" },
];

interface TargetRow {
  segment: string;
  target_amount: number;
  color: string;
}

interface BookingsTargetEditorProps {
  onClose: () => void;
  quarter: string;
  existingTargets: BookingsTarget[];
  onSave: (
    targets: {
      segment: string;
      target_amount: number;
      color?: string;
      display_order?: number;
    }[]
  ) => Promise<void>;
  saving: boolean;
}

export function BookingsTargetEditor({
  onClose,
  quarter,
  existingTargets,
  onSave,
  saving,
}: BookingsTargetEditorProps) {
  const [rows, setRows] = useState<TargetRow[]>(() => {
    if (existingTargets.length > 0) {
      return existingTargets.map((t) => ({
        segment: t.segment,
        target_amount: t.target_amount,
        color: t.color,
      }));
    }
    return [
      { segment: "Hospitality", target_amount: 0, color: "bg-accent-teal" },
      { segment: "Retail", target_amount: 0, color: "bg-accent-amber" },
      { segment: "Healthcare", target_amount: 0, color: "bg-accent-green" },
    ];
  });

  function addRow() {
    const nextColor =
      SEGMENT_COLORS[rows.length % SEGMENT_COLORS.length].value;
    setRows([...rows, { segment: "", target_amount: 0, color: nextColor }]);
  }

  function removeRow(index: number) {
    setRows(rows.filter((_, i) => i !== index));
  }

  function updateRow(index: number, field: keyof TargetRow, value: string | number) {
    setRows(
      rows.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  async function handleSave() {
    const validRows = rows.filter((r) => r.segment.trim() && r.target_amount > 0);
    if (validRows.length === 0) return;

    await onSave(
      validRows.map((r, i) => ({
        segment: r.segment.trim(),
        target_amount: r.target_amount,
        color: r.color,
        display_order: i,
      }))
    );
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass-card w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-heading">
            Set Quarterly Targets — {quarter}
          </h3>
          <button
            className="text-text-muted hover:text-text-heading transition-colors cursor-pointer"
            onClick={onClose}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-3 mb-4 max-h-[50vh] overflow-y-auto">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              {/* Color dot */}
              <select
                value={row.color}
                onChange={(e) => updateRow(i, "color", e.target.value)}
                className="bg-white/5 border border-white/10 rounded px-1 py-1.5 text-xs text-text-body cursor-pointer focus:outline-none"
              >
                {SEGMENT_COLORS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>

              {/* Segment name */}
              <input
                type="text"
                placeholder="Segment name"
                value={row.segment}
                onChange={(e) => updateRow(i, "segment", e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-text-body placeholder:text-text-muted focus:outline-none focus:border-accent-amber/30"
              />

              {/* Target amount */}
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                  $
                </span>
                <input
                  type="number"
                  placeholder="0"
                  value={row.target_amount || ""}
                  onChange={(e) =>
                    updateRow(i, "target_amount", Number(e.target.value) || 0)
                  }
                  className="w-28 bg-white/5 border border-white/10 rounded-lg pl-5 pr-2 py-1.5 text-xs text-text-body tabular-nums placeholder:text-text-muted focus:outline-none focus:border-accent-amber/30"
                />
              </div>

              {/* Remove button */}
              <button
                onClick={() => removeRow(i)}
                className="text-text-muted hover:text-accent-red transition-colors cursor-pointer"
                title="Remove"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={addRow}
            className="text-xs text-accent-teal hover:text-accent-teal/80 transition-colors cursor-pointer"
          >
            + Add Segment
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-text-muted hover:text-text-body transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || rows.every((r) => !r.segment.trim() || r.target_amount <= 0)}
              className="px-4 py-1.5 text-xs font-semibold bg-accent-teal/20 text-accent-teal rounded-lg hover:bg-accent-teal/30 transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Targets"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
