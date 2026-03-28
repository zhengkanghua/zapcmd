import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { MOTION_PRESET_REGISTRY } from "../features/motion/motionRegistry";
import { THEME_REGISTRY } from "../features/themes/themeRegistry";
import { DEFAULT_MOTION_PRESET, DEFAULT_THEME, SETTINGS_STORAGE_KEY } from "../stores/settings/defaults";

describe("settings bootstrap contract", () => {
  it("boots settings with synchronous dark-frame guards before the main bundle", () => {
    const html = readFileSync(resolve(process.cwd(), "settings.html"), "utf8");

    expect(html).toContain('<script src="/appearance-bootstrap.js" data-zapcmd-appearance-mode="settings"></script>');
    expect(html.indexOf('/appearance-bootstrap.js')).toBeLessThan(
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

    expect(settingsHtml).toContain('data-zapcmd-appearance-mode="settings"');
    expect(settingsHtml).not.toContain('bootstrapAppearanceFromStorage({ mode: "settings" })');
  });

  it("keeps launcher bootstrap transparent while still syncing theme and color-scheme", () => {
    const launcherHtml = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

    expect(launcherHtml).toContain('data-zapcmd-appearance-mode="launcher"');
    expect(launcherHtml).toContain('<script src="/appearance-bootstrap.js" data-zapcmd-appearance-mode="launcher"></script>');
  });

  it("pins visual bootstrap to expressive motion preset", () => {
    const visualHtml = readFileSync(resolve(process.cwd(), "visual.html"), "utf8");

    expect(visualHtml).toContain('data-zapcmd-appearance-mode="visual"');
    expect(visualHtml).toContain('data-zapcmd-visual-theme-id="obsidian"');
    expect(visualHtml).toContain('data-zapcmd-visual-motion-preset-id="expressive"');
  });

  it("keeps the synchronous bootstrap script aligned with runtime appearance facts", () => {
    const scriptSource = readFileSync(resolve(process.cwd(), "public/appearance-bootstrap.js"), "utf8");

    expect(scriptSource).toContain(`var SETTINGS_STORAGE_KEY = "${SETTINGS_STORAGE_KEY}";`);
    expect(scriptSource).toContain(`var DEFAULT_THEME = "${DEFAULT_THEME}";`);
    expect(scriptSource).toContain(`var DEFAULT_MOTION_PRESET = "${DEFAULT_MOTION_PRESET}";`);

    for (const theme of THEME_REGISTRY) {
      expect(scriptSource).toContain(`"${theme.id}"`);
      expect(scriptSource).toContain(`"${theme.colorScheme}"`);
      expect(scriptSource).toContain(`"${theme.frameBackgroundColor}"`);
    }

    for (const preset of MOTION_PRESET_REGISTRY) {
      expect(scriptSource).toContain(`"${preset.id}"`);
    }
  });
});
