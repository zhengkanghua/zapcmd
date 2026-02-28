import { defineStore } from "pinia";
import { normalizeAppLocale, type AppLocale } from "../i18n";

import { normalizeHotkey } from "../shared/hotkeys";

export const SETTINGS_STORAGE_KEY = "zapcmd.settings";
export const LEGACY_HOTKEY_SETTINGS_STORAGE_KEY = "zapcmd.settings.hotkeys";
export const LEGACY_GENERAL_SETTINGS_STORAGE_KEY = "zapcmd.settings.general";
export const SETTINGS_SCHEMA_VERSION = 3;
const SETTINGS_SCHEMA_VERSION_V2 = 2;
export const LEGACY_SETTINGS_SCHEMA_VERSION = 1;

export const HOTKEY_FIELD_IDS = [
  "launcher",
  "toggleQueue",
  "switchFocus",
  "navigateUp",
  "navigateDown",
  "executeSelected",
  "stageSelected",
  "escape",
  "executeQueue",
  "clearQueue",
  "removeQueueItem",
  "reorderUp",
  "reorderDown"
] as const;

export type HotkeyFieldId = (typeof HOTKEY_FIELD_IDS)[number];
export type HotkeySettings = Record<HotkeyFieldId, string>;
export type CommandFilterSource = "all" | "builtin" | "user";
export type CommandFilterStatus = "all" | "enabled" | "disabled";
export type CommandFilterOverride = "all" | "overridden";
export type CommandFilterIssue = "all" | "with-issues";
export type CommandSortBy = "default" | "title" | "category" | "source" | "status";
export type CommandDisplayMode = "list" | "groupedByFile";

export interface CommandManagementViewState {
  query: string;
  sourceFilter: CommandFilterSource;
  statusFilter: CommandFilterStatus;
  overrideFilter: CommandFilterOverride;
  issueFilter: CommandFilterIssue;
  fileFilter: string;
  sortBy: CommandSortBy;
  displayMode: CommandDisplayMode;
}

export interface PersistedSettingsSnapshot {
  version: typeof SETTINGS_SCHEMA_VERSION;
  hotkeys: HotkeySettings;
  general: {
    defaultTerminal: string;
    language: AppLocale;
    autoCheckUpdate: boolean;
    launchAtLogin: boolean;
  };
  commands: {
    disabledCommandIds: string[];
    view: CommandManagementViewState;
  };
  appearance: {
    windowOpacity: number;
  };
}

const DEFAULT_TERMINAL = "powershell";
const DEFAULT_LANGUAGE: AppLocale = "zh-CN";
const DEFAULT_AUTO_CHECK_UPDATE = true;
const DEFAULT_LAUNCH_AT_LOGIN = false;
export const DEFAULT_WINDOW_OPACITY = 0.92;
export const MIN_WINDOW_OPACITY = 0.2;
export const MAX_WINDOW_OPACITY = 1.0;
const DEFAULT_HOTKEYS: HotkeySettings = {
  launcher: "Alt+V",
  toggleQueue: "Tab",
  switchFocus: "Ctrl+Tab",
  navigateUp: "ArrowUp",
  navigateDown: "ArrowDown",
  executeSelected: "Enter",
  stageSelected: "ArrowRight",
  escape: "Escape",
  executeQueue: "Ctrl+Enter",
  clearQueue: "Ctrl+Backspace",
  removeQueueItem: "Delete",
  reorderUp: "Alt+ArrowUp",
  reorderDown: "Alt+ArrowDown"
};
const DEFAULT_COMMAND_VIEW_STATE: CommandManagementViewState = {
  query: "",
  sourceFilter: "all",
  statusFilter: "all",
  overrideFilter: "all",
  issueFilter: "all",
  fileFilter: "all",
  sortBy: "default",
  displayMode: "list"
};
const COMMAND_SOURCE_FILTERS = ["all", "builtin", "user"] as const;
const COMMAND_STATUS_FILTERS = ["all", "enabled", "disabled"] as const;
const COMMAND_OVERRIDE_FILTERS = ["all", "overridden"] as const;
const COMMAND_ISSUE_FILTERS = ["all", "with-issues"] as const;
const COMMAND_SORT_OPTIONS = ["default", "title", "category", "source", "status"] as const;
const COMMAND_DISPLAY_MODES = ["list", "groupedByFile"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeTerminalId(value: unknown): string {
  if (typeof value !== "string") {
    return DEFAULT_TERMINAL;
  }
  const trimmed = value.trim();
  return trimmed || DEFAULT_TERMINAL;
}

function normalizeLanguage(value: unknown): AppLocale {
  return normalizeAppLocale(value) ?? DEFAULT_LANGUAGE;
}

function normalizeDisabledCommandIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    const id = item.trim();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    normalized.push(id);
  }

  return normalized;
}

function normalizeQuery(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function normalizeFileFilter(value: unknown): string {
  if (typeof value !== "string") {
    return "all";
  }
  const normalized = value.trim();
  return normalized || "all";
}

function normalizeEnumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  return (allowed as readonly string[]).includes(normalized) ? (normalized as T) : fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }
  return fallback;
}

function normalizeCommandViewState(value: unknown): CommandManagementViewState {
  if (!isRecord(value)) {
    return { ...DEFAULT_COMMAND_VIEW_STATE };
  }

  return {
    query: normalizeQuery(value.query),
    sourceFilter: normalizeEnumValue(value.sourceFilter, COMMAND_SOURCE_FILTERS, "all"),
    statusFilter: normalizeEnumValue(value.statusFilter, COMMAND_STATUS_FILTERS, "all"),
    overrideFilter: normalizeEnumValue(value.overrideFilter, COMMAND_OVERRIDE_FILTERS, "all"),
    issueFilter: normalizeEnumValue(value.issueFilter, COMMAND_ISSUE_FILTERS, "all"),
    fileFilter: normalizeFileFilter(value.fileFilter),
    sortBy: normalizeEnumValue(value.sortBy, COMMAND_SORT_OPTIONS, "default"),
    displayMode: normalizeEnumValue(value.displayMode, COMMAND_DISPLAY_MODES, "list")
  };
}

function createDefaultHotkeys(): HotkeySettings {
  return { ...DEFAULT_HOTKEYS };
}

function normalizeHotkeys(input: Partial<HotkeySettings>): HotkeySettings {
  const defaults = createDefaultHotkeys();
  for (const field of HOTKEY_FIELD_IDS) {
    const rawValue = input[field];
    if (typeof rawValue !== "string") {
      continue;
    }
    const normalized = normalizeHotkey(rawValue);
    if (normalized) {
      defaults[field] = normalized;
    }
  }
  return defaults;
}

function extractVersionedHotkeys(payload: Record<string, unknown>): Partial<HotkeySettings> {
  if (!isRecord(payload.hotkeys)) {
    return {};
  }
  const out: Partial<HotkeySettings> = {};
  for (const field of HOTKEY_FIELD_IDS) {
    const value = payload.hotkeys[field];
    if (typeof value === "string") {
      out[field] = value;
    }
  }
  return out;
}

function extractVersionedDefaultTerminal(payload: Record<string, unknown>): string {
  if (!isRecord(payload.general)) {
    return DEFAULT_TERMINAL;
  }
  return normalizeTerminalId(payload.general.defaultTerminal);
}

function extractVersionedLanguage(payload: Record<string, unknown>): AppLocale {
  if (!isRecord(payload.general)) {
    return DEFAULT_LANGUAGE;
  }
  return normalizeLanguage(payload.general.language);
}

function extractVersionedAutoCheckUpdate(payload: Record<string, unknown>): boolean {
  if (!isRecord(payload.general)) {
    return DEFAULT_AUTO_CHECK_UPDATE;
  }
  return normalizeBoolean(payload.general.autoCheckUpdate, DEFAULT_AUTO_CHECK_UPDATE);
}

function extractVersionedLaunchAtLogin(payload: Record<string, unknown>): boolean {
  if (!isRecord(payload.general)) {
    return DEFAULT_LAUNCH_AT_LOGIN;
  }
  return normalizeBoolean(payload.general.launchAtLogin, DEFAULT_LAUNCH_AT_LOGIN);
}

function extractVersionedDisabledCommandIds(payload: Record<string, unknown>): string[] {
  if (!isRecord(payload.commands)) {
    return [];
  }
  return normalizeDisabledCommandIds(payload.commands.disabledCommandIds);
}

function extractVersionedCommandViewState(payload: Record<string, unknown>): CommandManagementViewState {
  if (!isRecord(payload.commands)) {
    return { ...DEFAULT_COMMAND_VIEW_STATE };
  }
  return normalizeCommandViewState(payload.commands.view);
}

function normalizeWindowOpacity(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_WINDOW_OPACITY;
  }
  return Math.min(MAX_WINDOW_OPACITY, Math.max(MIN_WINDOW_OPACITY, value));
}

function extractVersionedAppearance(payload: Record<string, unknown>): { windowOpacity: number } {
  if (!isRecord(payload.appearance)) {
    return { windowOpacity: DEFAULT_WINDOW_OPACITY };
  }
  return { windowOpacity: normalizeWindowOpacity(payload.appearance.windowOpacity) };
}

function extractLegacyHotkeys(payload: Record<string, unknown>): Partial<HotkeySettings> {
  const out: Partial<HotkeySettings> = {};
  for (const field of HOTKEY_FIELD_IDS) {
    const key = `${field}Hotkey`;
    const value = payload[key];
    if (typeof value === "string") {
      out[field] = value;
    }
  }
  return out;
}

function parseJsonRecord(raw: string | null): Record<string, unknown> | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function resolveStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage ?? null;
}

export function createDefaultSettingsSnapshot(): PersistedSettingsSnapshot {
  return {
    version: SETTINGS_SCHEMA_VERSION,
    hotkeys: createDefaultHotkeys(),
    general: {
      defaultTerminal: DEFAULT_TERMINAL,
      language: DEFAULT_LANGUAGE,
      autoCheckUpdate: DEFAULT_AUTO_CHECK_UPDATE,
      launchAtLogin: DEFAULT_LAUNCH_AT_LOGIN
    },
    commands: {
      disabledCommandIds: [],
      view: { ...DEFAULT_COMMAND_VIEW_STATE }
    },
    appearance: {
      windowOpacity: DEFAULT_WINDOW_OPACITY
    }
  };
}

export function migrateSettingsPayload(payload: unknown): PersistedSettingsSnapshot | null {
  if (!isRecord(payload)) {
    return null;
  }

  const version = payload.version;
  if (version === SETTINGS_SCHEMA_VERSION) {
    return {
      version: SETTINGS_SCHEMA_VERSION,
      hotkeys: normalizeHotkeys(extractVersionedHotkeys(payload)),
      general: {
        defaultTerminal: extractVersionedDefaultTerminal(payload),
        language: extractVersionedLanguage(payload),
        autoCheckUpdate: extractVersionedAutoCheckUpdate(payload),
        launchAtLogin: extractVersionedLaunchAtLogin(payload)
      },
      commands: {
        disabledCommandIds: extractVersionedDisabledCommandIds(payload),
        view: extractVersionedCommandViewState(payload)
      },
      appearance: extractVersionedAppearance(payload)
    };
  }

  if (version === SETTINGS_SCHEMA_VERSION_V2) {
    return {
      version: SETTINGS_SCHEMA_VERSION,
      hotkeys: normalizeHotkeys(extractVersionedHotkeys(payload)),
      general: {
        defaultTerminal: extractVersionedDefaultTerminal(payload),
        language: extractVersionedLanguage(payload),
        autoCheckUpdate: DEFAULT_AUTO_CHECK_UPDATE,
        launchAtLogin: DEFAULT_LAUNCH_AT_LOGIN
      },
      commands: {
        disabledCommandIds: extractVersionedDisabledCommandIds(payload),
        view: extractVersionedCommandViewState(payload)
      },
      appearance: extractVersionedAppearance(payload)
    };
  }

  if (version === LEGACY_SETTINGS_SCHEMA_VERSION) {
    return {
      version: SETTINGS_SCHEMA_VERSION,
      hotkeys: normalizeHotkeys(extractVersionedHotkeys(payload)),
      general: {
        defaultTerminal: extractVersionedDefaultTerminal(payload),
        language: DEFAULT_LANGUAGE,
        autoCheckUpdate: DEFAULT_AUTO_CHECK_UPDATE,
        launchAtLogin: DEFAULT_LAUNCH_AT_LOGIN
      },
      commands: {
        disabledCommandIds: extractVersionedDisabledCommandIds(payload),
        view: extractVersionedCommandViewState(payload)
      },
      appearance: { windowOpacity: DEFAULT_WINDOW_OPACITY }
    };
  }

  if (version == null && (isRecord(payload.hotkeys) || isRecord(payload.general) || isRecord(payload.commands))) {
    return {
      version: SETTINGS_SCHEMA_VERSION,
      hotkeys: normalizeHotkeys(extractVersionedHotkeys(payload)),
      general: {
        defaultTerminal: extractVersionedDefaultTerminal(payload),
        language: extractVersionedLanguage(payload),
        autoCheckUpdate: extractVersionedAutoCheckUpdate(payload),
        launchAtLogin: extractVersionedLaunchAtLogin(payload)
      },
      commands: {
        disabledCommandIds: extractVersionedDisabledCommandIds(payload),
        view: extractVersionedCommandViewState(payload)
      },
      appearance: extractVersionedAppearance(payload)
    };
  }

  return null;
}

export function readSettingsFromStorage(storage: Storage | null = resolveStorage()): PersistedSettingsSnapshot {
  const defaults = createDefaultSettingsSnapshot();
  if (!storage) {
    return defaults;
  }

  const currentPayload = parseJsonRecord(storage.getItem(SETTINGS_STORAGE_KEY));
  const migratedCurrent = migrateSettingsPayload(currentPayload);
  if (migratedCurrent) {
    return migratedCurrent;
  }

  const legacyHotkeysPayload = parseJsonRecord(storage.getItem(LEGACY_HOTKEY_SETTINGS_STORAGE_KEY));
  const legacyGeneralPayload = parseJsonRecord(storage.getItem(LEGACY_GENERAL_SETTINGS_STORAGE_KEY));

  const legacyHotkeys = legacyHotkeysPayload ? extractLegacyHotkeys(legacyHotkeysPayload) : {};
  const defaultTerminal = legacyGeneralPayload
    ? normalizeTerminalId(legacyGeneralPayload.defaultTerminal)
    : DEFAULT_TERMINAL;

  return {
    version: SETTINGS_SCHEMA_VERSION,
    hotkeys: normalizeHotkeys(legacyHotkeys),
    general: {
      defaultTerminal,
      language: DEFAULT_LANGUAGE,
      autoCheckUpdate: DEFAULT_AUTO_CHECK_UPDATE,
      launchAtLogin: DEFAULT_LAUNCH_AT_LOGIN
    },
    commands: {
      disabledCommandIds: [],
      view: { ...DEFAULT_COMMAND_VIEW_STATE }
    },
    appearance: {
      windowOpacity: DEFAULT_WINDOW_OPACITY
    }
  };
}

export function writeSettingsToStorage(
  snapshot: PersistedSettingsSnapshot,
  storage: Storage | null = resolveStorage()
): void {
  if (!storage) {
    return;
  }

  const normalizedSnapshot: PersistedSettingsSnapshot = {
    version: SETTINGS_SCHEMA_VERSION,
    hotkeys: normalizeHotkeys(snapshot.hotkeys),
    general: {
      defaultTerminal: normalizeTerminalId(snapshot.general.defaultTerminal),
      language: normalizeLanguage(snapshot.general.language),
      autoCheckUpdate: normalizeBoolean(snapshot.general.autoCheckUpdate, DEFAULT_AUTO_CHECK_UPDATE),
      launchAtLogin: normalizeBoolean(snapshot.general.launchAtLogin, DEFAULT_LAUNCH_AT_LOGIN)
    },
    commands: {
      disabledCommandIds: normalizeDisabledCommandIds(snapshot.commands.disabledCommandIds),
      view: normalizeCommandViewState(snapshot.commands.view)
    },
    appearance: {
      windowOpacity: normalizeWindowOpacity(snapshot.appearance.windowOpacity)
    }
  };

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

export const useSettingsStore = defineStore("settings", {
  state: (): SettingsState => ({
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    hotkeys: createDefaultHotkeys(),
    defaultTerminal: DEFAULT_TERMINAL,
    language: DEFAULT_LANGUAGE,
    autoCheckUpdate: DEFAULT_AUTO_CHECK_UPDATE,
    launchAtLogin: DEFAULT_LAUNCH_AT_LOGIN,
    disabledCommandIds: [],
    commandView: { ...DEFAULT_COMMAND_VIEW_STATE },
    windowOpacity: DEFAULT_WINDOW_OPACITY
  }),
  actions: {
    hydrateFromStorage(): void {
      const snapshot = readSettingsFromStorage();
      this.applySnapshot(snapshot);
      writeSettingsToStorage(snapshot);
    },
    applySnapshot(snapshot: PersistedSettingsSnapshot): void {
      this.schemaVersion = SETTINGS_SCHEMA_VERSION;
      this.hotkeys = normalizeHotkeys(snapshot.hotkeys);
      this.defaultTerminal = normalizeTerminalId(snapshot.general.defaultTerminal);
      this.language = normalizeLanguage(snapshot.general.language);
      this.autoCheckUpdate = normalizeBoolean(snapshot.general.autoCheckUpdate, DEFAULT_AUTO_CHECK_UPDATE);
      this.launchAtLogin = normalizeBoolean(snapshot.general.launchAtLogin, DEFAULT_LAUNCH_AT_LOGIN);
      this.disabledCommandIds = normalizeDisabledCommandIds(snapshot.commands.disabledCommandIds);
      this.commandView = normalizeCommandViewState(snapshot.commands.view);
      this.windowOpacity = normalizeWindowOpacity(snapshot.appearance.windowOpacity);
    },
    setHotkey(field: HotkeyFieldId, value: string): void {
      const normalized = normalizeHotkey(value);
      this.hotkeys[field] = normalized || this.hotkeys[field];
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
      return {
        version: SETTINGS_SCHEMA_VERSION,
        hotkeys: normalizeHotkeys(this.hotkeys),
        general: {
          defaultTerminal: normalizeTerminalId(this.defaultTerminal),
          language: normalizeLanguage(this.language),
          autoCheckUpdate: normalizeBoolean(this.autoCheckUpdate, DEFAULT_AUTO_CHECK_UPDATE),
          launchAtLogin: normalizeBoolean(this.launchAtLogin, DEFAULT_LAUNCH_AT_LOGIN)
        },
        commands: {
          disabledCommandIds: normalizeDisabledCommandIds(this.disabledCommandIds),
          view: normalizeCommandViewState(this.commandView)
        },
        appearance: {
          windowOpacity: normalizeWindowOpacity(this.windowOpacity)
        }
      };
    },
    persist(): void {
      writeSettingsToStorage(this.toSnapshot());
    }
  }
});
