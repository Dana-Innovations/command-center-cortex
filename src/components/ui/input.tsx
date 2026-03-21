import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  "w-full rounded-xl border bg-transparent px-3 text-sm text-text-body outline-none transition-colors duration-200 placeholder:text-text-muted/60 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-[var(--bg-card-border)] focus:border-[var(--accent-blue)]/40 focus:ring-1 focus:ring-[var(--accent-blue)]/20",
        ghost:
          "border-transparent bg-[var(--tab-bg)] focus:border-[var(--accent-blue)]/30",
        error:
          "border-accent-red/40 focus:border-accent-red/60 focus:ring-1 focus:ring-accent-red/20",
      },
      size: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-10 px-3 text-sm",
        lg: "h-12 px-4 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(inputVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input, inputVariants };
