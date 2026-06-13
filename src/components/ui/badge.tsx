import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badge — pills refinadas. Variants nuevas:
 *  - default:    primary sólido (atención)
 *  - secondary:  gris suave
 *  - soft:       primary tint (más sutil)
 *  - outline:    border, texto neutro
 *  - success:    verde tint
 *  - warning:    yellow tint
 *  - destructive: rojo
 *
 * Type usage: pills informativas (categorías, status, badges).
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full font-medium transition-colors duration-150 select-none",
  {
    variants: {
      variant: {
        default:     "bg-primary text-primary-foreground",
        secondary:   "bg-secondary text-secondary-foreground",
        soft:        "bg-primary/10 text-primary",
        outline:     "border border-border bg-transparent text-foreground",
        success:     "bg-accent/12 text-accent border border-accent/20",
        warning:     "bg-warning/15 text-warning border border-warning/25",
        destructive: "bg-destructive/10 text-destructive border border-destructive/20",
      },
      size: {
        default: "h-6 px-2.5 text-xs",
        sm:      "h-5 px-2 text-[10px]",
        lg:      "h-7 px-3 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
