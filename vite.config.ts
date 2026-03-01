import vue from "@vitejs/plugin-vue";
import { existsSync, readFileSync } from "node:fs";
import { defineConfig } from "vite";

function parseEnvKeys(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!key) {
      continue;
    }
    result[key] = value;
  }
  return result;
}

function readEnvKeys(): Record<string, string> {
  const base = parseEnvKeys(readFileSync(".env.keys", "utf-8"));
  const local = existsSync(".env.keys.local")
    ? parseEnvKeys(readFileSync(".env.keys.local", "utf-8"))
    : {};
  return { ...base, ...local };
}

function readPackageVersion(): string {
  const raw = readFileSync("package.json", "utf-8");
  const parsed = JSON.parse(raw) as { version?: unknown };
  return typeof parsed.version === "string" ? parsed.version : "";
}

const envKeys = readEnvKeys();
const appVersion = readPackageVersion();

export default defineConfig({
  plugins: [vue()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __GITHUB_OWNER__: JSON.stringify(envKeys.GITHUB_OWNER ?? ""),
    __GITHUB_REPO__: JSON.stringify(envKeys.GITHUB_REPO ?? "")
  },
  clearScreen: false,
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    watch: {
      // Prevent Rust-side rebuild artifacts from triggering Vite watcher churn in tauri:dev.
      ignored: ["**/src-tauri/**"]
    }
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG
  }
});
