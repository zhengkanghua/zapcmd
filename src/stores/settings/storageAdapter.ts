import {
  SETTINGS_STORAGE_KEY,
  createDefaultSettingsSnapshot,
  type PersistedSettingsSnapshot
} from "./defaults";
import { migrateSettingsPayload } from "./migration";
import { isRecord, normalizePersistedSettingsSnapshot } from "./normalization";
import { resolveSafeStorage, safeGetStorageItem, setStorageItem } from "../../shared/storage";

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
  return resolveSafeStorage(
    () => window.localStorage ?? null,
    "settings storage unavailable"
  );
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

      const currentPayload = parseJsonRecord(
        safeGetStorageItem(storage, SETTINGS_STORAGE_KEY, "settings storage read failed"),
        parseState
      );
      return migrateSettingsPayload(currentPayload) ?? createDefaultSettingsSnapshot();
    },
    writeSettings: (snapshot: PersistedSettingsSnapshot): void => {
      if (!storage) {
        return;
      }

      const normalizedSnapshot = normalizePersistedSettingsSnapshot(snapshot);
      setStorageItem(storage, SETTINGS_STORAGE_KEY, JSON.stringify(normalizedSnapshot));
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
