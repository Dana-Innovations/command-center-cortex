"use client";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

interface Segment {
  name: string;
  pct: number;
  color: string;
  flash?: boolean;
}

function pctColorClass(pct: number) {
  if (pct >= 100) return "text-accent-green";
  if (pct >= 70) return "text-accent-amber";
  return "text-accent-red";
}

function Sparkline() {
  const data = [48, 51, 53, 55, 57, 59];
  const w = 80;
  const h = 30;
  const min = Math.min(...data) - 5;
  const max = Math.max(...data) + 5;
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polyline = points.join(" ");
  const lastY = h - ((data[data.length - 1] - min) / range) * h;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E85D5D" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#E85D5D" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${polyline} ${w},${h}`}
        fill="url(#spark-grad)"
      />
      <polyline
        points={polyline}
        fill="none"
        stroke="#E85D5D"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={w} cy={lastY.toFixed(1)} r="2.5" fill="#E85D5D" />
    </svg>
  );
}

interface BookingsDashboardProps {
  segments?: Segment[];
}

export function BookingsDashboard({ segments = [] }: BookingsDashboardProps) {
  return (
    <section className="glass-card anim-card" style={{ animationDelay: "320ms" }}>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-text-heading mb-4">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="20" x2="12" y2="10" />
          <line x1="18" y1="20" x2="18" y2="4" />
          <line x1="6" y1="20" x2="6" y2="16" />
        </svg>
        Bookings Dashboard — Month Day 20 of 20 (Final Day)
      </h2>

      {segments.length === 0 ? (
        <EmptyState />
      ) : (
      <>
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">ALL CHANNELS</h3>
          <Sparkline />
        </div>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-2xl font-bold text-text-heading">$415,278</span>
          <span className="text-text-muted">/</span>
          <span className="text-lg text-text-muted">$702,959</span>
          <span className="text-sm font-bold text-accent-red">59%</span>
        </div>
      </div>

      <div className="space-y-3">
        {segments.map((seg) => (
          <div key={seg.name}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-body">{seg.name}</span>
              <span className={cn(
                "font-bold tabular-nums",
                pctColorClass(seg.pct),
                seg.flash && "flash-pulse"
              )}>
                {seg.pct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-[var(--progress-bg)]">
              <div
                className={cn("h-full rounded-full transition-all", seg.color, seg.flash && seg.pct < 50 && "flash-pulse")}
                style={{ width: `${Math.min(seg.pct, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      </>
      )}
    </section>
  );
}
