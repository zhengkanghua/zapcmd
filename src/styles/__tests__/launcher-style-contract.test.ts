import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const launcherWindowSource = readFileSync(
  path.resolve(process.cwd(), "src/components/launcher/LauncherWindow.vue"),
  "utf8"
);
const commandPanelSource = readFileSync(
  path.resolve(process.cwd(), "src/components/launcher/parts/LauncherCommandPanel.vue"),
  "utf8"
);
const flowPanelSource = readFileSync(
  path.resolve(process.cwd(), "src/components/launcher/parts/LauncherFlowPanel.vue"),
  "utf8"
);

function expectClassContract(source: string, baseClass: string, requiredClass: string): void {
  const base = escapeRegExp(baseClass);
  const required = escapeRegExp(requiredClass);
  expect(source).toMatch(new RegExp(`class="[^"]*${base}[^"]*${required}[^"]*"`, "s"));
}

describe("launcher Tailwind class contract", () => {
  it("launcher-root 在窗口中水平居中主视觉盒子", () => {
    expectClassContract(launcherWindowSource, "launcher-root", "grid");
    expectClassContract(launcherWindowSource, "launcher-root", "place-items-[start_center]");
  });

  it("CommandPanel / FlowPanel 使用三段式 grid rows", () => {
    expectClassContract(commandPanelSource, "command-panel", "grid-rows-[auto_minmax(0,1fr)_auto]");
    expectClassContract(flowPanelSource, "flow-panel", "grid-rows-[auto_minmax(0,1fr)_auto]");
  });

  it("FlowPanel body 使用 min-h-0 与 scroll contract（无列表时滚动）", () => {
    expectClassContract(flowPanelSource, "flow-panel__body", "min-h-0");
    expect(flowPanelSource).toMatch(/flow-panel__body[\s\S]{0,400}overflow-y-auto/);
  });
});
