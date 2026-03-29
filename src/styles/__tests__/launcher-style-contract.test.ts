import { existsSync, readFileSync } from "node:fs";
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
  path.resolve(process.cwd(), "src/components/launcher/parts/LauncherQueueReviewPanel.vue"),
  "utf8"
);
const searchPanelSource = readFileSync(
  path.resolve(process.cwd(), "src/components/launcher/parts/LauncherSearchPanel.vue"),
  "utf8"
);
const safetyOverlaySource = readFileSync(
  path.resolve(process.cwd(), "src/components/launcher/parts/LauncherSafetyOverlay.vue"),
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

  it("Launcher 主滚动容器挂载 subtle scrollbar utility", () => {
    expectClassContract(commandPanelSource, "command-panel__content", "scrollbar-subtle");
    expect(flowPanelSource).toMatch(/'scrollbar-subtle': props\.queuedCommands\.length === 0/);
    expectClassContract(flowPanelSource, "flow-panel__list", "scrollbar-subtle");
  });

  it("visual-only staging panel 旧组件已删除", () => {
    expect(existsSync(path.resolve(process.cwd(), "src/components/launcher/parts/LauncherStagingPanel.vue"))).toBe(
      false
    );
  });

  it("44px 的队列按钮命中面不能抬高搜索胶囊基线", () => {
    expectClassContract(queueSummaryPillSource, "queue-summary-pill", "w-[44px]");
    expectClassContract(queueSummaryPillSource, "queue-summary-pill", "h-[44px]");
    expectClassContract(searchPanelSource, "search-form", "px-[12px]");
    expectClassContract(searchPanelSource, "search-form", "py-[9px]");
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
      queueSummaryPillSource,
      buttonPrimitivesSource
    ];
    for (const source of sources) {
      for (const pattern of banned) {
        expect(source).not.toMatch(pattern);
      }
    }
  });

  it("Launcher 高成本 surface arbitrary 已收口为语义类", () => {
    const requiredClasses = [
      "bg-launcher-frame-highlight",
      "bg-launcher-flow-panel-highlight",
      "shadow-launcher-search-indicator",
      "shadow-launcher-drag-card",
      "shadow-launcher-side-panel",
      "backdrop-blur-launcher-scrim",
      "backdrop-blur-launcher-dialog"
    ];

    const requiredSources = [launcherWindowSource, flowPanelSource, searchPanelSource, safetyOverlaySource];
    for (const className of requiredClasses) {
      const found = requiredSources.some((source) => source.includes(className));
      expect(found).toBe(true);
    }

    const bannedPatterns = [
      /shadow-\[0_0_10px_var\(--tw-shadow-color\)\]/,
      /shadow-\[-4px_0_24px_var\(--tw-shadow-color\)\]/,
      /shadow-\[0_14px_28px_var\(--tw-shadow-color\)\]/,
      /bg-\[linear-gradient\(180deg,var\(--tw-gradient-from\),transparent_60%\)\]/,
      /bg-\[linear-gradient\(180deg,var\(--tw-gradient-from\),var\(--tw-gradient-via\)_52%,transparent\)\]/,
      /backdrop-blur-\[8px\]/,
      /backdrop-blur-\[20px\]/
    ];

    const launcherSources = [launcherWindowSource, flowPanelSource, searchPanelSource, safetyOverlaySource];
    for (const source of launcherSources) {
      for (const pattern of bannedPatterns) {
        expect(source).not.toMatch(pattern);
      }
    }
  });
});
