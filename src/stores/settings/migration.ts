import {
  DEFAULT_AUTO_CHECK_UPDATE,
  DEFAULT_LANGUAGE,
  DEFAULT_LAUNCH_AT_LOGIN,
  DEFAULT_TERMINAL,
  HOTKEY_FIELD_IDS,
  LEGACY_SETTINGS_SCHEMA_VERSION,
  SETTINGS_SCHEMA_VERSION,
  SETTINGS_SCHEMA_VERSION_V2,
  createDefaultSettingsSnapshot,
  type CommandManagementViewState,
  type HotkeySettings,
  type PersistedSettingsSnapshot
} from "./defaults";
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
} from "./normalization";

type SettingsPayload = Record<string, unknown>;

function extractVersionedHotkeys(payload: SettingsPayload): Partial<HotkeySettings> {
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

function extractVersionedDefaultTerminal(payload: SettingsPayload): string {
  if (!isRecord(payload.general)) {
    return DEFAULT_TERMINAL;
  }
  return normalizeTerminalId(payload.general.defaultTerminal);
}

function extractVersionedLanguage(payload: SettingsPayload) {
  if (!isRecord(payload.general)) {
    return DEFAULT_LANGUAGE;
  }
  return normalizeLanguage(payload.general.language);
}

function extractVersionedAutoCheckUpdate(payload: SettingsPayload): boolean {
  if (!isRecord(payload.general)) {
    return DEFAULT_AUTO_CHECK_UPDATE;
  }
  return normalizeBoolean(payload.general.autoCheckUpdate, DEFAULT_AUTO_CHECK_UPDATE);
}

function extractVersionedLaunchAtLogin(payload: SettingsPayload): boolean {
  if (!isRecord(payload.general)) {
    return DEFAULT_LAUNCH_AT_LOGIN;
  }
  return normalizeBoolean(payload.general.launchAtLogin, DEFAULT_LAUNCH_AT_LOGIN);
}

function extractVersionedDisabledCommandIds(payload: SettingsPayload): string[] {
  if (!isRecord(payload.commands)) {
    return [];
  }
  return normalizeDisabledCommandIds(payload.commands.disabledCommandIds);
}

function extractVersionedCommandViewState(payload: SettingsPayload): CommandManagementViewState {
  if (!isRecord(payload.commands)) {
    return createDefaultSettingsSnapshot().commands.view;
  }
  return normalizeCommandViewState(payload.commands.view);
}

function extractVersionedAppearance(payload: SettingsPayload): { windowOpacity: number } {
  if (!isRecord(payload.appearance)) {
    return { windowOpacity: createDefaultSettingsSnapshot().appearance.windowOpacity };
  }
  return { windowOpacity: normalizeWindowOpacity(payload.appearance.windowOpacity) };
}

function extractLegacyHotkeys(payload: SettingsPayload): Partial<HotkeySettings> {
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

export function migrateLegacyStoragePayload(params: {
  legacyHotkeysPayload: unknown;
  legacyGeneralPayload: unknown;
}): PersistedSettingsSnapshot {
  const defaults = createDefaultSettingsSnapshot();
  const legacyHotkeys = isRecord(params.legacyHotkeysPayload)
    ? extractLegacyHotkeys(params.legacyHotkeysPayload)
    : {};
  const defaultTerminal = isRecord(params.legacyGeneralPayload)
    ? normalizeTerminalId(params.legacyGeneralPayload.defaultTerminal)
    : DEFAULT_TERMINAL;

  return normalizePersistedSettingsSnapshot({
    ...defaults,
    hotkeys: normalizeHotkeys(legacyHotkeys),
    general: {
      ...defaults.general,
      defaultTerminal
    }
  });
}

function createVersionedSnapshot(payload: SettingsPayload, mode: "v3" | "v2" | "v1"): PersistedSettingsSnapshot {
  return {
    version: SETTINGS_SCHEMA_VERSION,
    hotkeys: normalizeHotkeys(extractVersionedHotkeys(payload)),
    general: {
      defaultTerminal: extractVersionedDefaultTerminal(payload),
      language: mode === "v1" ? DEFAULT_LANGUAGE : extractVersionedLanguage(payload),
      autoCheckUpdate: mode === "v3" ? extractVersionedAutoCheckUpdate(payload) : DEFAULT_AUTO_CHECK_UPDATE,
      launchAtLogin: mode === "v3" ? extractVersionedLaunchAtLogin(payload) : DEFAULT_LAUNCH_AT_LOGIN
    },
    commands: {
      disabledCommandIds: extractVersionedDisabledCommandIds(payload),
      view: extractVersionedCommandViewState(payload)
    },
    appearance:
      mode === "v1"
        ? { windowOpacity: createDefaultSettingsSnapshot().appearance.windowOpacity }
        : extractVersionedAppearance(payload)
  };
}

export function migrateSettingsPayload(payload: unknown): PersistedSettingsSnapshot | null {
  if (!isRecord(payload)) {
    return null;
  }

  const version = payload.version;
  if (version === SETTINGS_SCHEMA_VERSION) {
    return createVersionedSnapshot(payload, "v3");
  }

  if (version === SETTINGS_SCHEMA_VERSION_V2) {
    return createVersionedSnapshot(payload, "v2");
  }

  if (version === LEGACY_SETTINGS_SCHEMA_VERSION) {
    return createVersionedSnapshot(payload, "v1");
  }

  if (version == null && (isRecord(payload.hotkeys) || isRecord(payload.general) || isRecord(payload.commands))) {
    return createVersionedSnapshot(payload, "v3");
  }

  return null;
}
