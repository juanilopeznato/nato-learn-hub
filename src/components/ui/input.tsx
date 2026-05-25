import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Input — rediseño 2026.
 *  - Altura 11 (44px) por defecto: WCAG AA touch target
 *  - Border más sutil (border/70), focus con primary ring sin offset feo
 *  - Placeholder más light
 *  - Padding generoso
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-md border border-border bg-background px-3.5 text-sm transition-all duration-200 ease-apple",
          "placeholder:text-muted-foreground/70",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "focus-visible:outline-none focus-visible:border-primary/50 focus-visible:shadow-focus",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-secondary/50",
          "hover:border-border/80",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
