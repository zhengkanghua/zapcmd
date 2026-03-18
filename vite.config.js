import { existsSync, readFileSync } from "node:fs";
import { defineConfig } from "vite";

import {
  createNoSpawnTypeScriptPlugin,
  createNoSpawnVueSfcPlugin
} from "./scripts/vitest/no-spawn-vite-plugins.js";

function parseEnvKeys(content) {
  const result = {};
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

function readEnvKeys() {
  const base = parseEnvKeys(readFileSync(".env.keys", "utf-8"));
  const local = existsSync(".env.keys.local")
    ? parseEnvKeys(readFileSync(".env.keys.local", "utf-8"))
    : {};
  return { ...base, ...local };
}

function readPackageVersion() {
  const raw = readFileSync("package.json", "utf-8");
  const parsed = JSON.parse(raw);
  return typeof parsed.version === "string" ? parsed.version : "";
}

const envKeys = readEnvKeys();
const appVersion = readPackageVersion();

async function canUseEsbuild() {
  try {
    const esbuild = await import("esbuild");
    await esbuild.transform("export const __zapcmd_esbuild_probe = 1", {
      loader: "js"
    });
    return true;
  } catch {
    return false;
  }
}

export default defineConfig(async ({ mode }) => {
  const noSpawn =
    process.env.ZAPCMD_NO_SPAWN === "1" || !(await canUseEsbuild());

  const nodeEnvReplacement = JSON.stringify(
    process.env.NODE_ENV || mode || "development"
  );

  const nodeEnvShimPlugin = () => ({
    name: "zapcmd:node-env-shim",
    enforce: "pre",
    transform(code, id, options) {
      if (options?.ssr === true) {
        return null;
      }

      if (
        !code.includes("process.env.NODE_ENV") &&
        !code.includes("global.process.env.NODE_ENV") &&
        !code.includes("globalThis.process.env.NODE_ENV")
      ) {
        return null;
      }

      const next = code
        .replaceAll("globalThis.process.env.NODE_ENV", nodeEnvReplacement)
        .replaceAll("global.process.env.NODE_ENV", nodeEnvReplacement)
        .replaceAll("process.env.NODE_ENV", nodeEnvReplacement);

      return { code: next, map: null };
    }
  });

  const plugins = noSpawn
    ? [
        nodeEnvShimPlugin(),
        createNoSpawnVueSfcPlugin(),
        createNoSpawnTypeScriptPlugin()
      ]
    : [(await import("@vitejs/plugin-vue")).default()];

  const baseBuild = {
    target:
      process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      input: {
        main: "index.html",
        settings: "settings.html"
      }
    }
  };

  return {
    plugins,
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __GITHUB_OWNER__: JSON.stringify(envKeys.GITHUB_OWNER ?? ""),
      __GITHUB_REPO__: JSON.stringify(envKeys.GITHUB_REPO ?? "")
    },
    clearScreen: false,
    esbuild: noSpawn ? false : undefined,
    optimizeDeps: noSpawn
      ? {
          noDiscovery: true,
          include: [],
          esbuildOptions: { preserveSymlinks: true }
        }
      : undefined,
    resolve: noSpawn ? { preserveSymlinks: true } : undefined,
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
    build: noSpawn
      ? { ...baseBuild, minify: false, cssMinify: false }
      : baseBuild
  };
});
