import { normalizeAppLocale, type AppLocale } from "../../i18n";
import { normalizeHotkey } from "../../shared/hotkeys";
import { resolveMotionPresetMeta } from "../../features/motion/motionRegistry";
import {
  COMMAND_ISSUE_FILTERS,
  COMMAND_OVERRIDE_FILTERS,
  COMMAND_SORT_OPTIONS,
  COMMAND_SOURCE_FILTERS,
  COMMAND_STATUS_FILTERS,
  DEFAULT_AUTO_CHECK_UPDATE,
  DEFAULT_ALWAYS_ELEVATED_TERMINAL,
  DEFAULT_BLUR_ENABLED,
  DEFAULT_LANGUAGE,
  DEFAULT_LAUNCH_AT_LOGIN,
  DEFAULT_MOTION_PRESET,
  POINTER_ACTION_FIELD_IDS,
  DEFAULT_TERMINAL,
  DEFAULT_THEME,
  DEFAULT_WINDOW_OPACITY,
  HOTKEY_FIELD_IDS,
  MAX_WINDOW_OPACITY,
  MIN_WINDOW_OPACITY,
  SEARCH_RESULT_POINTER_ACTIONS,
  SETTINGS_SCHEMA_VERSION,
  createDefaultCommandViewState,
  createDefaultHotkeys,
  createDefaultPointerActions,
  type CommandManagementViewState,
  type HotkeySettings,
  type PointerActionSettings,
  type PersistedSettingsSnapshot,
  type SearchResultPointerAction
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

function normalizeCategoryFilter(value: unknown): string {
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
    categoryFilter: normalizeCategoryFilter(value.categoryFilter),
    overrideFilter: normalizeEnumValue(value.overrideFilter, COMMAND_OVERRIDE_FILTERS, "all"),
    issueFilter: normalizeEnumValue(value.issueFilter, COMMAND_ISSUE_FILTERS, "all"),
    fileFilter: normalizeFileFilter(value.fileFilter),
    sortBy: normalizeEnumValue(value.sortBy, COMMAND_SORT_OPTIONS, "default")
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

/** 将单个鼠标映射值收敛到允许集合，避免提示与真实行为分叉。 */
export function normalizePointerAction(
  value: unknown,
  fallback: SearchResultPointerAction
): SearchResultPointerAction {
  return normalizeEnumValue(value, SEARCH_RESULT_POINTER_ACTIONS, fallback);
}

/** 统一补齐左右键默认值，旧快照缺字段时直接落新默认。 */
export function normalizePointerActions(input: unknown): PointerActionSettings {
  const defaults = createDefaultPointerActions();
  if (!isRecord(input)) {
    return defaults;
  }
  for (const field of POINTER_ACTION_FIELD_IDS) {
    defaults[field] = normalizePointerAction(input[field], defaults[field]);
  }
  return defaults;
}

export function normalizeWindowOpacity(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_WINDOW_OPACITY;
  }
  return Math.min(MAX_WINDOW_OPACITY, Math.max(MIN_WINDOW_OPACITY, value));
}

/** 仅做类型/格式校验。主题 ID 是否在注册表中有效由 useTheme.resolveThemeId 负责 */
export function normalizeThemeId(value: unknown): string {
  if (typeof value !== "string") {
    return DEFAULT_THEME;
  }
  const trimmed = value.trim();
  return trimmed || DEFAULT_THEME;
}

export function normalizeBlurEnabled(value: unknown): boolean {
  return normalizeBoolean(value, DEFAULT_BLUR_ENABLED);
}

/** 仅做类型/格式校验。preset 是否存在于注册表由 motionRegistry resolver 负责 */
export function normalizeMotionPresetId(value: unknown): string {
  if (typeof value !== "string") {
    return DEFAULT_MOTION_PRESET;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_MOTION_PRESET;
  }
  return /^[a-z][a-z0-9-]*$/.test(trimmed) ? trimmed : DEFAULT_MOTION_PRESET;
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
      launchAtLogin: normalizeBoolean(snapshot.general.launchAtLogin, DEFAULT_LAUNCH_AT_LOGIN),
      alwaysElevatedTerminal: normalizeBoolean(
        snapshot.general.alwaysElevatedTerminal,
        DEFAULT_ALWAYS_ELEVATED_TERMINAL
      ),
      pointerActions: normalizePointerActions(snapshot.general.pointerActions)
    },
    commands: {
      disabledCommandIds: normalizeDisabledCommandIds(snapshot.commands.disabledCommandIds)
    },
    appearance: {
      windowOpacity: normalizeWindowOpacity(snapshot.appearance.windowOpacity),
      theme: normalizeThemeId(snapshot.appearance.theme),
      blurEnabled: normalizeBlurEnabled(snapshot.appearance.blurEnabled),
      motionPreset: resolveMotionPresetMeta(normalizeMotionPresetId(snapshot.appearance.motionPreset)).id
    }
  };
}
