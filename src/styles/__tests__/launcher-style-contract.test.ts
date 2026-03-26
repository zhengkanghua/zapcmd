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
const searchPanelSource = readFileSync(
  path.resolve(process.cwd(), "src/components/launcher/parts/LauncherSearchPanel.vue"),
  "utf8"
);
const stagingPanelSource = readFileSync(
  path.resolve(process.cwd(), "src/components/launcher/parts/LauncherStagingPanel.vue"),
  "utf8"
);
const queueSummaryPillSource = readFileSync(
  path.resolve(process.cwd(), "src/components/launcher/parts/LauncherQueueSummaryPill.vue"),
  "utf8"
);
const buttonPrimitivesSource = readFileSync(
  path.resolve(process.cwd(), "src/components/shared/ui/buttonPrimitives.ts"),
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
	    expectClassContract(launcherWindowSource, "launcher-root", "place-items-start");
	    expectClassContract(launcherWindowSource, "launcher-root", "justify-items-center");
	  });

	  it("CommandPanel / FlowPanel 使用三段式 grid rows", () => {
	    expectClassContract(commandPanelSource, "command-panel", "grid-rows-launcher-panel");
	    expectClassContract(flowPanelSource, "flow-panel", "grid-rows-launcher-panel");
	  });

  it("FlowPanel body 使用 min-h-0 与 scroll contract（无列表时滚动）", () => {
    expectClassContract(flowPanelSource, "flow-panel__body", "min-h-0");
    expect(flowPanelSource).toMatch(/flow-panel__body[\s\S]{0,400}overflow-y-auto/);
  });

  it("Launcher alpha arbitrary 不允许回退", () => {
    const banned = [
      /bg-\[rgba\(var\(--ui-/,
      /border-\[rgba\(var\(--ui-/,
      /text-\[rgba\(var\(--ui-/,
      /from-\[rgba\(var\(--ui-/,
      /to-\[rgba\(var\(--ui-/
    ];
    const sources = [
      commandPanelSource,
      searchPanelSource,
      flowPanelSource,
      stagingPanelSource,
      queueSummaryPillSource,
      buttonPrimitivesSource
    ];
    for (const source of sources) {
      for (const pattern of banned) {
        expect(source).not.toMatch(pattern);
      }
    }
  });
});
