import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[var(--tab-bg)] text-text-body",
        primary: "bg-[var(--accent-amber-dim)] text-accent-amber",
        success: "bg-[rgba(90,199,139,0.12)] text-accent-green",
        error: "bg-[var(--accent-red-dim)] text-accent-red",
        warning: "bg-[var(--accent-amber-dim)] text-accent-amber",
        info: "bg-[var(--accent-teal-dim)] text-accent-teal",
        outline: "border border-[var(--bg-card-border)] text-text-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

/* Chip: a small tag-like element for source labels */
const chipVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
  {
    variants: {
      source: {
        email: "tag-email",
        teams: "tag-teams",
        asana: "tag-asana",
        slack: "tag-slack",
        default: "bg-[var(--tab-bg)] text-text-muted",
      },
    },
    defaultVariants: {
      source: "default",
    },
  }
);

export interface ChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof chipVariants> {}

const Chip = React.forwardRef<HTMLSpanElement, ChipProps>(
  ({ className, source, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(chipVariants({ source }), className)}
      {...props}
    />
  )
);
Chip.displayName = "Chip";

export { Badge, badgeVariants, Chip, chipVariants };
