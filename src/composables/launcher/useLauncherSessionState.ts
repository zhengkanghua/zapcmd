import { watch, type Ref } from "vue";
import type { CommandArg } from "../../features/commands/types";
import type { StagedCommand } from "../../features/launcher/types";

export const LAUNCHER_SESSION_STORAGE_KEY = "zapcmd.session.launcher";
const LAUNCHER_SESSION_SCHEMA_VERSION = 1;

interface PersistedLauncherSessionV1 {
  version: number;
  stagingExpanded: boolean;
  stagedCommands: StagedCommand[];
}

interface UseLauncherSessionStateOptions {
  enabled: Readonly<Ref<boolean>>;
  stagedCommands: Ref<StagedCommand[]>;
  stagingExpanded: Readonly<Ref<boolean>>;
  openStagingDrawer: () => void;
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeArg(arg: unknown): CommandArg | null {
  if (!isRecord(arg)) {
    return null;
  }
  const key = typeof arg.key === "string" ? arg.key.trim() : "";
  const label = typeof arg.label === "string" ? arg.label.trim() : "";
  const token = typeof arg.token === "string" ? arg.token.trim() : "";
  if (!key || !label || !token) {
    return null;
  }

  const normalized: CommandArg = {
    key,
    label,
    token
  };

  if (typeof arg.placeholder === "string") {
    normalized.placeholder = arg.placeholder;
  }
  if (typeof arg.required === "boolean") {
    normalized.required = arg.required;
  }
  if (typeof arg.defaultValue === "string") {
    normalized.defaultValue = arg.defaultValue;
  }
  if (typeof arg.argType === "string") {
    normalized.argType = arg.argType as CommandArg["argType"];
  }
  if (typeof arg.validationPattern === "string") {
    normalized.validationPattern = arg.validationPattern;
  }
  if (typeof arg.validationError === "string") {
    normalized.validationError = arg.validationError;
  }
  if (Array.isArray(arg.options)) {
    normalized.options = arg.options.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0
    );
  }

  return normalized;
}

function sanitizeStagedCommand(value: unknown): StagedCommand | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === "string" ? value.id.trim() : "";
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const rawPreview = typeof value.rawPreview === "string" ? value.rawPreview : "";
  const renderedCommand = typeof value.renderedCommand === "string" ? value.renderedCommand : "";
  if (!id || !title || !rawPreview || !renderedCommand) {
    return null;
  }

  if (!isRecord(value.argValues)) {
    return null;
  }
  const argValues = Object.entries(value.argValues).reduce<Record<string, string>>((acc, [key, item]) => {
    if (typeof item === "string") {
      acc[key] = item;
    }
    return acc;
  }, {});

  const argsSource = Array.isArray(value.args) ? value.args : [];
  const args = argsSource
    .map((item) => sanitizeArg(item))
    .filter((item): item is CommandArg => item !== null);

  const normalized: StagedCommand = {
    id,
    title,
    rawPreview,
    renderedCommand,
    args,
    argValues
  };
  if (typeof value.adminRequired === "boolean") {
    normalized.adminRequired = value.adminRequired;
  }
  if (typeof value.dangerous === "boolean") {
    normalized.dangerous = value.dangerous;
  }

  return normalized;
}

function normalizeSessionPayload(payload: unknown): PersistedLauncherSessionV1 | null {
  if (!isRecord(payload)) {
    return null;
  }

  const version = Number(payload.version);
  if (!Number.isFinite(version) || version !== LAUNCHER_SESSION_SCHEMA_VERSION) {
    return null;
  }

  const stagedCommandsSource = Array.isArray(payload.stagedCommands) ? payload.stagedCommands : [];
  const stagedCommands = stagedCommandsSource
    .map((item) => sanitizeStagedCommand(item))
    .filter((item): item is StagedCommand => item !== null);

  return {
    version,
    stagingExpanded: Boolean(payload.stagingExpanded),
    stagedCommands
  };
}

function readLauncherSession(
  storage: Pick<Storage, "getItem" | "removeItem"> | null
): PersistedLauncherSessionV1 | null {
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(LAUNCHER_SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizeSessionPayload(parsed);
    if (normalized) {
      return normalized;
    }
    storage.removeItem(LAUNCHER_SESSION_STORAGE_KEY);
    return null;
  } catch (error) {
    console.warn("launcher session snapshot invalid; clearing", error);
    storage.removeItem(LAUNCHER_SESSION_STORAGE_KEY);
    return null;
  }
}

function writeLauncherSession(
  storage: Pick<Storage, "setItem"> | null,
  stagedCommands: StagedCommand[],
  stagingExpanded: boolean
): void {
  if (!storage) {
    return;
  }

  const snapshot: PersistedLauncherSessionV1 = {
    version: LAUNCHER_SESSION_SCHEMA_VERSION,
    stagingExpanded,
    stagedCommands
  };
  storage.setItem(LAUNCHER_SESSION_STORAGE_KEY, JSON.stringify(snapshot));
}

function resolveStorage(
  storage: UseLauncherSessionStateOptions["storage"]
): UseLauncherSessionStateOptions["storage"] {
  if (storage !== undefined) {
    return storage;
  }
  if (typeof window !== "undefined") {
    return window.localStorage;
  }
  return null;
}

export function useLauncherSessionState(options: UseLauncherSessionStateOptions): void {
  const storage = resolveStorage(options.storage) ?? null;
  let restoring = true;

  if (options.enabled.value) {
    const restored = readLauncherSession(storage);
    if (restored && restored.stagedCommands.length > 0) {
      options.stagedCommands.value = restored.stagedCommands;
      if (restored.stagingExpanded) {
        options.openStagingDrawer();
      }
    }
  }

  restoring = false;

  watch(
    [options.stagedCommands, options.stagingExpanded, options.enabled],
    ([stagedCommands, stagingExpanded, enabled]) => {
      if (!enabled || restoring) {
        return;
      }
      writeLauncherSession(storage, stagedCommands, stagingExpanded);
    },
    { deep: true }
  );
}
