import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("settings bootstrap contract", () => {
  it("boots settings with synchronous dark-frame guards before the main bundle", () => {
    const html = readFileSync(resolve(process.cwd(), "settings.html"), "utf8");

    expect(html).toContain("document.documentElement.dataset.theme");
    expect(html).toContain("document.documentElement.style.backgroundColor");
    expect(html).toContain('document.createElement("style")');
    expect(html.indexOf('document.createElement("style")')).toBeLessThan(
      html.indexOf('/src/main-settings.ts')
    );
  });

  it("keeps AppSettings as the only settings entry and removes SettingsWindow wiring from App.vue", () => {
    const mainSettingsSource = readFileSync(resolve(process.cwd(), "src/main-settings.ts"), "utf8");
    const appSource = readFileSync(resolve(process.cwd(), "src/App.vue"), "utf8");

    expect(mainSettingsSource).toContain('import AppSettings from "./AppSettings.vue"');
    expect(mainSettingsSource).toContain("createApp(AppSettings)");
    expect(appSource).not.toContain("import SettingsWindow");
    expect(appSource).not.toContain("<SettingsWindow");
  });

  it("boots settings with theme-driven light/dark frame guards", () => {
    const settingsHtml = readFileSync(resolve(process.cwd(), "settings.html"), "utf8");

    expect(settingsHtml).toContain('linen');
    expect(settingsHtml).toContain('colorScheme: "light"');
    expect(settingsHtml).toContain('backgroundColor: "#ece4d6"');
    expect(settingsHtml).toContain("document.documentElement.dataset.motionPreset");
  });

  it("keeps launcher bootstrap transparent while still syncing theme and color-scheme", () => {
    const launcherHtml = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

    expect(launcherHtml).toContain('linen');
    expect(launcherHtml).toContain('colorScheme: "light"');
    expect(launcherHtml).not.toContain('style.backgroundColor');
    expect(launcherHtml).not.toContain('backgroundColor: "#ece4d6"');
    expect(launcherHtml).toContain("document.documentElement.dataset.motionPreset");
  });

  it("pins visual bootstrap to expressive motion preset", () => {
    const visualHtml = readFileSync(resolve(process.cwd(), "visual.html"), "utf8");

    expect(visualHtml).toContain('document.documentElement.dataset.motionPreset = "expressive"');
  });
});
