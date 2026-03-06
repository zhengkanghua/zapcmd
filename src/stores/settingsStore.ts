import { defineStore } from "pinia";
import type { AppLocale } from "../i18n";
import {
  DEFAULT_AUTO_CHECK_UPDATE,
  DEFAULT_LAUNCH_AT_LOGIN,
  LEGACY_GENERAL_SETTINGS_STORAGE_KEY,
  LEGACY_HOTKEY_SETTINGS_STORAGE_KEY,
  SETTINGS_SCHEMA_VERSION,
  SETTINGS_STORAGE_KEY,
  createDefaultSettingsSnapshot,
  type CommandManagementViewState,
  type HotkeyFieldId,
  type HotkeySettings,
  type PersistedSettingsSnapshot
} from "./settings/defaults";
import { migrateLegacyStoragePayload, migrateSettingsPayload } from "./settings/migration";
import {
  isRecord,
  normalizeBoolean,
  normalizeCommandViewState,
  normalizeDisabledCommandIds,
  normalizeHotkeys,
  normalizeLanguage,
  normalizePersistedSettingsSnapshot,
  normalizeTerminalId,
  normalizeWindowOpacity
} from "./settings/normalization";

export {
  DEFAULT_WINDOW_OPACITY,
  HOTKEY_FIELD_IDS,
  LEGACY_GENERAL_SETTINGS_STORAGE_KEY,
  LEGACY_HOTKEY_SETTINGS_STORAGE_KEY,
  LEGACY_SETTINGS_SCHEMA_VERSION,
  MAX_WINDOW_OPACITY,
  MIN_WINDOW_OPACITY,
  SETTINGS_SCHEMA_VERSION,
  SETTINGS_STORAGE_KEY,
  createDefaultSettingsSnapshot
} from "./settings/defaults";
export type {
  CommandDisplayMode,
  CommandFilterIssue,
  CommandFilterOverride,
  CommandFilterSource,
  CommandFilterStatus,
  CommandManagementViewState,
  CommandSortBy,
  HotkeyFieldId,
  HotkeySettings,
  PersistedSettingsSnapshot
} from "./settings/defaults";
export { migrateSettingsPayload } from "./settings/migration";

let hasWarnedSettingsPayloadParseFailure = false;

function parseJsonRecord(raw: string | null): Record<string, unknown> | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch (error) {
    if (!hasWarnedSettingsPayloadParseFailure) {
      hasWarnedSettingsPayloadParseFailure = true;
      console.warn("settings payload json parse failed", error);
    }
    return null;
  }
}

function resolveStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage ?? null;
}

export function readSettingsFromStorage(storage: Storage | null = resolveStorage()): PersistedSettingsSnapshot {
  if (!storage) {
    return createDefaultSettingsSnapshot();
  }

  const currentPayload = parseJsonRecord(storage.getItem(SETTINGS_STORAGE_KEY));
  const migratedCurrent = migrateSettingsPayload(currentPayload);
  if (migratedCurrent) {
    return migratedCurrent;
  }

  const legacyHotkeysPayload = parseJsonRecord(storage.getItem(LEGACY_HOTKEY_SETTINGS_STORAGE_KEY));
  const legacyGeneralPayload = parseJsonRecord(storage.getItem(LEGACY_GENERAL_SETTINGS_STORAGE_KEY));

  return migrateLegacyStoragePayload({ legacyHotkeysPayload, legacyGeneralPayload });
}

export function writeSettingsToStorage(
  snapshot: PersistedSettingsSnapshot,
  storage: Storage | null = resolveStorage()
): void {
  if (!storage) {
    return;
  }

  const normalizedSnapshot = normalizePersistedSettingsSnapshot(snapshot);
  storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalizedSnapshot));
  storage.removeItem(LEGACY_HOTKEY_SETTINGS_STORAGE_KEY);
  storage.removeItem(LEGACY_GENERAL_SETTINGS_STORAGE_KEY);
}

interface SettingsState {
  schemaVersion: number;
  hotkeys: HotkeySettings;
  defaultTerminal: string;
  language: AppLocale;
  autoCheckUpdate: boolean;
  launchAtLogin: boolean;
  disabledCommandIds: string[];
  commandView: CommandManagementViewState;
  windowOpacity: number;
}

function snapshotFromState(state: SettingsState): PersistedSettingsSnapshot {
  return normalizePersistedSettingsSnapshot({
    version: SETTINGS_SCHEMA_VERSION,
    hotkeys: state.hotkeys,
    general: {
      defaultTerminal: state.defaultTerminal,
      language: state.language,
      autoCheckUpdate: state.autoCheckUpdate,
      launchAtLogin: state.launchAtLogin
    },
    commands: {
      disabledCommandIds: state.disabledCommandIds,
      view: state.commandView
    },
    appearance: {
      windowOpacity: state.windowOpacity
    }
  });
}

export const useSettingsStore = defineStore("settings", {
  state: (): SettingsState => {
    const defaults = createDefaultSettingsSnapshot();
    return {
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      hotkeys: defaults.hotkeys,
      defaultTerminal: defaults.general.defaultTerminal,
      language: defaults.general.language,
      autoCheckUpdate: defaults.general.autoCheckUpdate,
      launchAtLogin: defaults.general.launchAtLogin,
      disabledCommandIds: defaults.commands.disabledCommandIds,
      commandView: defaults.commands.view,
      windowOpacity: defaults.appearance.windowOpacity
    };
  },
  actions: {
    hydrateFromStorage(): void {
      const snapshot = readSettingsFromStorage();
      this.applySnapshot(snapshot);
      writeSettingsToStorage(snapshot);
    },
    applySnapshot(snapshot: PersistedSettingsSnapshot): void {
      const normalized = normalizePersistedSettingsSnapshot(snapshot);
      this.schemaVersion = SETTINGS_SCHEMA_VERSION;
      this.hotkeys = normalized.hotkeys;
      this.defaultTerminal = normalized.general.defaultTerminal;
      this.language = normalized.general.language;
      this.autoCheckUpdate = normalized.general.autoCheckUpdate;
      this.launchAtLogin = normalized.general.launchAtLogin;
      this.disabledCommandIds = normalized.commands.disabledCommandIds;
      this.commandView = normalized.commands.view;
      this.windowOpacity = normalized.appearance.windowOpacity;
    },
    setHotkey(field: HotkeyFieldId, value: string): void {
      this.hotkeys = normalizeHotkeys({ ...this.hotkeys, [field]: value });
    },
    setDefaultTerminal(value: string): void {
      this.defaultTerminal = normalizeTerminalId(value);
    },
    setLanguage(value: AppLocale): void {
      this.language = normalizeLanguage(value);
    },
    setAutoCheckUpdate(value: boolean): void {
      this.autoCheckUpdate = normalizeBoolean(value, DEFAULT_AUTO_CHECK_UPDATE);
    },
    setLaunchAtLogin(value: boolean): void {
      this.launchAtLogin = normalizeBoolean(value, DEFAULT_LAUNCH_AT_LOGIN);
    },
    setCommandEnabled(commandId: string, enabled: boolean): void {
      const id = commandId.trim();
      if (!id) {
        return;
      }

      const set = new Set(this.disabledCommandIds);
      if (enabled) {
        set.delete(id);
      } else {
        set.add(id);
      }
      this.disabledCommandIds = Array.from(set);
    },
    setDisabledCommandIds(ids: string[]): void {
      this.disabledCommandIds = normalizeDisabledCommandIds(ids);
    },
    setCommandViewState(patch: Partial<CommandManagementViewState>): void {
      this.commandView = normalizeCommandViewState({
        ...this.commandView,
        ...patch
      });
    },
    setWindowOpacity(value: number): void {
      this.windowOpacity = normalizeWindowOpacity(value);
    },
    toSnapshot(): PersistedSettingsSnapshot {
      return snapshotFromState({
        schemaVersion: this.schemaVersion,
        hotkeys: this.hotkeys,
        defaultTerminal: this.defaultTerminal,
        language: this.language,
        autoCheckUpdate: this.autoCheckUpdate,
        launchAtLogin: this.launchAtLogin,
        disabledCommandIds: this.disabledCommandIds,
        commandView: this.commandView,
        windowOpacity: this.windowOpacity
      });
    },
    persist(): void {
      writeSettingsToStorage(this.toSnapshot());
    }
  }
});
