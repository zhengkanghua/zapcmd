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

  it("boots both windows with theme-driven light/dark frame guards", () => {
    const settingsHtml = readFileSync(resolve(process.cwd(), "settings.html"), "utf8");
    const launcherHtml = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

    for (const html of [settingsHtml, launcherHtml]) {
      expect(html).toContain('linen');
      expect(html).toContain('colorScheme: "light"');
      expect(html).toContain('backgroundColor: "#ece4d6"');
    }
  });
});
