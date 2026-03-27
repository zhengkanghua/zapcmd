import { readFileSync } from "node:fs";
import path from "node:path";

import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import { beforeAll, describe, expect, it } from "vitest";

const tailwindEntryPath = path.resolve(process.cwd(), "src/styles/tailwind.css");

async function buildTailwindCss(): Promise<string> {
  const source = readFileSync(tailwindEntryPath, "utf8");
  const result = await postcss([tailwindcss()]).process(source, { from: tailwindEntryPath });
  return result.css;
}

describe("tailwind theme layer contract", () => {
  let compiledCss = "";

  beforeAll(async () => {
    compiledCss = await buildTailwindCss();
  }, 60_000);

  it("生成默认 scale utilities（避免 Settings UI 退回成方形/拥挤）", () => {
    const requiredSelectors = [".p-4", ".gap-4", ".rounded-2xl", ".font-semibold"];
    for (const selector of requiredSelectors) {
      expect(compiledCss).toContain(selector);
    }

    const requiredThemeTokens = ["--radius-2xl", "--font-weight-semibold", "--spacing:"];
    for (const token of requiredThemeTokens) {
      expect(compiledCss).toContain(token);
    }
  });

  it("生成本轮治理依赖的语义 utility（避免 @config/theme 回退时静默失效）", () => {
    const requiredSemanticSelectors = [
      ".text-settings-segment-tab-text",
      ".text-settings-segment-tab-text-active",
      ".bg-settings-toggle-on",
      ".shadow-settings-toggle-thumb",
      ".enabled\\:hover\\:border-ui-control-muted-hover-border",
      ".enabled\\:hover\\:bg-ui-control-muted-hover-bg",
      ".focus-visible\\:shadow-settings-focus",
      ".focus-visible\\:shadow-brand-soft-ring"
    ];

    for (const selector of requiredSemanticSelectors) {
      expect(compiledCss).toContain(selector);
    }
  });

  it("生成剩余 arbitrary 收口所需的语义 utility", () => {
    const requiredSemanticSelectors = [
      ".grid-rows-launcher-shell",
      ".top-ui-top-align",
      ".min-h-ui-top-align",
      ".bg-settings-slider-fill",
      ".bg-settings-preview-checker",
      ".bg-settings-window-shell",
      ".bg-settings-window-topbar",
      ".backdrop-blur-ui",
      ".backdrop-blur-ui-70",
      ".backdrop-blur-ui-24",
      ".accent-ui"
    ];

    for (const selector of requiredSemanticSelectors) {
      expect(compiledCss).toContain(selector);
    }
  });

  it("生成本轮新增的语义 transition / surface utility", () => {
    const requiredSemanticSelectors = [
      ".ease-settings-emphasized",
      ".ease-launcher-emphasized",
      ".transition-settings-field",
      ".transition-settings-interactive",
      ".transition-settings-toggle-track",
      ".transition-settings-toggle-thumb",
      ".transition-launcher-surface",
      ".transition-launcher-pressable",
      ".transition-launcher-card",
      ".transition-launcher-field",
      ".transition-launcher-interactive",
      ".transition-launcher-emphasis",
      ".transition-launcher-width",
      ".shadow-settings-preview-panel",
      ".shadow-settings-toolbar",
      ".shadow-launcher-chip-inset",
      ".shadow-launcher-search-indicator",
      ".shadow-launcher-drag-card",
      ".shadow-launcher-side-panel",
      ".bg-launcher-frame-highlight",
      ".bg-launcher-flow-panel-highlight",
      ".backdrop-blur-launcher-scrim",
      ".backdrop-blur-launcher-dialog",
      ".bg-ui-surface"
    ];

    for (const selector of requiredSemanticSelectors) {
      expect(compiledCss).toContain(selector);
    }
  });
});
