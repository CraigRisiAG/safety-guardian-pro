import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
      include: [
        "src/lib/drillsStorage.ts",
        "src/lib/incidentsStorage.ts",
        "src/lib/personnelAccess.ts",
        "src/hooks/useDrillStatus.ts",
        "src/pages/Drills.tsx",
        "src/pages/Incidents.tsx",
        "src/pages/CheckIn.tsx",
      ],
      thresholds: {
        statements: 35,
        branches: 25,
        functions: 35,
        lines: 35,
      },
    },
  },
}));
