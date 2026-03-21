import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const selectVariants = cva(
  "w-full appearance-none rounded-xl border bg-transparent px-3 text-sm text-text-body outline-none transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22%238f999f%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10",
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

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size">,
    VariantProps<typeof selectVariants> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(selectVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

export { Select, selectVariants };
