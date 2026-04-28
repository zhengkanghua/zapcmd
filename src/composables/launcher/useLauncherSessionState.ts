import { getCurrentScope, onScopeDispose, watch, type Ref } from "vue";
import {
  buildPersistedLauncherSessionCommandSnapshot,
  normalizePersistedLauncherSessionCommandSnapshot,
  restorePersistedLauncherSessionCommandSnapshot,
  type PersistedLauncherSessionCommand
} from "../../features/launcher/stagedCommands";
import type { StagedCommand } from "../../features/launcher/types";
import {
  resolveSafeStorage,
  readStorageItemSafely,
  safeRemoveStorageItem
} from "../../shared/storage";

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

function createPersistedCommandStructureSignature(stagedCommands: readonly StagedCommand[]): string {
  return stagedCommands
    .map((command) =>
      `${command.id}\u0001${command.sourceCommandId ?? ""}\u0001${command.title}\u0001${command.rawPreview}`
    )
    .join("\u0004");
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

  const rawResult = readStorageItemSafely(
    storage,
    LAUNCHER_SESSION_STORAGE_KEY,
    "launcher session snapshot read failed; skipping restore"
  );
  if (!rawResult.ok) {
    return null;
  }
  const raw = rawResult.value;
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizeSessionPayload(parsed);
    if (normalized) {
      return normalized;
    }
    safeRemoveStorageItem(
      storage,
      LAUNCHER_SESSION_STORAGE_KEY,
      "launcher session snapshot clear failed"
    );
    return null;
  } catch (error) {
    console.warn("launcher session snapshot invalid; clearing", error);
    safeRemoveStorageItem(
      storage,
      LAUNCHER_SESSION_STORAGE_KEY,
      "launcher session snapshot clear failed"
    );
    return null;
  }
}

function writeLauncherSession(
  storage: Pick<Storage, "setItem"> | null,
  serializedSnapshot: string
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(LAUNCHER_SESSION_STORAGE_KEY, serializedSnapshot);
  } catch (error) {
    console.warn("launcher session snapshot write failed", error);
  }
}

function createSerializedLauncherSessionSnapshot(
  stagedCommands: readonly PersistedLauncherSessionCommand[],
  stagingExpanded: boolean
): string {
  const snapshot: PersistedLauncherSessionV1 = {
    version: LAUNCHER_SESSION_SCHEMA_VERSION,
    stagingExpanded,
    stagedCommands: [...stagedCommands]
  };

  return JSON.stringify(snapshot);
}

function resolveStorage(
  storage: UseLauncherSessionStateOptions["storage"]
): UseLauncherSessionStateOptions["storage"] {
  if (storage !== undefined) {
    return storage;
  }
  if (typeof window !== "undefined") {
    return resolveSafeStorage(
      () => window.localStorage,
      "launcher session storage unavailable"
    );
  }
  return null;
}

function bindStructurePersistenceWatcher(params: {
  options: UseLauncherSessionStateOptions;
  restoring: () => boolean;
  restoreFromStorageIfNeeded: () => void;
  clearPendingPersist: () => void;
  scheduleStructuralPersist: (stagingExpanded: boolean) => void;
}) {
  watch(
    [
      () => createPersistedCommandStructureSignature(params.options.stagedCommands.value),
      params.options.stagingExpanded,
      params.options.enabled,
      () => params.options.suspendPersistence?.value ?? false
    ],
    (
      [_commandStructureSignature, stagingExpanded, enabled, suspendPersistence],
      [_previousCommandStructureSignature, _previousStagingExpanded, previousEnabled]
    ) => {
      if (enabled && !previousEnabled) {
        params.restoreFromStorageIfNeeded();
      }
      if (!enabled || params.restoring() || suspendPersistence) {
        params.clearPendingPersist();
        return;
      }

      params.scheduleStructuralPersist(stagingExpanded);
    }
  );
}

export function useLauncherSessionState(options: UseLauncherSessionStateOptions): void {
  const storage = resolveStorage(options.storage) ?? null;
  let restoring = false;
  let restoredFromStorage = false;
  let deferredWriteTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingSerializedSnapshot: string | null = null;
  let lastWrittenSerializedSnapshot: string | null = null;

  function clearDeferredWriteTimer(): void {
    if (!deferredWriteTimer) {
      return;
    }
    clearTimeout(deferredWriteTimer);
    deferredWriteTimer = null;
  }

  function clearPendingPersist(): void {
    pendingSerializedSnapshot = null;
    clearDeferredWriteTimer();
  }

  function flushPendingPersist(): void {
    if (!pendingSerializedSnapshot || pendingSerializedSnapshot === lastWrittenSerializedSnapshot) {
      pendingSerializedSnapshot = null;
      return;
    }
    writeLauncherSession(storage, pendingSerializedSnapshot);
    lastWrittenSerializedSnapshot = pendingSerializedSnapshot;
    pendingSerializedSnapshot = null;
  }

  function scheduleDeferredPersist(
    stagedCommands: readonly PersistedLauncherSessionCommand[],
    stagingExpanded: boolean,
    delayMs = LAUNCHER_SESSION_WRITE_DEBOUNCE_MS
  ): void {
    pendingSerializedSnapshot = createSerializedLauncherSessionSnapshot(stagedCommands, stagingExpanded);
    if (pendingSerializedSnapshot === lastWrittenSerializedSnapshot) {
      pendingSerializedSnapshot = null;
      clearDeferredWriteTimer();
      return;
    }
    clearDeferredWriteTimer();
    deferredWriteTimer = setTimeout(() => {
      deferredWriteTimer = null;
      flushPendingPersist();
    }, delayMs);
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      flushPendingPersist();
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
    lastWrittenSerializedSnapshot = readStorageItemSafely(
      storage,
      LAUNCHER_SESSION_STORAGE_KEY,
      "launcher session snapshot read failed; skipping restore"
    ).value;
  }

  restoreFromStorageIfNeeded();

  bindStructurePersistenceWatcher({
    options,
    restoring: () => restoring,
    restoreFromStorageIfNeeded,
    clearPendingPersist,
    scheduleStructuralPersist: (stagingExpanded) => {
      scheduleDeferredPersist(
        buildPersistedLauncherSessionCommands(options.stagedCommands.value),
        stagingExpanded,
        0
      );
    }
  });
}
