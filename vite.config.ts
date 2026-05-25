import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Visualizer: corre solo en `BUNDLE_STATS=1 npm run build` para no slow downear
    // cada build. Genera dist/stats.html con sunburst del bundle.
    process.env.BUNDLE_STATS === "1" && visualizer({
      filename: "dist/stats.html",
      gzipSize: true,
      brotliSize: true,
      template: "treemap",
    }),
  ].filter(Boolean),
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
          // Sonner toast — pesa ~10KB y se carga solo cuando se llama
          if (id.includes('/sonner/')) return 'toast';
          // Date-fns es chunky cuando muchos pages lo importan
          if (id.includes('/date-fns/')) return 'date-fns';
          return undefined;
        },
      },
    },
  },
}));
