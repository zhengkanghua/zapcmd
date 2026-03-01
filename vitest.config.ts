import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
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
        lines: 85,
        functions: 85,
        statements: 85,
        branches: 80
      }
    }
  }
});
