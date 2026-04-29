import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  SETTINGS_STORAGE_KEY,
  createDefaultSettingsSnapshot
} from "../settings/defaults";
import { migrateSettingsPayload } from "../settings/migration";
import { normalizeCommandViewState, normalizeWindowOpacity } from "../settings/normalization";
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

  it("returns defaults when current payload is invalid json", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorage.setItem(SETTINGS_STORAGE_KEY, "{invalid-json");

    const snapshot = readSettingsFromStorage(localStorage);
    expect(snapshot).toEqual(createDefaultSettingsSnapshot());
    expect(warnSpy).toHaveBeenCalledWith("settings payload json parse failed", expect.any(Error));
    warnSpy.mockRestore();
  });

  it("returns defaults when current payload is a non-record json", () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, "123");

    const snapshot = readSettingsFromStorage(localStorage);
    expect(snapshot).toEqual(createDefaultSettingsSnapshot());
  });

  it("migrates versioned payload and keeps default terminal fallback", () => {
    const migrated = migrateSettingsPayload({
      version: 1,
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
    expect(migrated?.general.alwaysElevatedTerminal).toBe(false);
    expect(migrated?.commands.disabledCommandIds).toEqual(["docker-ps"]);
    expect((migrated?.commands as Record<string, unknown>).view).toBeUndefined();
  });

  it("defaults pointerActions to left action-panel and right stage", () => {
    const snapshot = createDefaultSettingsSnapshot();

    expect(snapshot.version).toBe(2);
    expect((snapshot.general as Record<string, unknown>).pointerActions).toEqual({
      leftClick: "action-panel",
      rightClick: "stage"
    });
    expect((snapshot.hotkeys as Record<string, unknown>).openActionPanel).toBe("Shift+Enter");
    expect((snapshot.hotkeys as Record<string, unknown>).copySelected).toBe("CmdOrCtrl+Shift+C");
  });

  it("migrates legacy payload by filling pointerActions and new hotkeys with new defaults", () => {
    const migrated = migrateSettingsPayload({
      version: 1,
      hotkeys: { launcher: "alt+z" },
      general: { defaultTerminal: "pwsh" }
    });

    expect(migrated?.version).toBe(2);
    expect((migrated?.general as Record<string, unknown>).pointerActions).toEqual({
      leftClick: "action-panel",
      rightClick: "stage"
    });
    expect((migrated?.hotkeys as Record<string, unknown>).openActionPanel).toBe("Shift+Enter");
    expect((migrated?.hotkeys as Record<string, unknown>).copySelected).toBe("CmdOrCtrl+Shift+C");
  });

  it("defaults alwaysElevatedTerminal to false", () => {
    expect(createDefaultSettingsSnapshot().general.alwaysElevatedTerminal).toBe(false);
  });

  it("defaults appearance.motionPreset to expressive", () => {
    expect((createDefaultSettingsSnapshot().appearance as Record<string, unknown>).motionPreset).toBe(
      "expressive"
    );
  });

  it("defaults terminalReusePolicy to never", () => {
    expect((createDefaultSettingsSnapshot().general as Record<string, unknown>).terminalReusePolicy).toBe(
      "never"
    );
  });

  it("migrates alwaysElevatedTerminal from legacy payload", () => {
    const migrated = migrateSettingsPayload({
      version: 1,
      general: { alwaysElevatedTerminal: "true" }
    });

    expect(migrated?.general.alwaysElevatedTerminal).toBe(true);
  });

  it("migrates terminalReusePolicy from legacy payload", () => {
    const migrated = migrateSettingsPayload({
      version: 1,
      general: { terminalReusePolicy: "normal-and-elevated" }
    });

    expect((migrated?.general as Record<string, unknown>).terminalReusePolicy).toBe(
      "normal-and-elevated"
    );
  });

  it("migrates missing appearance.motionPreset to expressive", () => {
    const migrated = migrateSettingsPayload({ version: 1, appearance: { theme: "obsidian" } });
    expect((migrated?.appearance as Record<string, unknown>).motionPreset).toBe("expressive");
  });

  it("falls back invalid appearance.motionPreset to expressive", () => {
    const migrated = migrateSettingsPayload({
      version: 1,
      appearance: { motionPreset: "loud-mode" }
    });
    expect((migrated?.appearance as Record<string, unknown>).motionPreset).toBe("expressive");
  });

  it("normalizes booleans, disabled ids, and clamps window opacity", () => {
    const migrated = migrateSettingsPayload({
      version: 1,
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
    expect((migrated?.commands as Record<string, unknown>).view).toBeUndefined();
    expect(migrated?.appearance.windowOpacity).toBe(1);
  });

  it("normalizes query/source/status/sort to safe defaults and drops legacy displayMode", () => {
    const normalized = normalizeCommandViewState({
      query: "  docker  ",
      sourceFilter: "invalid",
      statusFilter: "invalid",
      overrideFilter: "invalid",
      issueFilter: "invalid",
      sortBy: "invalid",
      displayMode: "invalid"
    });

    expect(normalized.query).toBe("docker");
    expect(normalized.sourceFilter).toBe("all");
    expect(normalized.statusFilter).toBe("all");
    expect(normalized.overrideFilter).toBe("all");
    expect(normalized.issueFilter).toBe("all");
    expect(normalized.sortBy).toBe("default");
    expect("displayMode" in normalized).toBe(false);
  });

  it("falls back to default window opacity when value is non-finite", () => {
    const migrated = migrateSettingsPayload({
      version: 1,
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
      version: 1,
      hotkeys: "invalid",
      general: "invalid"
    });

    expect(migrated).toBeTruthy();
    expect(migrated?.hotkeys.launcher).toBe("Alt+V");
    expect(migrated?.general.defaultTerminal).toBe("powershell");
    expect(migrated?.general.language).toBe("zh-CN");
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

  it("drops legacy command view displayMode during normalization", () => {
    const normalized = normalizeCommandViewState({ displayMode: "groupedByFile" } as never);
    expect("displayMode" in normalized).toBe(false);
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
    store.persist();

    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string) as {
      hotkeys: { launcher: string };
      general: { defaultTerminal: string; language: string };
      commands: {
        disabledCommandIds: string[];
      };
    };
    expect(parsed.hotkeys.launcher).toBe("Ctrl+Shift+Z");
    expect(parsed.general.defaultTerminal).toBe("wt");
    expect(parsed.general.language).toBe("en-US");
    expect(parsed.commands.disabledCommandIds).toEqual(["docker-ps"]);
  });

  it("persists alwaysElevatedTerminal in snapshot", () => {
    const store = useSettingsStore();
    store.setAlwaysElevatedTerminal(true);

    expect(store.toSnapshot().general.alwaysElevatedTerminal).toBe(true);
  });

  it("persists terminalReusePolicy in snapshot", () => {
    const store = useSettingsStore();
    const storeWithTerminalReusePolicy = store as typeof store & {
      setTerminalReusePolicy?: (value: string) => void;
    };

    storeWithTerminalReusePolicy.setTerminalReusePolicy?.("normal-only");

    expect((store.toSnapshot().general as Record<string, unknown>).terminalReusePolicy).toBe(
      "normal-only"
    );
  });

  it("persists commands snapshot without transient view state", () => {
    const store = useSettingsStore();
    store.setCommandEnabled("docker-ps", false);
    store.persist();

    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(raw).not.toContain('"view"');
    expect(JSON.parse(raw as string).commands).toEqual({
      disabledCommandIds: ["docker-ps"]
    });
  });

  it("drops legacy commands.view during storage read round-trip", () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        commands: {
          disabledCommandIds: [],
          view: {
            query: "docker"
          }
        }
      })
    );

    const roundTrip = readSettingsFromStorage(localStorage);
    expect((roundTrip.commands as Record<string, unknown>).view).toBeUndefined();
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

  it("hydrateFromStorage swallows normalization write-back failure", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const snapshot = createDefaultSettingsSnapshot();
    snapshot.general.language = "en-US";

    const adapter: SettingsStorageAdapter = {
      readSettings: vi.fn(() => snapshot),
      writeSettings: vi.fn(() => {
        throw new Error("write blocked");
      })
    };

    const store = useSettingsStore();

    expect(() => store.hydrateFromStorage(adapter)).not.toThrow();
    expect(store.language).toBe("en-US");
    expect(warnSpy).toHaveBeenCalledWith(
      "settings hydrate normalization write-back failed",
      expect.any(Error)
    );
    warnSpy.mockRestore();
  });

  it("adapter supports null storage fallback without throwing", () => {
    const adapter = createSettingsStorageAdapter({ storage: null });
    expect(adapter.readSettings()).toEqual(createDefaultSettingsSnapshot());
    expect(() => adapter.writeSettings(createDefaultSettingsSnapshot())).not.toThrow();
  });

  it("adapter falls back to defaults when storage getItem throws", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const storage = {
      getItem: vi.fn(() => {
        throw new Error("storage blocked");
      }),
      setItem: vi.fn()
    } as unknown as Storage;

    const adapter = createSettingsStorageAdapter({ storage });

    expect(adapter.readSettings()).toEqual(createDefaultSettingsSnapshot());
    expect(warnSpy).toHaveBeenCalledWith("settings storage read failed", expect.any(Error));
    warnSpy.mockRestore();
  });

  it("readSettingsFromStorage falls back to defaults when window.localStorage getter throws", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, "localStorage");

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("getter blocked");
      }
    });

    try {
      expect(readSettingsFromStorage()).toEqual(createDefaultSettingsSnapshot());
      expect(warnSpy).toHaveBeenCalledWith("settings storage unavailable", expect.any(Error));
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(window, "localStorage", originalDescriptor);
      }
      warnSpy.mockRestore();
    }
  });

  it("为缺少 appearance.theme 的旧存储填充默认值 obsidian", () => {
    const migrated = migrateSettingsPayload({
      version: 1,
      hotkeys: {},
      general: {},
      commands: {},
      appearance: {
        windowOpacity: 0.8,
      },
    });

    expect(migrated).toBeTruthy();
    expect(migrated?.appearance.theme).toBe("obsidian");
    expect(migrated?.appearance.blurEnabled).toBe(true);
  });

  it("保留有效的 theme 值", () => {
    const migrated = migrateSettingsPayload({
      version: 1,
      hotkeys: {},
      general: {},
      commands: {},
      appearance: {
        windowOpacity: 0.96,
        theme: "obsidian",
        blurEnabled: false,
      },
    });

    expect(migrated?.appearance.theme).toBe("obsidian");
    expect(migrated?.appearance.blurEnabled).toBe(false);
  });

  it("无效 theme 值回退到默认", () => {
    const migrated = migrateSettingsPayload({
      version: 1,
      hotkeys: {},
      general: {},
      commands: {},
      appearance: {
        windowOpacity: 0.96,
        theme: 123,
        blurEnabled: "invalid",
      },
    });

    expect(migrated?.appearance.theme).toBe("obsidian");
    expect(migrated?.appearance.blurEnabled).toBe(true);
  });

  it("normalizes dirty payload across adapter hydrate-persist round-trip", () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
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
    expect(store.autoCheckUpdate).toBe(false);
    expect(store.launchAtLogin).toBe(true);
    expect(store.disabledCommandIds).toEqual(["docker-ps"]);
    expect(store.windowOpacity).toBe(0.96);

    const roundTrip = readSettingsFromStorage(localStorage);
    expect(roundTrip.hotkeys.launcher).toBe("Ctrl+Alt+G");
    expect(roundTrip.general.defaultTerminal).toBe("powershell");
    expect(roundTrip.general.language).toBe("zh-CN");
    expect(roundTrip.general.autoCheckUpdate).toBe(false);
    expect(roundTrip.general.launchAtLogin).toBe(true);
    expect(roundTrip.commands.disabledCommandIds).toEqual(["docker-ps"]);
    expect(roundTrip.appearance.windowOpacity).toBe(0.96);
    expect((roundTrip.commands as Record<string, unknown>).view).toBeUndefined();
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).not.toContain('"view"');
  });
});
