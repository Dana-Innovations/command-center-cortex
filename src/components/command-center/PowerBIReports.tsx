"use client";

import { useState } from "react";
import { usePowerBI } from "@/hooks/usePowerBI";
import { PowerBIEmbed } from "@/components/powerbi/PowerBIEmbed";
import { FileBarChart, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

export function PowerBIReports() {
  const { reportConfigs, loading, error } = usePowerBI();
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  if (loading) {
    return (
      <section className="glass-card anim-card">
        <div className="flex items-center gap-2 mb-4">
          <FileBarChart className="w-4 h-4 text-[#4ECDC4]" />
          <h2 className="text-sm font-semibold text-text-heading">Power BI Reports</h2>
        </div>
        <div className="text-sm text-text-muted animate-pulse">Loading reports...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="glass-card anim-card">
        <div className="flex items-center gap-2 mb-4">
          <FileBarChart className="w-4 h-4 text-[#4ECDC4]" />
          <h2 className="text-sm font-semibold text-text-heading">Power BI Reports</h2>
        </div>
        <div className="text-sm text-accent-red">{error}</div>
      </section>
    );
  }

  if (reportConfigs.length === 0) {
    return (
      <section className="glass-card anim-card">
        <div className="flex items-center gap-2 mb-4">
          <FileBarChart className="w-4 h-4 text-[#4ECDC4]" />
          <h2 className="text-sm font-semibold text-text-heading">Power BI Reports</h2>
        </div>
        <div className="text-sm text-text-muted">
          No reports configured. Add report configs to the powerbi_report_configs table.
        </div>
      </section>
    );
  }

  return (
    <section className="glass-card anim-card">
      <div className="flex items-center gap-2 mb-4">
        <FileBarChart className="w-4 h-4 text-[#4ECDC4]" />
        <h2 className="text-sm font-semibold text-text-heading">Power BI Reports</h2>
      </div>

      <div className="space-y-3">
        {reportConfigs.map((report) => {
          const isExpanded = expandedReport === report.report_id;
          const pbiUrl = `https://app.powerbi.com/groups/${report.workspace_id}/reports/${report.report_id}`;

          return (
            <div
              key={report.id}
              className="border border-[var(--bg-card-border)] rounded-lg overflow-hidden"
            >
              <div className="flex items-center justify-between p-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-heading truncate">
                    {report.report_name}
                  </div>
                  {report.description && (
                    <div className="text-xs text-text-muted mt-0.5 truncate">
                      {report.description}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <a
                    href={pbiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded hover:bg-white/5 transition-colors"
                    title="Open in Power BI"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
                  </a>
                  <button
                    onClick={() =>
                      setExpandedReport(isExpanded ? null : report.report_id)
                    }
                    className="p-1.5 rounded hover:bg-white/5 transition-colors"
                    title={isExpanded ? "Collapse" : "Embed inline"}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-text-muted" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
                    )}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-[var(--bg-card-border)]">
                  <PowerBIEmbed
                    reportId={report.report_id}
                    workspaceId={report.workspace_id}
                    height="500px"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
