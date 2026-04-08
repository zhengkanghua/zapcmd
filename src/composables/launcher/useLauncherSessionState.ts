import { getCurrentScope, onScopeDispose, watch, type Ref } from "vue";
import type {
  CommandArg,
  CommandExecutionTemplate,
  ResolvedCommandExecution
} from "../../features/commands/types";
import {
  isSupportedPrerequisiteType,
  type CommandPrerequisite
} from "../../features/commands/prerequisiteTypes";
import type { StagedCommand, StagedCommandPreflightCache } from "../../features/launcher/types";

export const LAUNCHER_SESSION_STORAGE_KEY = "zapcmd.session.launcher";
const LAUNCHER_SESSION_SCHEMA_VERSION = 3;
const LAUNCHER_SESSION_WRITE_DEBOUNCE_MS = 180;

interface PersistedLauncherSessionV1 {
  version: number;
  stagingExpanded: boolean;
  stagedCommands: StagedCommand[];
}

interface UseLauncherSessionStateOptions {
  enabled: Readonly<Ref<boolean>>;
  stagedCommands: Ref<StagedCommand[]>;
  stagingExpanded: Readonly<Ref<boolean>>;
  suspendPersistence?: Readonly<Ref<boolean>>;
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

function sanitizeScriptRunner(value: unknown): "powershell" | "pwsh" | "cmd" | "bash" | "sh" | null {
  if (
    value === "powershell" ||
    value === "pwsh" ||
    value === "cmd" ||
    value === "bash" ||
    value === "sh"
  ) {
    return value;
  }
  return null;
}

function sanitizeExecutionTemplate(value: unknown): CommandExecutionTemplate | null {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return null;
  }

  if (value.kind === "exec") {
    const program = typeof value.program === "string" ? value.program.trim() : "";
    const args = Array.isArray(value.args)
      ? value.args.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0
        )
      : [];
    if (!program) {
      return null;
    }
    return {
      kind: "exec",
      program,
      args,
      stdinArgKey:
        typeof value.stdinArgKey === "string" && value.stdinArgKey.trim().length > 0
          ? value.stdinArgKey.trim()
          : undefined
    };
  }

  if (value.kind === "script") {
    const runner = sanitizeScriptRunner(value.runner);
    const command = typeof value.command === "string" ? value.command.trim() : "";
    if (!runner || !command) {
      return null;
    }
    return {
      kind: "script",
      runner,
      command
    };
  }

  return null;
}

function sanitizeResolvedExecution(value: unknown): ResolvedCommandExecution | null {
  const execution = sanitizeExecutionTemplate(value);
  if (!execution) {
    return null;
  }
  if (execution.kind === "exec") {
    return {
      ...execution,
      stdin:
        isRecord(value) && typeof value.stdin === "string" && value.stdin.trim().length > 0
          ? value.stdin
          : undefined
    };
  }
  return execution;
}

function sanitizePreflightCache(value: unknown): StagedCommandPreflightCache | null {
  if (!isRecord(value) || !Array.isArray(value.issues)) {
    return null;
  }

  const checkedAt = Number(value.checkedAt);
  const issueCount = Number(value.issueCount);
  if (
    !Number.isFinite(checkedAt) ||
    checkedAt < 0 ||
    !Number.isInteger(issueCount) ||
    issueCount < 0
  ) {
    return null;
  }

  if (value.source !== "issues" && value.source !== "system-failure") {
    return null;
  }

  return {
    checkedAt,
    issueCount,
    source: value.source,
    issues: value.issues.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
  };
}

function sanitizePrerequisite(value: unknown): CommandPrerequisite | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === "string" ? value.id.trim() : "";
  const check = typeof value.check === "string" ? value.check.trim() : "";
  const type = typeof value.type === "string" ? value.type.trim() : "";
  if (!id || !check || typeof value.required !== "boolean" || !isSupportedPrerequisiteType(type)) {
    return null;
  }

  const normalized: CommandPrerequisite = {
    id,
    type,
    required: value.required,
    check
  };

  if (typeof value.displayName === "string" && value.displayName.trim().length > 0) {
    normalized.displayName = value.displayName.trim();
  }
  if (typeof value.resolutionHint === "string" && value.resolutionHint.trim().length > 0) {
    normalized.resolutionHint = value.resolutionHint.trim();
  }
  if (typeof value.installHint === "string" && value.installHint.trim().length > 0) {
    normalized.installHint = value.installHint.trim();
  }
  if (typeof value.fallbackCommandId === "string" && value.fallbackCommandId.trim().length > 0) {
    normalized.fallbackCommandId = value.fallbackCommandId.trim();
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
  const renderedPreview = typeof value.renderedPreview === "string" ? value.renderedPreview : "";
  const executionTemplate = sanitizeExecutionTemplate(value.executionTemplate);
  const execution = sanitizeResolvedExecution(value.execution);
  if (!id || !title || !rawPreview || !renderedPreview || !executionTemplate || !execution) {
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
  const prerequisitesSource = Array.isArray(value.prerequisites) ? value.prerequisites : [];
  const prerequisites = prerequisitesSource
    .map((item) => sanitizePrerequisite(item))
    .filter((item): item is CommandPrerequisite => item !== null);
  const preflightCache = sanitizePreflightCache(value.preflightCache);

  const normalized: StagedCommand = {
    id,
    title,
    rawPreview,
    renderedPreview,
    executionTemplate,
    execution,
    args,
    argValues
  };
  if (prerequisites.length > 0) {
    normalized.prerequisites = prerequisites;
  }
  if (preflightCache) {
    normalized.preflightCache = preflightCache;
  }
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

  try {
    storage.setItem(LAUNCHER_SESSION_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn("launcher session snapshot write failed", error);
  }
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

function createCommandIdSignature(stagedCommands: readonly StagedCommand[]): string {
  return stagedCommands.map((command) => command.id).join("\u0001");
}

export function useLauncherSessionState(options: UseLauncherSessionStateOptions): void {
  const storage = resolveStorage(options.storage) ?? null;
  let restoring = true;
  let deferredWriteTimer: ReturnType<typeof setTimeout> | null = null;
  let skipNextDeferredWrite = false;

  function clearDeferredWriteTimer(): void {
    if (!deferredWriteTimer) {
      return;
    }
    clearTimeout(deferredWriteTimer);
    deferredWriteTimer = null;
  }

  function persistImmediately(
    stagedCommands: StagedCommand[] = options.stagedCommands.value,
    stagingExpanded: boolean = options.stagingExpanded.value
  ): void {
    clearDeferredWriteTimer();
    writeLauncherSession(storage, stagedCommands, stagingExpanded);
  }

  function scheduleDeferredPersist(
    stagedCommands: StagedCommand[],
    stagingExpanded: boolean
  ): void {
    clearDeferredWriteTimer();
    deferredWriteTimer = setTimeout(() => {
      deferredWriteTimer = null;
      writeLauncherSession(storage, stagedCommands, stagingExpanded);
    }, LAUNCHER_SESSION_WRITE_DEBOUNCE_MS);
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      clearDeferredWriteTimer();
    });
  }

  if (options.enabled.value) {
    const restored = readLauncherSession(storage);
    if (restored && restored.stagedCommands.length > 0) {
      options.stagedCommands.value = restored.stagedCommands;
    }
  }

  restoring = false;

  watch(
    [
      () => createCommandIdSignature(options.stagedCommands.value),
      options.stagingExpanded,
      options.enabled,
      () => options.suspendPersistence?.value ?? false
    ],
    (
      [commandIdSignature, stagingExpanded, enabled, suspendPersistence],
      [previousCommandIdSignature, _previousStagingExpanded, previousEnabled, previousSuspendPersistence]
    ) => {
      if (!enabled || restoring || suspendPersistence) {
        clearDeferredWriteTimer();
        return;
      }

      skipNextDeferredWrite =
        commandIdSignature !== previousCommandIdSignature ||
        enabled !== previousEnabled ||
        suspendPersistence !== previousSuspendPersistence;
      persistImmediately(options.stagedCommands.value, stagingExpanded);
    },
    { flush: "sync" }
  );

  watch(
    [
      options.stagedCommands,
      options.enabled,
      () => options.suspendPersistence?.value ?? false
    ],
    ([stagedCommands, enabled, suspendPersistence]) => {
      if (!enabled || restoring || suspendPersistence) {
        clearDeferredWriteTimer();
        skipNextDeferredWrite = false;
        return;
      }

      if (skipNextDeferredWrite) {
        skipNextDeferredWrite = false;
        return;
      }

      scheduleDeferredPersist(stagedCommands, options.stagingExpanded.value);
    },
    { deep: true }
  );
}
