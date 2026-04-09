import { getCurrentScope, onScopeDispose, watch, type Ref } from "vue";
import {
  buildPersistedLauncherSessionCommandSnapshot,
  normalizePersistedLauncherSessionCommandSnapshot,
  restorePersistedLauncherSessionCommandSnapshot,
  type PersistedLauncherSessionCommand
} from "../../features/launcher/stagedCommands";
import type { StagedCommand } from "../../features/launcher/types";

export const LAUNCHER_SESSION_STORAGE_KEY = "zapcmd.session.launcher";
const LAUNCHER_SESSION_SCHEMA_VERSION = 3;
const LAUNCHER_SESSION_WRITE_DEBOUNCE_MS = 180;

interface PersistedLauncherSessionV1 {
  version: number;
  stagingExpanded: boolean;
  stagedCommands: PersistedLauncherSessionCommand[];
}

interface UseLauncherSessionStateOptions {
  enabled: Readonly<Ref<boolean>>;
  stagedCommands: Ref<StagedCommand[]>;
  stagingExpanded: Readonly<Ref<boolean>>;
  suspendPersistence?: Readonly<Ref<boolean>>;
  restoreStagedCommands?: (commands: PersistedLauncherSessionCommand[]) => StagedCommand[];
  openStagingDrawer: () => void;
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function createPersistedCommandIdSignature(stagedCommands: readonly StagedCommand[]): string {
  return stagedCommands.map((command) => command.id).join("\u0001");
}

function buildPersistedLauncherSessionCommands(
  stagedCommands: readonly StagedCommand[]
): PersistedLauncherSessionCommand[] {
  return stagedCommands.map((command) => buildPersistedLauncherSessionCommandSnapshot(command));
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
    .map((item) => normalizePersistedLauncherSessionCommandSnapshot(item))
    .filter((item): item is PersistedLauncherSessionCommand => item !== null);

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
  stagedCommands: readonly PersistedLauncherSessionCommand[],
  stagingExpanded: boolean
): void {
  if (!storage) {
    return;
  }

  const snapshot: PersistedLauncherSessionV1 = {
    version: LAUNCHER_SESSION_SCHEMA_VERSION,
    stagingExpanded,
    stagedCommands: [...stagedCommands]
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

export function useLauncherSessionState(options: UseLauncherSessionStateOptions): void {
  const storage = resolveStorage(options.storage) ?? null;
  let restoring = false;
  let restoredFromStorage = false;
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
    stagedCommands: readonly StagedCommand[] = options.stagedCommands.value,
    stagingExpanded: boolean = options.stagingExpanded.value
  ): void {
    clearDeferredWriteTimer();
    writeLauncherSession(
      storage,
      buildPersistedLauncherSessionCommands(stagedCommands),
      stagingExpanded
    );
  }

  function scheduleDeferredPersist(
    stagedCommands: readonly PersistedLauncherSessionCommand[],
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

  function restoreFromStorageIfNeeded(): void {
    if (restoredFromStorage || !options.enabled.value) {
      return;
    }
    restoredFromStorage = true;

    const restored = readLauncherSession(storage);
    if (restored && restored.stagedCommands.length > 0) {
      restoring = true;
      try {
        // 持久化层只保留最小 DTO；真正的运行态恢复交给 catalog 侧重建。
        const nextCommands = options.restoreStagedCommands
          ? options.restoreStagedCommands(restored.stagedCommands)
          : restored.stagedCommands.map((command) =>
              restorePersistedLauncherSessionCommandSnapshot(command)
            );
        options.stagedCommands.value = nextCommands;
      } finally {
        restoring = false;
      }
    }
  }

  restoreFromStorageIfNeeded();

  watch(
    [
      () => createPersistedCommandIdSignature(options.stagedCommands.value),
      options.stagingExpanded,
      options.enabled,
      () => options.suspendPersistence?.value ?? false
    ],
    (
      [commandIdSignature, stagingExpanded, enabled, suspendPersistence],
      [previousCommandIdSignature, _previousStagingExpanded, previousEnabled, previousSuspendPersistence]
    ) => {
      if (enabled && !previousEnabled) {
        restoreFromStorageIfNeeded();
      }
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
      () => buildPersistedLauncherSessionCommands(options.stagedCommands.value),
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
