import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const textareaVariants = cva(
  "w-full min-h-[120px] resize-none rounded-xl border bg-transparent px-3 py-2.5 text-sm text-text-body outline-none transition-colors duration-200 placeholder:text-text-muted/60 disabled:pointer-events-none disabled:opacity-50",
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
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(textareaVariants({ variant, className }))}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea, textareaVariants };
