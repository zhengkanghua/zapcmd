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

interface CachedEntry {
  path: string;
  modifiedMs: number;
  size: number;
  parsedPayload?: unknown;
  issues: CommandLoadIssue[];
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
  maxConcurrent: number
): Promise<void> {
  const running = new Set<Promise<void>>();

  for (const task of tasks) {
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

export function createUserCommandSourceCache(
  options: UserCommandSourceCacheOptions
): {
  refreshFromScan: () => Promise<UserCommandSourceCacheSnapshot>;
  remapFromCache: () => UserCommandSourceCacheSnapshot;
  clear: () => void;
  hasPrimedScan: () => boolean;
} {
  const cacheByPath = new Map<string, CachedEntry>();
  let scannedPaths: string[] = [];
  let lastScanIssues: CommandLoadIssue[] = [];
  let primedScan = false;

  function buildSnapshotFromPaths(paths: string[], scanIssues: CommandLoadIssue[]): UserCommandSourceCacheSnapshot {
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

  async function refreshFromScan(): Promise<UserCommandSourceCacheSnapshot> {
    const scanned = await options.scanUserCommandFiles();
    const sortedFiles = sortScanEntries(scanned.files);
    const nextPathSet = new Set(sortedFiles.map((file) => file.path));
    const scanIssues = scanned.issues.map((issue) => createScanFailedIssue(issue.path, issue.reason));

    for (const path of cacheByPath.keys()) {
      if (!nextPathSet.has(path)) {
        cacheByPath.delete(path);
      }
    }

    const readTasks = sortedFiles.map((file) => {
      return async () => {
        const existing = cacheByPath.get(file.path);
        if (existing && existing.modifiedMs === file.modifiedMs && existing.size === file.size) {
          return;
        }

        await options.readUserCommandFile(file.path).then(
          (readResult) => {
            try {
              const parsedPayload = JSON.parse(readResult.content) as unknown;
              cacheByPath.set(file.path, {
                path: file.path,
                modifiedMs: file.modifiedMs,
                size: file.size,
                parsedPayload,
                issues: []
              });
            } catch (error) {
              cacheByPath.set(file.path, {
                path: file.path,
                modifiedMs: file.modifiedMs,
                size: file.size,
                issues: [
                  {
                    code: "invalid-json",
                    stage: "parse",
                    sourceId: file.path,
                    reason: extractIssueReason(error)
                  }
                ]
              });
            }
          },
          (error) => {
            cacheByPath.set(file.path, {
              path: file.path,
              modifiedMs: file.modifiedMs,
              size: file.size,
              issues: [createReadFailedIssue(file.path, error)]
            });
          }
        );
      };
    });

    await runWithConcurrencyLimit(readTasks, USER_COMMAND_SOURCE_READ_CONCURRENCY);

    scannedPaths = sortedFiles.map((file) => file.path);
    lastScanIssues = scanIssues;
    primedScan = true;
    return buildSnapshotFromPaths(scannedPaths, scanIssues);
  }

  function remapFromCache(): UserCommandSourceCacheSnapshot {
    return buildSnapshotFromPaths(scannedPaths, lastScanIssues);
  }

  function clear(): void {
    cacheByPath.clear();
    scannedPaths = [];
    lastScanIssues = [];
    primedScan = false;
  }

  function hasPrimedScan(): boolean {
    return primedScan;
  }

  return {
    refreshFromScan,
    remapFromCache,
    clear,
    hasPrimedScan
  };
}
