import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("settings topbar navigation style contract", () => {
  it("removes the topbar middle separator and keeps only the bottom divider", () => {
    const css = readProjectFile("src/styles/settings.css");

    expect(css).not.toContain(".settings-window-topbar::before");
    expect(css).toContain(".settings-window-topbar::after");
  });

  it("uses rectangular topbar tabs with explicit group spacing", () => {
    const component = readProjectFile("src/components/settings/ui/SSegmentNav.vue");

    expect(component).toMatch(/\.s-segment-nav\s*\{[\s\S]*gap:\s*10px;[\s\S]*padding:\s*8px 0 10px;/);
    expect(component).toMatch(/\.s-segment-nav__tab\s*\{[\s\S]*border-radius:\s*10px;/);
  });

  it("keeps the default tab state frameless and uses background only for hover or active emphasis", () => {
    const component = readProjectFile("src/components/settings/ui/SSegmentNav.vue");
    const hoverBlock =
      component.match(/\.s-segment-nav__tab:hover\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
    const activeBlock =
      component.match(/\.s-segment-nav__tab--active\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

    expect(component).toMatch(
      /\.s-segment-nav__tab\s*\{[\s\S]*border:\s*1px solid transparent;[\s\S]*background:\s*transparent;/
    );
    expect(hoverBlock).toContain("background: rgba(255, 255, 255, 0.04);");
    expect(hoverBlock).not.toContain("border-color:");
    expect(activeBlock).toContain("background: rgba(255, 255, 255, 0.09);");
    expect(activeBlock).not.toContain("border-color:");
    expect(activeBlock).not.toContain("box-shadow:");
  });
});
