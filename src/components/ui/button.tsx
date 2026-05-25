import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Button system — rediseño 2026 inspirado en Linear/Stripe/Apple HIG.
 *
 * Variants:
 *  - default:   primary sólido con tinted shadow (no gradient)
 *  - hero:      primary refinado para CTAs principales
 *  - secondary: gris claro, casi flat
 *  - outline:   border fino, fondo transparente
 *  - ghost:     sin border ni background hasta hover
 *  - soft:      primary tint suave (bg-primary/8) — para CTAs secundarios
 *  - link:      solo texto subrayado
 *  - destructive: rojo sólido con tinted shadow
 *  - accent:    verde sólido con tinted shadow
 *  - hero-outline: border primary, fill al hover
 *
 * Microinteractions:
 *  - active:scale-[0.98] — feedback de click
 *  - hover lifts shadow una capa
 *  - Transitions con apple easing
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-md font-medium text-sm",
    "transition-all duration-200 ease-apple",
    "active:scale-[0.98]",
    "focus-visible:outline-none focus-visible:shadow-focus",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        // Default = primary sólido refinado
        default: "bg-primary text-primary-foreground shadow-primary-md hover:shadow-primary-lg hover:brightness-110",
        // Hero = mismo que default pero con sombra mayor para landings
        hero: "bg-primary text-primary-foreground shadow-primary-lg hover:shadow-primary-lg hover:brightness-110 font-semibold",
        // Secondary = gris casi flat
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        // Outline = border, sin fill
        outline: "border border-border bg-background hover:bg-secondary/50",
        // Ghost = invisible hasta hover
        ghost: "hover:bg-secondary/60 hover:text-foreground",
        // Soft = primary tint (8% opacity bg)
        soft: "bg-primary/10 text-primary hover:bg-primary/15",
        // Link
        link: "text-primary underline-offset-4 hover:underline",
        // Destructive
        destructive: "bg-destructive text-destructive-foreground hover:brightness-110 shadow-sm",
        // Accent verde
        accent: "bg-accent text-accent-foreground hover:brightness-110 shadow-sm",
        // Hero outline — para CTAs secundarios en heroes
        "hero-outline": "border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground",
      },
      size: {
        default: "h-10 px-4 text-sm",
        sm: "h-8 px-3 text-xs gap-1.5 [&_svg]:size-3.5",
        lg: "h-12 px-6 text-base rounded-lg [&_svg]:size-[18px]",
        xl: "h-14 px-8 text-base rounded-xl [&_svg]:size-5 font-semibold",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8 [&_svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
