"use client";

import { cn } from "@/lib/utils";

/* ─── Primitives ─── */

export function SkeletonBox({
  className,
  rounded = "rounded-lg",
}: {
  className?: string;
  rounded?: string;
}) {
  return <div className={cn("skeleton-shimmer", rounded, className)} />;
}

export function SkeletonCircle({
  size = "md",
}: {
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  }[size];

  return <div className={cn("skeleton-shimmer rounded-full", sizeClass)} />;
}

export function SkeletonText({
  lines = 3,
  lastLineWidth = "w-3/4",
}: {
  lines?: number;
  lastLineWidth?: string;
}) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox
          key={i}
          className={cn(
            "h-3",
            i === lines - 1 ? lastLineWidth : "w-full"
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("glass-card", className)}>
      {children}
    </div>
  );
}

/* ─── Transition Wrapper ─── */

export function SkeletonTransition({
  loading,
  skeleton,
  children,
}: {
  loading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}) {
  if (loading) {
    return <>{skeleton}</>;
  }

  return (
    <div key="loaded" className="skeleton-fade-in">
      {children}
    </div>
  );
}
