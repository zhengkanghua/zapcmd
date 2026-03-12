import { configDefaults, defineConfig } from "vitest/config";
import {
  createNoSpawnTypeScriptPlugin,
  createNoSpawnVueSfcPlugin
} from "./scripts/vitest/no-spawn-vite-plugins.js";

export default defineConfig({
  esbuild: false,
  plugins: [createNoSpawnVueSfcPlugin(), createNoSpawnTypeScriptPlugin()],
  test: {
    pool: "threads",
    environment: "jsdom",
    exclude: [...configDefaults.exclude, "**/.codex/**"],
    deps: {
      optimizer: {
        web: { enabled: false },
        ssr: { enabled: false }
      }
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: [
        "src/App.vue",
        "src/composables/**/*.ts",
        "src/features/**/*.ts",
        "src/services/**/*.ts",
        "src/stores/**/*.ts"
      ],
      exclude: ["**/*.d.ts"],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 90
      }
    }
  }
});
