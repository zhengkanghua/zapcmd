import { defineStore } from "pinia";
import type { AppLocale } from "../i18n";
import {
  DEFAULT_AUTO_CHECK_UPDATE,
  DEFAULT_LAUNCH_AT_LOGIN,
  SETTINGS_SCHEMA_VERSION,
  createDefaultSettingsSnapshot,
  type CommandManagementViewState,
  type HotkeyFieldId,
  type HotkeySettings,
  type PersistedSettingsSnapshot
} from "./settings/defaults";
import {
  normalizeBlurEnabled,
  normalizeBoolean,
  normalizeCommandViewState,
  normalizeDisabledCommandIds,
  normalizeHotkeys,
  normalizeLanguage,
  normalizePersistedSettingsSnapshot,
  normalizeTerminalId,
  normalizeThemeId,
  normalizeWindowOpacity
} from "./settings/normalization";
import {
  createSettingsStorageAdapter,
  type SettingsStorageAdapter
} from "./settings/storageAdapter";

export {
  DEFAULT_WINDOW_OPACITY,
  HOTKEY_FIELD_IDS,
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
export { createSettingsStorageAdapter, readSettingsFromStorage, writeSettingsToStorage } from "./settings/storageAdapter";
export type { SettingsStorageAdapter } from "./settings/storageAdapter";

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
  theme: string;
  blurEnabled: boolean;
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
      windowOpacity: state.windowOpacity,
      theme: state.theme,
      blurEnabled: state.blurEnabled
    }
  });
}

function resolveAdapter(adapter?: SettingsStorageAdapter): SettingsStorageAdapter {
  return adapter ?? createSettingsStorageAdapter();
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
      windowOpacity: defaults.appearance.windowOpacity,
      theme: defaults.appearance.theme,
      blurEnabled: defaults.appearance.blurEnabled
    };
  },
  actions: {
    hydrateFromStorage(adapter?: SettingsStorageAdapter): void {
      const storageAdapter = resolveAdapter(adapter);
      const snapshot = storageAdapter.readSettings();
      this.applySnapshot(snapshot);
      storageAdapter.writeSettings(snapshot);
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
      this.theme = normalized.appearance.theme;
      this.blurEnabled = normalized.appearance.blurEnabled;
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
    setTheme(value: string): void {
      this.theme = normalizeThemeId(value);
    },
    setBlurEnabled(value: boolean): void {
      this.blurEnabled = normalizeBlurEnabled(value);
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
        windowOpacity: this.windowOpacity,
        theme: this.theme,
        blurEnabled: this.blurEnabled
      });
    },
    persist(adapter?: SettingsStorageAdapter): void {
      resolveAdapter(adapter).writeSettings(this.toSnapshot());
    }
  }
});
