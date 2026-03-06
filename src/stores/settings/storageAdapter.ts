import {
  LEGACY_GENERAL_SETTINGS_STORAGE_KEY,
  LEGACY_HOTKEY_SETTINGS_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  createDefaultSettingsSnapshot,
  type PersistedSettingsSnapshot
} from "./defaults";
import { migrateLegacyStoragePayload, migrateSettingsPayload } from "./migration";
import { isRecord, normalizePersistedSettingsSnapshot } from "./normalization";

export interface SettingsStorageAdapter {
  readSettings: () => PersistedSettingsSnapshot;
  writeSettings: (snapshot: PersistedSettingsSnapshot) => void;
}

interface CreateSettingsStorageAdapterOptions {
  storage?: Storage | null;
}

function resolveStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage ?? null;
}

function resolveConfiguredStorage(options: CreateSettingsStorageAdapterOptions): Storage | null {
  if (Object.prototype.hasOwnProperty.call(options, "storage")) {
    return options.storage ?? null;
  }
  return resolveStorage();
}

function parseJsonRecord(
  raw: string | null,
  state: { hasWarnedSettingsPayloadParseFailure: boolean }
): Record<string, unknown> | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch (error) {
    if (!state.hasWarnedSettingsPayloadParseFailure) {
      state.hasWarnedSettingsPayloadParseFailure = true;
      console.warn("settings payload json parse failed", error);
    }
    return null;
  }
}

export function createSettingsStorageAdapter(
  options: CreateSettingsStorageAdapterOptions = {}
): SettingsStorageAdapter {
  const storage = resolveConfiguredStorage(options);
  const parseState = { hasWarnedSettingsPayloadParseFailure: false };

  return {
    readSettings: (): PersistedSettingsSnapshot => {
      if (!storage) {
        return createDefaultSettingsSnapshot();
      }

      const currentPayload = parseJsonRecord(storage.getItem(SETTINGS_STORAGE_KEY), parseState);
      const migratedCurrent = migrateSettingsPayload(currentPayload);
      if (migratedCurrent) {
        return migratedCurrent;
      }

      const legacyHotkeysPayload = parseJsonRecord(storage.getItem(LEGACY_HOTKEY_SETTINGS_STORAGE_KEY), parseState);
      const legacyGeneralPayload = parseJsonRecord(storage.getItem(LEGACY_GENERAL_SETTINGS_STORAGE_KEY), parseState);
      return migrateLegacyStoragePayload({ legacyHotkeysPayload, legacyGeneralPayload });
    },
    writeSettings: (snapshot: PersistedSettingsSnapshot): void => {
      if (!storage) {
        return;
      }

      const normalizedSnapshot = normalizePersistedSettingsSnapshot(snapshot);
      storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalizedSnapshot));
      storage.removeItem(LEGACY_HOTKEY_SETTINGS_STORAGE_KEY);
      storage.removeItem(LEGACY_GENERAL_SETTINGS_STORAGE_KEY);
    }
  };
}

export function readSettingsFromStorage(storage: Storage | null = resolveStorage()): PersistedSettingsSnapshot {
  return createSettingsStorageAdapter({ storage }).readSettings();
}

export function writeSettingsToStorage(
  snapshot: PersistedSettingsSnapshot,
  storage: Storage | null = resolveStorage()
): void {
  createSettingsStorageAdapter({ storage }).writeSettings(snapshot);
}
