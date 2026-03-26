import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("settings topbar navigation style contract", () => {
  it("renders a real topbar bottom divider (no pseudo-element dependency)", () => {
    const component = readProjectFile("src/components/settings/SettingsWindow.vue");

    expect(component).toContain("settings-window-topbar__divider");
    expect(component).toContain("absolute");
    expect(component).toContain("bottom-0");
    expect(component).toContain("h-px");
  });

  it("uses rectangular topbar tabs with explicit group spacing", () => {
    const component = readProjectFile("src/components/settings/ui/SSegmentNav.vue");

    expect(component).toContain('class="s-segment-nav');
    expect(component).toContain("gap-2.5");
    expect(component).toContain("pt-2");
    expect(component).toContain("pb-2.5");
    expect(component).toContain("rounded-surface");
  });

  it("keeps the default tab state frameless and uses background only for hover or active emphasis", () => {
    const component = readProjectFile("src/components/settings/ui/SSegmentNav.vue");

    expect(component).toContain("border border-transparent bg-transparent");
    expect(component).toContain("text-[color:var(--ui-settings-segment-tab-text)]");
    expect(component).toContain("hover:bg-settings-table-row-hover");
    expect(component).toContain("hover:text-[color:var(--ui-settings-segment-tab-text-hover)]");
    expect(component).toContain("bg-settings-segment-tab-active");
    expect(component).toContain("text-[color:var(--ui-settings-segment-tab-text-active)]");
    expect(component).toContain("focus-visible:shadow-[0_0_0_2px_var(--ui-brand-soft)]");

    expect(component).not.toMatch(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,/);
  });
});
