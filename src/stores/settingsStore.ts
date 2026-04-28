import { defineStore } from "pinia";
import type { AppLocale } from "../i18n";
import {
  DEFAULT_AUTO_CHECK_UPDATE,
  DEFAULT_ALWAYS_ELEVATED_TERMINAL,
  DEFAULT_LAUNCH_AT_LOGIN,
  DEFAULT_QUEUE_AUTO_CLEAR_ON_SUCCESS,
  SETTINGS_SCHEMA_VERSION,
  createDefaultSettingsSnapshot,
  type HotkeyFieldId,
  type HotkeySettings,
  type PointerActionFieldId,
  type PointerActionSettings,
  type PersistedSettingsSnapshot,
  type SearchResultPointerAction,
  type TerminalReusePolicy
} from "./settings/defaults";
import {
  normalizeBlurEnabled,
  normalizeBoolean,
  normalizeDisabledCommandIds,
  normalizeHotkeys,
  normalizeLanguage,
  normalizeMotionPresetId,
  normalizePointerActions,
  normalizePersistedSettingsSnapshot,
  normalizeTerminalId,
  normalizeTerminalReusePolicy,
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
  createDefaultCommandViewState,
  createDefaultSettingsSnapshot
} from "./settings/defaults";
export type {
  CommandFilterIssue,
  CommandFilterOverride,
  CommandFilterSource,
  CommandFilterStatus,
  CommandManagementViewState,
  CommandSortBy,
  HotkeyFieldId,
  HotkeySettings,
  PointerActionFieldId,
  PointerActionSettings,
  PersistedSettingsSnapshot,
  SearchResultPointerAction,
  TerminalReusePolicy
} from "./settings/defaults";
export { migrateSettingsPayload } from "./settings/migration";
export { createSettingsStorageAdapter, readSettingsFromStorage, writeSettingsToStorage } from "./settings/storageAdapter";
export type { SettingsStorageAdapter } from "./settings/storageAdapter";

interface SettingsState {
  schemaVersion: number;
  hotkeys: HotkeySettings;
  defaultTerminal: string;
  terminalReusePolicy: TerminalReusePolicy;
  language: AppLocale;
  autoCheckUpdate: boolean;
  launchAtLogin: boolean;
  alwaysElevatedTerminal: boolean;
  queueAutoClearOnSuccess: boolean;
  pointerActions: PointerActionSettings;
  disabledCommandIds: string[];
  windowOpacity: number;
  theme: string;
  blurEnabled: boolean;
  motionPreset: string;
}

type SettingsGeneralState = Pick<
  SettingsState,
  | "defaultTerminal"
  | "terminalReusePolicy"
  | "language"
  | "autoCheckUpdate"
  | "launchAtLogin"
  | "alwaysElevatedTerminal"
  | "queueAutoClearOnSuccess"
  | "pointerActions"
>;

function snapshotGeneralFromState(state: SettingsGeneralState): PersistedSettingsSnapshot["general"] {
  return {
    defaultTerminal: state.defaultTerminal,
    terminalReusePolicy: state.terminalReusePolicy,
    language: state.language,
    autoCheckUpdate: state.autoCheckUpdate,
    launchAtLogin: state.launchAtLogin,
    alwaysElevatedTerminal: state.alwaysElevatedTerminal,
    queueAutoClearOnSuccess: state.queueAutoClearOnSuccess,
    pointerActions: state.pointerActions
  };
}

function applyGeneralState(target: SettingsGeneralState, general: PersistedSettingsSnapshot["general"]): void {
  // 统一从已规范化的 general snapshot 回写，避免设置字段在多个入口分叉。
  target.defaultTerminal = general.defaultTerminal;
  target.terminalReusePolicy = general.terminalReusePolicy;
  target.language = general.language;
  target.autoCheckUpdate = general.autoCheckUpdate;
  target.launchAtLogin = general.launchAtLogin;
  target.alwaysElevatedTerminal = general.alwaysElevatedTerminal;
  target.queueAutoClearOnSuccess = general.queueAutoClearOnSuccess;
  target.pointerActions = general.pointerActions;
}

function snapshotFromState(state: SettingsState): PersistedSettingsSnapshot {
  return normalizePersistedSettingsSnapshot({
    version: SETTINGS_SCHEMA_VERSION,
    hotkeys: state.hotkeys,
    general: snapshotGeneralFromState(state),
    commands: {
      disabledCommandIds: state.disabledCommandIds
    },
    appearance: {
      windowOpacity: state.windowOpacity,
      theme: state.theme,
      blurEnabled: state.blurEnabled,
      motionPreset: state.motionPreset
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
      terminalReusePolicy: defaults.general.terminalReusePolicy,
      language: defaults.general.language,
      autoCheckUpdate: defaults.general.autoCheckUpdate,
      launchAtLogin: defaults.general.launchAtLogin,
      alwaysElevatedTerminal: defaults.general.alwaysElevatedTerminal,
      queueAutoClearOnSuccess: defaults.general.queueAutoClearOnSuccess,
      pointerActions: defaults.general.pointerActions,
      disabledCommandIds: defaults.commands.disabledCommandIds,
      windowOpacity: defaults.appearance.windowOpacity,
      theme: defaults.appearance.theme,
      blurEnabled: defaults.appearance.blurEnabled,
      motionPreset: defaults.appearance.motionPreset
    };
  },
  actions: {
    hydrateFromStorage(adapter?: SettingsStorageAdapter): void {
      const storageAdapter = resolveAdapter(adapter);
      const snapshot = storageAdapter.readSettings();
      this.applySnapshot(snapshot);
      try {
        storageAdapter.writeSettings(snapshot);
      } catch (error) {
        console.warn("settings hydrate normalization write-back failed", error);
      }
    },
    applySnapshot(snapshot: PersistedSettingsSnapshot): void {
      const normalized = normalizePersistedSettingsSnapshot(snapshot);
      this.schemaVersion = SETTINGS_SCHEMA_VERSION;
      this.hotkeys = normalized.hotkeys;
      applyGeneralState(this, normalized.general);
      this.disabledCommandIds = normalized.commands.disabledCommandIds;
      this.windowOpacity = normalized.appearance.windowOpacity;
      this.theme = normalized.appearance.theme;
      this.blurEnabled = normalized.appearance.blurEnabled;
      this.motionPreset = normalized.appearance.motionPreset;
    },
    setHotkey(field: HotkeyFieldId, value: string): void {
      this.hotkeys = normalizeHotkeys({ ...this.hotkeys, [field]: value });
    },
    setDefaultTerminal(value: string): void {
      this.defaultTerminal = normalizeTerminalId(value);
    },
    setTerminalReusePolicy(value: TerminalReusePolicy): void {
      this.terminalReusePolicy = normalizeTerminalReusePolicy(value);
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
    setAlwaysElevatedTerminal(value: boolean): void {
      this.alwaysElevatedTerminal = normalizeBoolean(value, DEFAULT_ALWAYS_ELEVATED_TERMINAL);
    },
    setQueueAutoClearOnSuccess(value: boolean): void {
      this.queueAutoClearOnSuccess = normalizeBoolean(value, DEFAULT_QUEUE_AUTO_CLEAR_ON_SUCCESS);
    },
    setPointerAction(field: PointerActionFieldId, action: SearchResultPointerAction): void {
      this.pointerActions = normalizePointerActions({
        ...this.pointerActions,
        [field]: action
      });
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
    setWindowOpacity(value: number): void {
      this.windowOpacity = normalizeWindowOpacity(value);
    },
    setTheme(value: string): void {
      this.theme = normalizeThemeId(value);
    },
    setBlurEnabled(value: boolean): void {
      this.blurEnabled = normalizeBlurEnabled(value);
    },
    setMotionPreset(value: string): void {
      this.motionPreset = normalizeMotionPresetId(value);
    },
    toSnapshot(): PersistedSettingsSnapshot {
      return snapshotFromState({
        schemaVersion: this.schemaVersion,
        hotkeys: this.hotkeys,
        defaultTerminal: this.defaultTerminal,
        terminalReusePolicy: this.terminalReusePolicy,
        language: this.language,
        autoCheckUpdate: this.autoCheckUpdate,
        launchAtLogin: this.launchAtLogin,
        alwaysElevatedTerminal: this.alwaysElevatedTerminal,
        queueAutoClearOnSuccess: this.queueAutoClearOnSuccess,
        pointerActions: this.pointerActions,
        disabledCommandIds: this.disabledCommandIds,
        windowOpacity: this.windowOpacity,
        theme: this.theme,
        blurEnabled: this.blurEnabled,
        motionPreset: this.motionPreset
      });
    },
    persist(adapter?: SettingsStorageAdapter): void {
      resolveAdapter(adapter).writeSettings(this.toSnapshot());
    }
  }
});
