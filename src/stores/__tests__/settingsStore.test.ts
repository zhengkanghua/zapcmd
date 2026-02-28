import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import {
  LEGACY_GENERAL_SETTINGS_STORAGE_KEY,
  LEGACY_HOTKEY_SETTINGS_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  createDefaultSettingsSnapshot,
  migrateSettingsPayload,
  readSettingsFromStorage,
  useSettingsStore,
  writeSettingsToStorage
} from "../settingsStore";

describe("settingsStore migration and persistence", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it("returns defaults when storage is empty", () => {
    const snapshot = readSettingsFromStorage(localStorage);
    expect(snapshot).toEqual(createDefaultSettingsSnapshot());
  });

  it("returns defaults when storage instance is unavailable", () => {
    const snapshot = readSettingsFromStorage(null);
    expect(snapshot).toEqual(createDefaultSettingsSnapshot());
  });

  it("migrates legacy hotkeys/general payload", () => {
    localStorage.setItem(
      LEGACY_HOTKEY_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        launcherHotkey: "ctrl+shift+v",
        toggleQueueHotkey: "tab"
      })
    );
    localStorage.setItem(
      LEGACY_GENERAL_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        defaultTerminal: "pwsh"
      })
    );

    const snapshot = readSettingsFromStorage(localStorage);
    expect(snapshot.hotkeys.launcher).toBe("Ctrl+Shift+V");
    expect(snapshot.hotkeys.toggleQueue).toBe("Tab");
    expect(snapshot.general.defaultTerminal).toBe("pwsh");
    expect(snapshot.general.language).toBe("zh-CN");
  });

  it("falls back to legacy data when new version payload is invalid", () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, "{invalid-json");
    localStorage.setItem(
      LEGACY_HOTKEY_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        launcherHotkey: "Alt+K"
      })
    );

    const snapshot = readSettingsFromStorage(localStorage);
    expect(snapshot.hotkeys.launcher).toBe("Alt+K");
  });

  it("writes new key and removes legacy keys", () => {
    localStorage.setItem(LEGACY_HOTKEY_SETTINGS_STORAGE_KEY, JSON.stringify({ launcherHotkey: "Alt+V" }));
    localStorage.setItem(LEGACY_GENERAL_SETTINGS_STORAGE_KEY, JSON.stringify({ defaultTerminal: "cmd" }));

    const snapshot = createDefaultSettingsSnapshot();
    snapshot.general.defaultTerminal = "pwsh";
    writeSettingsToStorage(snapshot, localStorage);

    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeTruthy();
    expect(localStorage.getItem(LEGACY_HOTKEY_SETTINGS_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_GENERAL_SETTINGS_STORAGE_KEY)).toBeNull();
  });

  it("hydrates store from storage and persists normalized snapshot", () => {
    localStorage.setItem(
      LEGACY_HOTKEY_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        launcherHotkey: "ctrl+v"
      })
    );

    const store = useSettingsStore();
    store.hydrateFromStorage();

    expect(store.hotkeys.launcher).toBe("Ctrl+V");
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeTruthy();
  });

  it("migrates versioned payload and keeps default terminal fallback", () => {
    const migrated = migrateSettingsPayload({
      version: 2,
      hotkeys: {
        launcher: "alt+z"
      },
      general: {
        language: "en-US"
      },
      commands: {
        disabledCommandIds: [" docker-ps ", "docker-ps", " "],
        view: {
          displayMode: "groupedByFile"
        }
      }
    });

    expect(migrated).toBeTruthy();
    expect(migrated?.hotkeys.launcher).toBe("Alt+Z");
    expect(migrated?.general.defaultTerminal).toBe("powershell");
    expect(migrated?.general.language).toBe("en-US");
    expect(migrated?.general.autoCheckUpdate).toBe(true);
    expect(migrated?.general.launchAtLogin).toBe(false);
    expect(migrated?.commands.disabledCommandIds).toEqual(["docker-ps"]);
    expect(migrated?.commands.view.displayMode).toBe("groupedByFile");
  });

  it("migrates versioned payload when hotkeys/general are non-record values", () => {
    const migrated = migrateSettingsPayload({
      version: 2,
      hotkeys: "invalid",
      general: "invalid"
    });

    expect(migrated).toBeTruthy();
    expect(migrated?.hotkeys.launcher).toBe("Alt+V");
    expect(migrated?.general.defaultTerminal).toBe("powershell");
    expect(migrated?.general.language).toBe("zh-CN");
  });

  it("migrates schema v1 payload to schema v3 defaults", () => {
    const migrated = migrateSettingsPayload({
      version: 1,
      hotkeys: {
        launcher: "alt+z"
      },
      general: {
        defaultTerminal: "pwsh"
      },
      commands: {
        disabledCommandIds: [],
        view: {}
      }
    });

    expect(migrated).toBeTruthy();
    expect(migrated?.general.defaultTerminal).toBe("pwsh");
    expect(migrated?.general.language).toBe("zh-CN");
    expect(migrated?.general.autoCheckUpdate).toBe(true);
    expect(migrated?.general.launchAtLogin).toBe(false);
  });

  it("migrates versionless payload with embedded hotkeys/general", () => {
    const migrated = migrateSettingsPayload({
      hotkeys: {
        launcher: "ctrl+shift+b"
      },
      general: {
        defaultTerminal: "pwsh"
      }
    });

    expect(migrated).toBeTruthy();
    expect(migrated?.hotkeys.launcher).toBe("Ctrl+Shift+B");
    expect(migrated?.general.defaultTerminal).toBe("pwsh");
  });

  it("falls back to list display mode for invalid command view displayMode", () => {
    const migrated = migrateSettingsPayload({
      version: 2,
      hotkeys: {},
      general: {},
      commands: {
        disabledCommandIds: [],
        view: {
          displayMode: "table"
        }
      }
    });

    expect(migrated).toBeTruthy();
    expect(migrated?.commands.view.displayMode).toBe("list");
  });

  it("returns null for unknown schema version", () => {
    const migrated = migrateSettingsPayload({
      version: 99,
      hotkeys: {
        launcher: "alt+z"
      },
      general: {
        defaultTerminal: "pwsh"
      }
    });

    expect(migrated).toBeNull();
  });

  it("persist action serializes current state", () => {
    const store = useSettingsStore();
    store.setHotkey("launcher", "ctrl+shift+z");
    store.setDefaultTerminal("wt");
    store.setLanguage("en-US");
    store.setCommandEnabled("docker-ps", false);
    store.setCommandViewState({
      query: "docker",
      sortBy: "title",
      displayMode: "groupedByFile"
    });
    store.persist();

    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string) as {
      hotkeys: { launcher: string };
      general: { defaultTerminal: string; language: string };
      commands: {
        disabledCommandIds: string[];
        view: {
          query: string;
          sortBy: string;
          displayMode: string;
        };
      };
    };
    expect(parsed.hotkeys.launcher).toBe("Ctrl+Shift+Z");
    expect(parsed.general.defaultTerminal).toBe("wt");
    expect(parsed.general.language).toBe("en-US");
    expect(parsed.commands.disabledCommandIds).toEqual(["docker-ps"]);
    expect(parsed.commands.view.query).toBe("docker");
    expect(parsed.commands.view.sortBy).toBe("title");
    expect(parsed.commands.view.displayMode).toBe("groupedByFile");
  });

  it("toggles command enabled state", () => {
    const store = useSettingsStore();
    store.setCommandEnabled("docker-ps", false);
    expect(store.disabledCommandIds).toContain("docker-ps");

    store.setCommandEnabled("docker-ps", true);
    expect(store.disabledCommandIds).not.toContain("docker-ps");
  });

  it("writeSettingsToStorage safely no-ops when storage is null", () => {
    const snapshot = createDefaultSettingsSnapshot();
    expect(() => writeSettingsToStorage(snapshot, null)).not.toThrow();
  });
});
