import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    rollupOptions: {
      output: {
        // Lección NATO Marketing Studio: NO separar @radix-ui de react.
        // Rompe con "Cannot read properties of undefined (reading 'forwardRef')"
        // en producción minificada. Mantener todo el ecosistema React-context
        // junto en el chunk principal.
        manualChunks: id => {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/lucide-react/')) return 'icons';
          if (id.includes('/@supabase/')) return 'supabase';
          if (id.includes('/recharts/') || id.includes('/d3-')) return 'charts';
          return undefined;
        },
      },
    },
  },
}));
