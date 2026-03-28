import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const motionCssPath = path.resolve(process.cwd(), "src/styles/motion.css");
const tailwindConfigPath = path.resolve(process.cwd(), "tailwind.config.cjs");
const launcherWindowPath = path.resolve(process.cwd(), "src/components/launcher/LauncherWindow.vue");
const commandPanelPath = path.resolve(process.cwd(), "src/components/launcher/parts/LauncherCommandPanel.vue");
const searchPanelPath = path.resolve(process.cwd(), "src/components/launcher/parts/LauncherSearchPanel.vue");
const flowPanelPath = path.resolve(process.cwd(), "src/components/launcher/parts/LauncherFlowPanel.vue");
const stagingPanelPath = path.resolve(process.cwd(), "src/components/launcher/parts/LauncherStagingPanel.vue");
const safetyOverlayPath = path.resolve(process.cwd(), "src/components/launcher/parts/LauncherSafetyOverlay.vue");

describe("motion style contract", () => {
  it("locks preset selectors, tokenized Tailwind motion, and semantic hotspot classes", () => {
    const motionCss = readFileSync(motionCssPath, "utf8");
    const tailwindConfigSource = readFileSync(tailwindConfigPath, "utf8");
    const launcherWindowSource = readFileSync(launcherWindowPath, "utf8");
    const commandPanelSource = readFileSync(commandPanelPath, "utf8");
    const searchPanelSource = readFileSync(searchPanelPath, "utf8");
    const flowPanelSource = readFileSync(flowPanelPath, "utf8");
    const stagingPanelSource = readFileSync(stagingPanelPath, "utf8");
    const safetyOverlaySource = readFileSync(safetyOverlayPath, "utf8");

    expect(motionCss).toContain('[data-motion-preset="expressive"]');
    expect(motionCss).toContain('[data-motion-preset="steady-tool"]');
    expect(motionCss).toContain("@media (prefers-reduced-motion: reduce)");

    expect(tailwindConfigSource).toContain("var(--motion-duration-toast)");
    expect(tailwindConfigSource).toContain("var(--motion-ease-emphasized)");

    expect(launcherWindowSource).toContain("ease-motion-emphasized");
    expect(flowPanelSource).toContain("motion-reduce:transition-none");

    expect(commandPanelSource).toContain("animate-launcher-toast-slide-down");
    expect(searchPanelSource).toContain("animate-launcher-toast-slide-down");
    expect(flowPanelSource).toContain("animate-launcher-review-overlay-panel-in");
    expect(stagingPanelSource).toContain("animate-launcher-staging-panel-enter");
    expect(safetyOverlaySource).toContain("animate-launcher-dialog-scale-in");
  });
});
