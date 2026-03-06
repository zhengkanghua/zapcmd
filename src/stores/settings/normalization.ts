import { normalizeAppLocale, type AppLocale } from "../../i18n";
import { normalizeHotkey } from "../../shared/hotkeys";
import {
  COMMAND_DISPLAY_MODES,
  COMMAND_ISSUE_FILTERS,
  COMMAND_OVERRIDE_FILTERS,
  COMMAND_SORT_OPTIONS,
  COMMAND_SOURCE_FILTERS,
  COMMAND_STATUS_FILTERS,
  DEFAULT_AUTO_CHECK_UPDATE,
  DEFAULT_LANGUAGE,
  DEFAULT_LAUNCH_AT_LOGIN,
  DEFAULT_TERMINAL,
  DEFAULT_WINDOW_OPACITY,
  HOTKEY_FIELD_IDS,
  MAX_WINDOW_OPACITY,
  MIN_WINDOW_OPACITY,
  SETTINGS_SCHEMA_VERSION,
  createDefaultCommandViewState,
  createDefaultHotkeys,
  type CommandManagementViewState,
  type HotkeySettings,
  type PersistedSettingsSnapshot
} from "./defaults";

type RecordValue = Record<string, unknown>;

export function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null;
}

export function normalizeTerminalId(value: unknown): string {
  if (typeof value !== "string") {
    return DEFAULT_TERMINAL;
  }
  const trimmed = value.trim();
  return trimmed || DEFAULT_TERMINAL;
}

export function normalizeLanguage(value: unknown): AppLocale {
  const normalized = normalizeAppLocale(value);
  return normalized ?? DEFAULT_LANGUAGE;
}

export function normalizeBoolean(value: unknown, fallback: boolean): boolean {
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

export function normalizeDisabledCommandIds(value: unknown): string[] {
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

export function normalizeCommandViewState(value: unknown): CommandManagementViewState {
  if (!isRecord(value)) {
    return createDefaultCommandViewState();
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

export function normalizeHotkeys(input: Partial<HotkeySettings>): HotkeySettings {
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

export function normalizeWindowOpacity(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_WINDOW_OPACITY;
  }
  return Math.min(MAX_WINDOW_OPACITY, Math.max(MIN_WINDOW_OPACITY, value));
}

export function normalizePersistedSettingsSnapshot(
  snapshot: PersistedSettingsSnapshot
): PersistedSettingsSnapshot {
  return {
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
}
