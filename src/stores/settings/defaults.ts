import type { AppLocale } from "../../i18n";

export const SETTINGS_STORAGE_KEY = "zapcmd.settings";
export const SETTINGS_SCHEMA_VERSION = 1;

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
export type CommandDisplayMode = "list";

export interface CommandManagementViewState {
  query: string;
  sourceFilter: CommandFilterSource;
  statusFilter: CommandFilterStatus;
  categoryFilter: string;
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
  };
  appearance: {
    windowOpacity: number;
    theme: string;
    blurEnabled: boolean;
  };
}

export const DEFAULT_TERMINAL = "powershell";
export const DEFAULT_LANGUAGE: AppLocale = "zh-CN";
export const DEFAULT_AUTO_CHECK_UPDATE = true;
export const DEFAULT_LAUNCH_AT_LOGIN = false;
export const DEFAULT_WINDOW_OPACITY = 0.96;
export const MIN_WINDOW_OPACITY = 0.2;
export const MAX_WINDOW_OPACITY = 1.0;
export const DEFAULT_THEME = "obsidian";
export const DEFAULT_BLUR_ENABLED = true;

export const COMMAND_SOURCE_FILTERS = ["all", "builtin", "user"] as const;
export const COMMAND_STATUS_FILTERS = ["all", "enabled", "disabled"] as const;
export const COMMAND_OVERRIDE_FILTERS = ["all", "overridden"] as const;
export const COMMAND_ISSUE_FILTERS = ["all", "with-issues"] as const;
export const COMMAND_SORT_OPTIONS = ["default", "title", "category", "source", "status"] as const;
export const COMMAND_DISPLAY_MODES = ["list"] as const;

const DEFAULT_HOTKEYS: HotkeySettings = {
  launcher: "Alt+V",
  toggleQueue: "",
  switchFocus: "Ctrl+Tab",
  navigateUp: "ArrowUp",
  navigateDown: "ArrowDown",
  executeSelected: "Enter",
  stageSelected: "CmdOrCtrl+Enter",
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
  categoryFilter: "all",
  overrideFilter: "all",
  issueFilter: "all",
  fileFilter: "all",
  sortBy: "default",
  displayMode: "list"
};

export function createDefaultHotkeys(): HotkeySettings {
  return { ...DEFAULT_HOTKEYS };
}

export function createDefaultCommandViewState(): CommandManagementViewState {
  return { ...DEFAULT_COMMAND_VIEW_STATE };
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
      disabledCommandIds: []
    },
    appearance: {
      windowOpacity: DEFAULT_WINDOW_OPACITY,
      theme: DEFAULT_THEME,
      blurEnabled: DEFAULT_BLUR_ENABLED
    }
  };
}
