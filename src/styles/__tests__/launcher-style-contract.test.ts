import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const launcherCss = readFileSync(
  path.resolve(process.cwd(), "src/styles/launcher.css"),
  "utf8"
);

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
});
