import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const launcherCss = readFileSync(
  path.resolve(process.cwd(), "src/styles/launcher.css"),
  "utf8"
);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSelectorRuleBodies(selector: string): string[] {
  const selectorPattern = escapeRegExp(selector);
  const ruleRegex = new RegExp(
    `(?:^|\\n)\\s*${selectorPattern}\\s*\\{([\\s\\S]*?)\\}`,
    "g"
  );
  const bodies: string[] = [];
  for (const match of launcherCss.matchAll(ruleRegex)) {
    if (typeof match[1] === "string") {
      bodies.push(match[1]);
    }
  }
  return bodies;
}

function expectSelectorRuleContains(selector: string, declaration: RegExp): void {
  const blocks = getSelectorRuleBodies(selector);
  expect(
    blocks.length,
    `未找到选择器规则块: ${selector}`
  ).toBeGreaterThan(0);

  const declarationRegex = new RegExp(
    declaration.source,
    declaration.flags.replaceAll("g", "")
  );
  expect(
    blocks.some((block) => declarationRegex.test(block)),
    `${selector} 规则块内缺少声明: ${declaration.source}`
  ).toBe(true);
}

describe("launcher.css contract", () => {
  it("launcher-root 在窗口中水平居中主视觉盒子", () => {
    expect(launcherCss).toMatch(/\.launcher-root\s*\{[\s\S]*place-items:\s*start center;/);
  });

  it("Launcher 共享 panel max height 变量供 frame 和子面板消费", () => {
    expect(launcherCss).toMatch(/--launcher-panel-max-height/);
    expect(launcherCss).toMatch(/\.launcher-frame[\s\S]*max-height:\s*var\(--launcher-panel-max-height/);
    expect(launcherCss).toMatch(/\.command-panel[\s\S]*max-height:\s*var\(--launcher-panel-max-height/);
    expect(launcherCss).toMatch(/\.flow-panel[\s\S]*max-height:\s*var\(--launcher-panel-max-height/);
  });

  it("CommandPanel / FlowPanel 三段式与滚动 contract", () => {
    expectSelectorRuleContains(".command-panel", /height:\s*100%/);
    expectSelectorRuleContains(
      ".command-panel",
      /grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\)\s+auto/
    );

    expectSelectorRuleContains(".flow-panel", /height:\s*100%/);
    expectSelectorRuleContains(
      ".flow-panel",
      /grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\)\s+auto/
    );

    expectSelectorRuleContains(".flow-panel__body", /min-height:\s*0/);
    expectSelectorRuleContains(".flow-panel__body", /overflow-y:\s*auto/);
    expectSelectorRuleContains(
      ".flow-panel--has-list .flow-panel__body",
      /overflow:\s*hidden/
    );
    expectSelectorRuleContains(".flow-panel__list", /overflow-y:\s*auto/);
  });
});
