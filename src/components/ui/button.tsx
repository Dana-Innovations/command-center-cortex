import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--bg-card)] border border-[var(--bg-card-border)] text-text-body backdrop-blur-md hover:border-[var(--bg-card-hover-border)] hover:text-text-heading",
        primary:
          "bg-accent-amber text-[#0d0d0d] font-semibold hover:brightness-110 shadow-md shadow-accent-amber/20",
        secondary:
          "bg-[var(--tab-bg)] text-text-body hover:bg-[var(--tab-active-bg)] hover:text-accent-amber",
        ghost:
          "text-text-muted hover:text-text-body hover:bg-[var(--tab-bg)]",
        outline:
          "border border-[var(--bg-card-border)] bg-transparent text-text-body hover:border-accent-amber/40 hover:text-accent-amber",
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded-lg",
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-9 w-9 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
