"use client";
import { cn } from "@/lib/utils";

export function WeatherCard() {
  return (
    <section className="glass-card anim-card relative overflow-hidden">
      {/* Amber gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[rgba(212,164,76,0.08)] to-transparent pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-text-muted text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>San Clemente, CA</span>
          </div>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="1.5">
            <circle cx="12" cy="12" r="4" fill="var(--accent-amber)" opacity="0.3" />
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="22" />
            <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
            <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
            <line x1="2" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
            <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
          </svg>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-semibold text-text-heading">82°F</span>
          <span className="text-text-muted">/</span>
          <span className="text-lg text-text-muted">55°F</span>
        </div>
        <p className="text-sm text-text-body mb-1">Sunny — lots of sunshine</p>
        <p className="text-xs text-text-muted mb-4">Winds W 5 mph · Currently 68°F</p>
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Precip", value: "1%" },
            { label: "Humidity", value: "86%" },
            { label: "UV", value: "6" },
            { label: "Sunrise", value: "6:21 AM" },
            { label: "Sunset", value: "5:45 PM" },
          ].map((d) => (
            <div key={d.label} className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-text-muted mb-0.5">
                {d.label}
              </div>
              <div className="text-sm font-medium text-text-heading">{d.value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
