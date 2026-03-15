"use client";

import { Button } from "@/components/ui/button";

interface SurfaceConnectStateProps {
  title: string;
  description: string;
  services: string[];
  onOpenSetup?: () => void;
}

export function SurfaceConnectState({
  title,
  description,
  services,
  onOpenSetup,
}: SurfaceConnectStateProps) {
  return (
    <section className="glass-card anim-card text-center" style={{ animationDelay: "120ms" }}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </div>
      <h2 className="mt-4 text-xl font-semibold text-text-heading">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-text-muted">
        {description}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {services.map((service) => (
          <span
            key={service}
            className="rounded-full border border-[var(--bg-card-border)] bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-text-muted"
          >
            {service}
          </span>
        ))}
      </div>
      {onOpenSetup && (
        <div className="mt-5">
          <Button variant="primary" size="sm" onClick={onOpenSetup}>
            Open Setup & Focus
          </Button>
        </div>
      )}
    </section>
  );
}
