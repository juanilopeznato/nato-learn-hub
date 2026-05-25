import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Card system — rediseño 2026.
 *
 * Variants:
 *  - default:    border + bg-card + shadow-sm
 *  - elevated:   sin border, shadow-md (más prominent)
 *  - flat:       sin border ni shadow (para grids densos)
 *  - interactive: hover lift + cursor pointer
 *  - glass:      backdrop blur + bg semi-transparente
 *  - gradient:   mesh gradient bg sutil (para highlights)
 *
 * Border radius escalado: por defecto `rounded-xl` (16px) — más friendly que 12.
 */
const cardVariants = cva(
  "rounded-xl bg-card text-card-foreground transition-shadow duration-200 ease-apple",
  {
    variants: {
      variant: {
        default:     "border border-border/60 shadow-xs",
        elevated:    "shadow-md hover:shadow-lg",
        flat:        "border border-border/40",
        interactive: "border border-border/60 shadow-xs hover:shadow-md hover:border-border/80 cursor-pointer hover:-translate-y-0.5 transition-all",
        glass:       "border border-border/40 bg-card/70 backdrop-blur-md",
        gradient:    "border border-primary/20 bg-mesh-purple",
      },
      padding: {
        none: "",
        sm:   "p-4",
        md:   "p-6",
        lg:   "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "none",
    },
  },
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant, padding, className }))} {...props} />
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6 pb-4", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("font-heading text-xl font-semibold leading-tight tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground leading-relaxed", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center gap-3 p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
