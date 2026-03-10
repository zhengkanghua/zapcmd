import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  LEGACY_GENERAL_SETTINGS_STORAGE_KEY,
  LEGACY_HOTKEY_SETTINGS_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  createDefaultSettingsSnapshot
} from "../settings/defaults";
import { migrateSettingsPayload } from "../settings/migration";
import { normalizeWindowOpacity } from "../settings/normalization";
import { createSettingsStorageAdapter, type SettingsStorageAdapter } from "../settings/storageAdapter";
import {
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
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorage.setItem(SETTINGS_STORAGE_KEY, "{invalid-json");
    localStorage.setItem(
      LEGACY_HOTKEY_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        launcherHotkey: "Alt+K"
      })
    );

    const snapshot = readSettingsFromStorage(localStorage);
    expect(snapshot.hotkeys.launcher).toBe("Alt+K");
    expect(warnSpy).toHaveBeenCalledWith("settings payload json parse failed", expect.any(Error));
    warnSpy.mockRestore();
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

  it("normalizes booleans, fileFilter, disabled ids, and clamps window opacity for v3 payload", () => {
    const migrated = migrateSettingsPayload({
      version: 3,
      hotkeys: {},
      general: {
        defaultTerminal: "   ",
        language: "xx",
        autoCheckUpdate: "false",
        launchAtLogin: "true"
      },
      commands: {
        disabledCommandIds: [1, " docker-ps ", "docker-ps", " "],
        view: {
          fileFilter: "   ",
          sortBy: "title"
        }
      },
      appearance: {
        windowOpacity: 2
      }
    });

    expect(migrated).toBeTruthy();
    expect(migrated?.general.defaultTerminal).toBe("powershell");
    expect(migrated?.general.language).toBe("zh-CN");
    expect(migrated?.general.autoCheckUpdate).toBe(false);
    expect(migrated?.general.launchAtLogin).toBe(true);
    expect(migrated?.commands.disabledCommandIds).toEqual(["docker-ps"]);
    expect(migrated?.commands.view.fileFilter).toBe("all");
    expect(migrated?.appearance.windowOpacity).toBe(1);
  });

  it("normalizes query/source/status/sort and display mode to safe defaults", () => {
    const migrated = migrateSettingsPayload({
      version: 3,
      hotkeys: {},
      general: {},
      commands: {
        disabledCommandIds: [],
        view: {
          query: "  docker  ",
          sourceFilter: "invalid",
          statusFilter: "invalid",
          overrideFilter: "invalid",
          issueFilter: "invalid",
          sortBy: "invalid",
          displayMode: "invalid"
        }
      },
      appearance: {}
    });

    expect(migrated).toBeTruthy();
    expect(migrated?.commands.view.query).toBe("docker");
    expect(migrated?.commands.view.sourceFilter).toBe("all");
    expect(migrated?.commands.view.statusFilter).toBe("all");
    expect(migrated?.commands.view.overrideFilter).toBe("all");
    expect(migrated?.commands.view.issueFilter).toBe("all");
    expect(migrated?.commands.view.sortBy).toBe("default");
    expect(migrated?.commands.view.displayMode).toBe("list");
  });

  it("falls back to default window opacity when value is non-finite", () => {
    const migrated = migrateSettingsPayload({
      version: 3,
      hotkeys: {},
      general: {},
      commands: {},
      appearance: {
        windowOpacity: Number.NaN
      }
    });

    expect(migrated).toBeTruthy();
    expect(migrated?.appearance.windowOpacity).toBe(0.96);
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

  it("falls back to legacy data when current payload parses to a non-record json", () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, "123");
    localStorage.setItem(
      LEGACY_HOTKEY_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        launcherHotkey: "Alt+K"
      })
    );

    const snapshot = readSettingsFromStorage(localStorage);
    expect(snapshot.hotkeys.launcher).toBe("Alt+K");
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

  it("setCommandEnabled no-ops when commandId is empty", () => {
    const store = useSettingsStore();
    store.setCommandEnabled("   ", false);
    expect(store.disabledCommandIds).toEqual([]);
  });

  it("setHotkey keeps previous value when normalization fails", () => {
    const store = useSettingsStore();
    expect(store.hotkeys.launcher).toBe("Alt+V");

    store.setHotkey("launcher", "");
    expect(store.hotkeys.launcher).toBe("Alt+V");
  });

  it("writeSettingsToStorage safely no-ops when storage is null", () => {
    const snapshot = createDefaultSettingsSnapshot();
    expect(() => writeSettingsToStorage(snapshot, null)).not.toThrow();
  });

  it("normalizeWindowOpacity clamps to min/max and falls back for invalid values", () => {
    expect(normalizeWindowOpacity(-2)).toBe(0.2);
    expect(normalizeWindowOpacity(2)).toBe(1);
    expect(normalizeWindowOpacity(Number.NaN)).toBe(0.96);
  });

  it("uses injected adapter for hydrate and persist orchestration", () => {
    const snapshot = createDefaultSettingsSnapshot();
    snapshot.hotkeys.launcher = "Ctrl+Shift+X";
    snapshot.general.defaultTerminal = "pwsh";

    const adapter: SettingsStorageAdapter = {
      readSettings: vi.fn(() => snapshot),
      writeSettings: vi.fn()
    };

    const store = useSettingsStore();
    store.hydrateFromStorage(adapter);

    expect(adapter.readSettings).toHaveBeenCalledTimes(1);
    expect(adapter.writeSettings).toHaveBeenCalledTimes(1);
    expect(store.hotkeys.launcher).toBe("Ctrl+Shift+X");

    store.setDefaultTerminal("wt");
    store.persist(adapter);
    expect(adapter.writeSettings).toHaveBeenCalledTimes(2);
    expect(adapter.writeSettings).toHaveBeenLastCalledWith(
      expect.objectContaining({
        general: expect.objectContaining({ defaultTerminal: "wt" })
      })
    );
  });

  it("adapter supports null storage fallback without throwing", () => {
    const adapter = createSettingsStorageAdapter({ storage: null });
    expect(adapter.readSettings()).toEqual(createDefaultSettingsSnapshot());
    expect(() => adapter.writeSettings(createDefaultSettingsSnapshot())).not.toThrow();
  });

  it("keeps snapshot stable across read-write-read round-trip from legacy payload", () => {
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

    const first = readSettingsFromStorage(localStorage);
    writeSettingsToStorage(first, localStorage);
    const second = readSettingsFromStorage(localStorage);

    expect(second).toEqual(first);
  });

  it("normalizes dirty versioned payload across adapter hydrate-persist round-trip", () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        hotkeys: {
          launcher: " ctrl+alt+g "
        },
        general: {
          defaultTerminal: "   ",
          language: "invalid",
          autoCheckUpdate: false,
          launchAtLogin: true
        },
        commands: {
          disabledCommandIds: [" docker-ps ", "docker-ps", "   "],
          view: {
            query: "  docker  ",
            sortBy: "invalid",
            displayMode: "invalid"
          }
        },
        appearance: {
          windowOpacity: Number.NaN
        }
      })
    );

    const store = useSettingsStore();
    store.hydrateFromStorage();

    expect(store.hotkeys.launcher).toBe("Ctrl+Alt+G");
    expect(store.defaultTerminal).toBe("powershell");
    expect(store.language).toBe("zh-CN");
    expect(store.autoCheckUpdate).toBe(true);
    expect(store.launchAtLogin).toBe(false);
    expect(store.disabledCommandIds).toEqual(["docker-ps"]);
    expect(store.commandView.query).toBe("docker");
    expect(store.commandView.sortBy).toBe("default");
    expect(store.commandView.displayMode).toBe("list");
    expect(store.windowOpacity).toBe(0.96);

    const roundTrip = readSettingsFromStorage(localStorage);
    expect(roundTrip.hotkeys.launcher).toBe("Ctrl+Alt+G");
    expect(roundTrip.general.defaultTerminal).toBe("powershell");
    expect(roundTrip.general.language).toBe("zh-CN");
    expect(roundTrip.general.autoCheckUpdate).toBe(true);
    expect(roundTrip.general.launchAtLogin).toBe(false);
    expect(roundTrip.commands.disabledCommandIds).toEqual(["docker-ps"]);
    expect(roundTrip.commands.view.query).toBe("docker");
    expect(roundTrip.commands.view.sortBy).toBe("default");
    expect(roundTrip.commands.view.displayMode).toBe("list");
    expect(roundTrip.appearance.windowOpacity).toBe(0.96);
  });

  it("prefers current key when current and legacy payload coexist", () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        version: 3,
        hotkeys: {
          launcher: "alt+x"
        },
        general: {
          defaultTerminal: "wt",
          language: "en-US",
          autoCheckUpdate: true,
          launchAtLogin: false
        },
        commands: {
          disabledCommandIds: [],
          view: {}
        },
        appearance: {
          windowOpacity: 0.88
        }
      })
    );
    localStorage.setItem(
      LEGACY_HOTKEY_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        launcherHotkey: "ctrl+shift+v"
      })
    );

    const snapshot = readSettingsFromStorage(localStorage);
    expect(snapshot.hotkeys.launcher).toBe("Alt+X");
    expect(snapshot.general.defaultTerminal).toBe("wt");
    expect(snapshot.general.language).toBe("en-US");
  });
});
