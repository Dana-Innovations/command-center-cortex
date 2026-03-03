"use client";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  accentColor?: 'amber' | 'teal' | 'red' | 'green';
  noPadding?: boolean;
  animDelay?: number;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, accentColor, noPadding, animDelay = 0, children, style, ...props }, ref) => {
    const accentBorders = {
      amber: 'border-l-4 border-l-accent-amber',
      teal: 'border-l-4 border-l-accent-teal',
      red: 'border-l-4 border-l-accent-red',
      green: 'border-l-4 border-l-accent-green',
    };
    return (
      <div
        ref={ref}
        className={cn(
          'glass-card anim-card',
          accentColor && accentBorders[accentColor],
          !noPadding && 'p-6',
          className
        )}
        style={{ animationDelay: `${animDelay * 80}ms`, ...style }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
GlassCard.displayName = 'GlassCard';
