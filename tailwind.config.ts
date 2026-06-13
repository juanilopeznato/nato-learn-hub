import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1.5rem", lg: "2rem" },
      screens: {
        "2xl": "1280px", // antes 1400 — más respiración a los lados en monitors grandes
      },
    },
    extend: {
      fontFamily: {
        sans: ["Montserrat", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        heading: ["Cormorant Garamond", "Georgia", "serif"],
        serif: ["Cormorant Garamond", "Georgia", "serif"],
        mono: ["ui-monospace", "SF Mono", "Menlo", "monospace"],
      },
      // Tipografía con tracking/leading optimizados (Apple/Stripe-style)
      fontSize: {
        // Display sizes (heading) — tight tracking
        "display-2xl": ["4.5rem", { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "700" }],
        "display-xl":  ["3.75rem", { lineHeight: "1.05", letterSpacing: "-0.028em", fontWeight: "700" }],
        "display-lg":  ["3rem", { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "700" }],
        "display-md":  ["2.25rem", { lineHeight: "1.15", letterSpacing: "-0.022em", fontWeight: "700" }],
        "display-sm":  ["1.875rem", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "600" }],
        // Body
        "body-lg":  ["1.125rem", { lineHeight: "1.6", letterSpacing: "-0.01em" }],
        "body-md":  ["1rem", { lineHeight: "1.6", letterSpacing: "-0.008em" }],
        "body-sm":  ["0.875rem", { lineHeight: "1.55", letterSpacing: "-0.006em" }],
        "body-xs":  ["0.75rem", { lineHeight: "1.5", letterSpacing: "0" }],
        "eyebrow":  ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.08em", fontWeight: "600" }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "hsl(var(--primary-50))",
          100: "hsl(var(--primary-100))",
          200: "hsl(var(--primary-200))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        nato: {
          dark: "hsl(var(--nato-dark))",
          "dark-secondary": "hsl(var(--nato-dark-secondary))",
          purple: "hsl(var(--primary))",
          "purple-glow": "hsl(var(--nato-purple-glow))",
          green: "hsl(var(--accent))",
          "green-glow": "hsl(var(--nato-green-glow))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        // Escala más clara y generosa (Apple-style)
        "2xs": "0.25rem",   // 4
        xs:   "0.5rem",     // 8
        sm:   "0.625rem",   // 10
        md:   "0.75rem",    // 12 — buttons
        lg:   "var(--radius)", // 14 default
        xl:   "1rem",       // 16 — cards small
        "2xl":"1.25rem",    // 20 — cards
        "3xl":"1.5rem",     // 24 — modals, hero
        "4xl":"2rem",       // 32 — large hero
      },
      boxShadow: {
        // Sombras multilayer estilo Apple HIG — sutiles pero con profundidad
        "xs":  "0 1px 2px 0 rgb(0 0 0 / 0.04)",
        "sm":  "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        "md":  "0 4px 12px -2px rgb(0 0 0 / 0.06), 0 2px 4px -1px rgb(0 0 0 / 0.04)",
        "lg":  "0 12px 24px -4px rgb(0 0 0 / 0.08), 0 4px 8px -2px rgb(0 0 0 / 0.05)",
        "xl":  "0 24px 48px -8px rgb(0 0 0 / 0.1), 0 8px 16px -4px rgb(0 0 0 / 0.06)",
        "2xl": "0 40px 80px -12px rgb(0 0 0 / 0.18), 0 16px 32px -8px rgb(0 0 0 / 0.08)",
        // Sombras con color (botones primary, accent CTAs)
        "primary-md": "0 8px 24px -4px hsl(var(--primary) / 0.35), 0 4px 8px -2px hsl(var(--primary) / 0.2)",
        "primary-lg": "0 16px 40px -8px hsl(var(--primary) / 0.4), 0 8px 16px -4px hsl(var(--primary) / 0.25)",
        // Focus ring
        "focus": "0 0 0 3px hsl(var(--primary) / 0.18)",
      },
      transitionTimingFunction: {
        // Curva "Apple" estándar — perfecto para hover/click
        "apple": "cubic-bezier(0.16, 1, 0.3, 1)",
        "out-expo": "cubic-bezier(0.19, 1, 0.22, 1)",
      },
      backgroundImage: {
        // Mesh gradients para heroes (mejor que linear gradient cliché)
        "mesh-purple": "radial-gradient(at 20% 0%, hsl(var(--primary) / 0.15) 0px, transparent 50%), radial-gradient(at 80% 100%, hsl(var(--accent) / 0.12) 0px, transparent 50%), radial-gradient(at 50% 50%, hsl(var(--primary) / 0.08) 0px, transparent 70%)",
        "mesh-dark":   "radial-gradient(at 20% 0%, hsl(258 91% 55% / 0.4) 0px, transparent 50%), radial-gradient(at 80% 100%, hsl(166 71% 52% / 0.25) 0px, transparent 50%), radial-gradient(at 50% 50%, hsl(258 91% 55% / 0.2) 0px, transparent 70%)",
        "grid-light":  "linear-gradient(to right, rgb(0 0 0 / 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgb(0 0 0 / 0.04) 1px, transparent 1px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "slide-up": "slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in": "fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "scale-in": "scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "shimmer": "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
