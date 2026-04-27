import {
  createReadFailedIssue,
  createScanFailedIssue,
  type CommandLoadIssue,
  type RuntimePayloadEntry
} from "./runtimeLoader";
import type {
  UserCommandFileScanEntry,
  UserCommandFileScanResult,
  UserCommandJsonFile
} from "./userCommandSourceTypes";

interface UserCommandSourceCacheOptions {
  scanUserCommandFiles: () => Promise<UserCommandFileScanResult>;
  readUserCommandFile: (path: string) => Promise<UserCommandJsonFile>;
}

interface RefreshFromScanOptions {
  shouldContinue?: () => boolean;
}

interface CachedEntry {
  path: string;
  modifiedMs: number;
  size: number;
  parsedPayload?: unknown;
  issues: CommandLoadIssue[];
}

interface UserCommandSourceCacheState {
  cacheByPath: Map<string, CachedEntry>;
  scannedPaths: string[];
  lastScanIssues: CommandLoadIssue[];
  primedScan: boolean;
}

export interface UserCommandSourceCacheSnapshot {
  payloadEntries: RuntimePayloadEntry[];
  issues: CommandLoadIssue[];
}

const USER_COMMAND_SOURCE_READ_CONCURRENCY = 4;

function extractIssueReason(error: unknown): string {
  if (error instanceof Error && typeof error.message === "string" && error.message.trim().length > 0) {
    return error.message.trim();
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error.trim();
  }
  return "JSON parse failed.";
}

function sortScanEntries(files: UserCommandFileScanEntry[]): UserCommandFileScanEntry[] {
  return [...files].sort((left, right) => left.path.localeCompare(right.path));
}

async function runWithConcurrencyLimit(
  tasks: Array<() => Promise<void>>,
  maxConcurrent: number,
  shouldContinue: () => boolean
): Promise<void> {
  const running = new Set<Promise<void>>();

  for (const task of tasks) {
    if (!shouldContinue()) {
      break;
    }
    const promise = task().finally(() => {
      running.delete(promise);
    });
    running.add(promise);
    if (running.size < maxConcurrent) {
      continue;
    }
    await Promise.race(running);
  }

  await Promise.all(running);
}

function createEmptyState(): UserCommandSourceCacheState {
  return {
    cacheByPath: new Map<string, CachedEntry>(),
    scannedPaths: [],
    lastScanIssues: [],
    primedScan: false
  };
}

function buildSnapshotFromPaths(
  cacheByPath: ReadonlyMap<string, CachedEntry>,
  paths: string[],
  scanIssues: CommandLoadIssue[]
): UserCommandSourceCacheSnapshot {
  const payloadEntries: RuntimePayloadEntry[] = [];
  const issues: CommandLoadIssue[] = [...scanIssues];

  for (const path of paths) {
    const cached = cacheByPath.get(path);
    if (!cached) {
      continue;
    }
    if (cached.parsedPayload !== undefined) {
      payloadEntries.push({
        sourceId: cached.path,
        payload: cached.parsedPayload
      });
    }
    issues.push(...cached.issues);
  }

  return { payloadEntries, issues };
}

function syncRemovedCacheEntries(
  cacheByPath: Map<string, CachedEntry>,
  nextPathSet: Set<string>
): void {
  for (const path of cacheByPath.keys()) {
    if (!nextPathSet.has(path)) {
      cacheByPath.delete(path);
    }
  }
}

async function readUserCommandFileIntoCache(params: {
  file: UserCommandFileScanEntry;
  cacheByPath: Map<string, CachedEntry>;
  readUserCommandFile: (path: string) => Promise<UserCommandJsonFile>;
  shouldContinue: () => boolean;
}): Promise<void> {
  const existing = params.cacheByPath.get(params.file.path);
  if (
    existing &&
    existing.modifiedMs === params.file.modifiedMs &&
    existing.size === params.file.size
  ) {
    return;
  }
  if (!params.shouldContinue()) {
    return;
  }

  await params.readUserCommandFile(params.file.path).then(
    (readResult) => {
      if (!params.shouldContinue()) {
        return;
      }
      try {
        const parsedPayload = JSON.parse(readResult.content) as unknown;
        params.cacheByPath.set(params.file.path, {
          path: params.file.path,
          modifiedMs: params.file.modifiedMs,
          size: params.file.size,
          parsedPayload,
          issues: []
        });
      } catch (error) {
        params.cacheByPath.set(params.file.path, {
          path: params.file.path,
          modifiedMs: params.file.modifiedMs,
          size: params.file.size,
          issues: [
            {
              code: "invalid-json",
              stage: "parse",
              sourceId: params.file.path,
              reason: extractIssueReason(error)
            }
          ]
        });
      }
    },
    (error) => {
      if (!params.shouldContinue()) {
        return;
      }
      params.cacheByPath.set(params.file.path, {
        path: params.file.path,
        modifiedMs: params.file.modifiedMs,
        size: params.file.size,
        issues: [createReadFailedIssue(params.file.path, error)]
      });
    }
  );
}

function createReadTasks(params: {
  files: UserCommandFileScanEntry[];
  cacheByPath: Map<string, CachedEntry>;
  readUserCommandFile: (path: string) => Promise<UserCommandJsonFile>;
  shouldContinue: () => boolean;
}): Array<() => Promise<void>> {
  return params.files.map((file) => {
    return async () =>
      readUserCommandFileIntoCache({
        file,
        cacheByPath: params.cacheByPath,
        readUserCommandFile: params.readUserCommandFile,
        shouldContinue: params.shouldContinue
      });
  });
}

function applyCompletedScan(
  state: UserCommandSourceCacheState,
  files: UserCommandFileScanEntry[],
  scanIssues: CommandLoadIssue[]
): UserCommandSourceCacheSnapshot {
  state.scannedPaths = files.map((file) => file.path);
  state.lastScanIssues = scanIssues;
  state.primedScan = true;
  return buildSnapshotFromPaths(
    state.cacheByPath,
    state.scannedPaths,
    scanIssues
  );
}

async function refreshCacheFromScan(params: {
  options: UserCommandSourceCacheOptions;
  state: UserCommandSourceCacheState;
  refreshOptions?: RefreshFromScanOptions;
}): Promise<UserCommandSourceCacheSnapshot> {
  const shouldContinue = params.refreshOptions?.shouldContinue ?? (() => true);
  const scanned = await params.options.scanUserCommandFiles();
  if (!shouldContinue()) {
    return buildSnapshotFromPaths(
      params.state.cacheByPath,
      params.state.scannedPaths,
      params.state.lastScanIssues
    );
  }

  const sortedFiles = sortScanEntries(scanned.files);
  const nextPathSet = new Set(sortedFiles.map((file) => file.path));
  const scanIssues = scanned.issues.map((issue) =>
    createScanFailedIssue(issue.path, issue.reason)
  );

  const nextCacheByPath = new Map(params.state.cacheByPath);
  syncRemovedCacheEntries(nextCacheByPath, nextPathSet);
  const readTasks = createReadTasks({
    files: sortedFiles,
    cacheByPath: nextCacheByPath,
    readUserCommandFile: params.options.readUserCommandFile,
    shouldContinue
  });

  await runWithConcurrencyLimit(
    readTasks,
    USER_COMMAND_SOURCE_READ_CONCURRENCY,
    shouldContinue
  );
  if (!shouldContinue()) {
    return buildSnapshotFromPaths(
      params.state.cacheByPath,
      params.state.scannedPaths,
      params.state.lastScanIssues
    );
  }

  params.state.cacheByPath = nextCacheByPath;
  return applyCompletedScan(params.state, sortedFiles, scanIssues);
}

export function createUserCommandSourceCache(
  options: UserCommandSourceCacheOptions
): {
  refreshFromScan: (refreshOptions?: RefreshFromScanOptions) => Promise<UserCommandSourceCacheSnapshot>;
  remapFromCache: () => UserCommandSourceCacheSnapshot;
  clear: () => void;
  hasPrimedScan: () => boolean;
} {
  const state = createEmptyState();

  async function refreshFromScan(
    refreshOptions: RefreshFromScanOptions = {}
  ): Promise<UserCommandSourceCacheSnapshot> {
    return refreshCacheFromScan({
      options,
      state,
      refreshOptions
    });
  }

  function remapFromCache(): UserCommandSourceCacheSnapshot {
    return buildSnapshotFromPaths(
      state.cacheByPath,
      state.scannedPaths,
      state.lastScanIssues
    );
  }

  function clear(): void {
    state.cacheByPath.clear();
    state.scannedPaths = [];
    state.lastScanIssues = [];
    state.primedScan = false;
  }

  function hasPrimedScan(): boolean {
    return state.primedScan;
  }

  return {
    refreshFromScan,
    remapFromCache,
    clear,
    hasPrimedScan
  };
}
