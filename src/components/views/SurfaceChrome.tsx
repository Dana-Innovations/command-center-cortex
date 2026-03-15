"use client";

import { cn } from "@/lib/utils";

interface SurfaceIntroProps {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}

export function SurfaceIntro({
  eyebrow,
  title,
  description,
  actions,
}: SurfaceIntroProps) {
  return (
    <section className="glass-card anim-card overflow-hidden" style={{ animationDelay: "40ms" }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,163,225,0.15),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(0,178,169,0.08),transparent_32%)]" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow && (
            <div className="text-[11px] uppercase tracking-[0.28em] text-accent-amber">
              {eyebrow}
            </div>
          )}
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-text-heading">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
            {description}
          </p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

interface SurfaceSubnavProps<T extends string> {
  items: Array<{ id: T; label: string }>;
  active: T;
  onChange: (id: T) => void;
}

export function SurfaceSubnav<T extends string>({
  items,
  active,
  onChange,
}: SurfaceSubnavProps<T>) {
  return (
    <div className="glass-card anim-card p-2" style={{ animationDelay: "80ms" }}>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              "rounded-2xl px-4 py-2 text-sm font-medium transition-colors",
              active === item.id
                ? "bg-[var(--tab-active-bg)] text-text-heading"
                : "text-text-muted hover:text-text-body"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
