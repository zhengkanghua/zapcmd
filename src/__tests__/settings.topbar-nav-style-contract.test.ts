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

    expect(component).toContain('class="s-segment-nav');
    expect(component).toContain("gap-[10px]");
    expect(component).toContain("pt-[8px]");
    expect(component).toContain("pb-[10px]");
    expect(component).toContain("rounded-[10px]");
  });

  it("keeps the default tab state frameless and uses background only for hover or active emphasis", () => {
    const component = readProjectFile("src/components/settings/ui/SSegmentNav.vue");

    expect(component).toContain("border border-transparent bg-transparent");
    expect(component).toContain("text-[color:var(--ui-settings-segment-tab-text)]");
    expect(component).toContain("hover:bg-[var(--ui-settings-table-row-hover)]");
    expect(component).toContain("hover:text-[color:var(--ui-settings-segment-tab-text-hover)]");
    expect(component).toContain("bg-[var(--ui-settings-segment-tab-active-bg)]");
    expect(component).toContain("text-[color:var(--ui-settings-segment-tab-text-active)]");
    expect(component).toContain("focus-visible:shadow-[0_0_0_2px_var(--ui-brand-soft)]");

    expect(component).not.toMatch(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,/);
  });
});
