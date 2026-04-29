import {
  DEFAULT_MOTION_PRESET,
  DEFAULT_AUTO_CHECK_UPDATE,
  DEFAULT_ALWAYS_ELEVATED_TERMINAL,
  DEFAULT_BLUR_ENABLED,
  DEFAULT_LANGUAGE,
  DEFAULT_LAUNCH_AT_LOGIN,
  DEFAULT_TERMINAL,
  DEFAULT_THEME,
  DEFAULT_WINDOW_OPACITY,
  HOTKEY_FIELD_IDS,
  SETTINGS_SCHEMA_VERSION,
  type HotkeySettings,
  type PointerActionSettings,
  type PersistedSettingsSnapshot
} from "./defaults";
import {
  normalizeMotionPresetId,
  isRecord,
  normalizeBlurEnabled,
  normalizeBoolean,
  normalizeDisabledCommandIds,
  normalizeHotkeys,
  normalizeLanguage,
  normalizePointerActions,
  normalizeTerminalId,
  normalizeThemeId,
  normalizeWindowOpacity
} from "./normalization";
import { resolveMotionPresetMeta } from "../../features/motion/motionRegistry";

type SettingsPayload = Record<string, unknown>;

function extractHotkeys(payload: SettingsPayload): Partial<HotkeySettings> {
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

function extractDefaultTerminal(payload: SettingsPayload): string {
  if (!isRecord(payload.general)) {
    return DEFAULT_TERMINAL;
  }
  return normalizeTerminalId(payload.general.defaultTerminal);
}

function extractLanguage(payload: SettingsPayload) {
  if (!isRecord(payload.general)) {
    return DEFAULT_LANGUAGE;
  }
  return normalizeLanguage(payload.general.language);
}

function extractAutoCheckUpdate(payload: SettingsPayload): boolean {
  if (!isRecord(payload.general)) {
    return DEFAULT_AUTO_CHECK_UPDATE;
  }
  return normalizeBoolean(payload.general.autoCheckUpdate, DEFAULT_AUTO_CHECK_UPDATE);
}

function extractLaunchAtLogin(payload: SettingsPayload): boolean {
  if (!isRecord(payload.general)) {
    return DEFAULT_LAUNCH_AT_LOGIN;
  }
  return normalizeBoolean(payload.general.launchAtLogin, DEFAULT_LAUNCH_AT_LOGIN);
}

function extractAlwaysElevatedTerminal(payload: SettingsPayload): boolean {
  if (!isRecord(payload.general)) {
    return DEFAULT_ALWAYS_ELEVATED_TERMINAL;
  }
  return normalizeBoolean(
    payload.general.alwaysElevatedTerminal,
    DEFAULT_ALWAYS_ELEVATED_TERMINAL
  );
}

function extractPointerActions(payload: SettingsPayload): PointerActionSettings {
  if (!isRecord(payload.general)) {
    return normalizePointerActions(null);
  }
  return normalizePointerActions(payload.general.pointerActions);
}

function extractDisabledCommandIds(payload: SettingsPayload): string[] {
  if (!isRecord(payload.commands)) {
    return [];
  }
  return normalizeDisabledCommandIds(payload.commands.disabledCommandIds);
}

function extractAppearance(payload: SettingsPayload): {
  windowOpacity: number;
  theme: string;
  blurEnabled: boolean;
  motionPreset: string;
} {
  if (!isRecord(payload.appearance)) {
    return {
      windowOpacity: DEFAULT_WINDOW_OPACITY,
      theme: DEFAULT_THEME,
      blurEnabled: DEFAULT_BLUR_ENABLED,
      motionPreset: DEFAULT_MOTION_PRESET
    };
  }
  return {
    windowOpacity: normalizeWindowOpacity(payload.appearance.windowOpacity),
    theme: normalizeThemeId(payload.appearance.theme),
    blurEnabled: normalizeBlurEnabled(payload.appearance.blurEnabled),
    motionPreset: resolveMotionPresetMeta(normalizeMotionPresetId(payload.appearance.motionPreset)).id
  };
}

function createSnapshot(payload: SettingsPayload): PersistedSettingsSnapshot {
  return {
    version: SETTINGS_SCHEMA_VERSION,
    hotkeys: normalizeHotkeys(extractHotkeys(payload)),
    general: {
      defaultTerminal: extractDefaultTerminal(payload),
      language: extractLanguage(payload),
      autoCheckUpdate: extractAutoCheckUpdate(payload),
      launchAtLogin: extractLaunchAtLogin(payload),
      alwaysElevatedTerminal: extractAlwaysElevatedTerminal(payload),
      pointerActions: extractPointerActions(payload)
    },
    commands: {
      disabledCommandIds: extractDisabledCommandIds(payload)
    },
    appearance: extractAppearance(payload)
  };
}

export function migrateSettingsPayload(payload: unknown): PersistedSettingsSnapshot | null {
  if (!isRecord(payload)) {
    return null;
  }

  const version = payload.version;
  if (version === SETTINGS_SCHEMA_VERSION) {
    return createSnapshot(payload);
  }

  // v1/v2 都是本轮 schema 升级前的稳定快照，需要无条件迁移到 v3 并丢弃已废弃字段。
  if (version === 1) {
    return createSnapshot(payload);
  }
  if (version === 2) {
    return createSnapshot(payload);
  }

  if (version == null && (isRecord(payload.hotkeys) || isRecord(payload.general) || isRecord(payload.commands))) {
    return createSnapshot(payload);
  }

  return null;
}
