"use client";

import { useMemo } from "react";
import { useSalesforce } from "@/hooks/useSalesforce";
import type { SalesforceReport } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { SFLink } from "@/components/ui/icons";

interface ReportView {
  name: string;
  lastRun: string;
  metrics: { label: string; value: string }[];
  sfUrl: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function reportToView(report: SalesforceReport): ReportView {
  const summary = report.summary_data as Record<string, unknown>;
  const metrics: { label: string; value: string }[] = [];
  if (summary && typeof summary === "object") {
    for (const [key, val] of Object.entries(summary)) {
      if (val !== null && val !== undefined) {
        const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        metrics.push({ label, value: String(val) });
      }
    }
  }
  return {
    name: report.name,
    lastRun: formatDate(report.last_run_date),
    metrics: metrics.slice(0, 4),
    sfUrl: report.sf_url,
  };
}

export function SalesforceReports() {
  const { reports: rawReports, loading } = useSalesforce();

  const reports = useMemo(() => {
    return rawReports.map(reportToView);
  }, [rawReports]);

  return (
    <section className="glass-card anim-card" style={{ animationDelay: "400ms" }}>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-text-heading mb-4">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0070D2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        Salesforce Reports
        {loading && <span className="text-[10px] text-text-muted font-normal">(loading…)</span>}
      </h2>

      {reports.length === 0 ? (
        <EmptyState />
      ) : (
      <div className="space-y-4">
        {reports.map((report) => (
          <div key={report.name} className="p-3 rounded-lg border border-[var(--bg-card-border)] bg-[var(--bg-secondary)]/30">
            <div className="flex items-start justify-between mb-2">
              <div>
                {report.sfUrl ? (
                  <a className="hot-link text-xs font-semibold text-text-heading" href={report.sfUrl} target="_blank" rel="noopener noreferrer">
                    {report.name}
                  </a>
                ) : (
                  <div className="text-xs font-semibold text-text-heading">{report.name}</div>
                )}
                <div className="text-[10px] text-text-muted mt-0.5">Last run: {report.lastRun}</div>
              </div>
              {report.sfUrl && <SFLink url={report.sfUrl} />}
            </div>
            <div className="flex flex-wrap gap-3">
              {report.metrics.map((m) => (
                <div key={m.label} className="text-center">
                  <div className="text-sm font-bold text-text-heading">{m.value}</div>
                  <div className="text-[10px] text-text-muted">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      )}
    </section>
  );
}
