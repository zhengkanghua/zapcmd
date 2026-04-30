import {
  createReadFailedIssue,
  createScanFailedIssue
} from "../../../features/commands/runtimeLoader";
import type { RuntimePlatform } from "../../../features/commands/runtimeTypes";
import {
  applyUserTemplatesFromPayload
} from "./runtimePlatform";
import { createCommandCatalogState } from "./state";
import {
  BUILTIN_COMMAND_SOURCE_ID,
  USER_COMMAND_SOURCE_ID
} from "./types";
import {
  markCatalogError,
  markCatalogReady
} from "./status";

type CommandCatalogState = ReturnType<typeof createCommandCatalogState>;
type UserCommandSourceCache = NonNullable<CommandCatalogState["userCommandSourceCache"]>;
type UserCommandSourceCacheSnapshot = Awaited<
  ReturnType<UserCommandSourceCache["refreshFromScan"]>
>;

export function applyCachedUserTemplates(params: {
  state: CommandCatalogState;
  runtimePlatform: RuntimePlatform | null;
  applyMergedTemplates: () => void;
}): void {
  const cached = params.state.userCommandSourceCache?.remapFromCache();
  if (!cached) {
    return;
  }
  applyUserTemplatesFromPayload({
    payloadEntries: cached.payloadEntries,
    sourceIssues: cached.issues,
    runtimePlatform: params.runtimePlatform,
    userTemplates: params.state.userTemplates,
    userCommandSourceById: params.state.userCommandSourceById,
    loadIssues: params.state.loadIssues,
    applyMergedTemplates: params.applyMergedTemplates
  });
}

export function applyScannedUserTemplates(params: {
  state: CommandCatalogState;
  runtimePlatform: RuntimePlatform | null;
  scanned: UserCommandSourceCacheSnapshot;
  applyMergedTemplates: () => void;
}): void {
  applyUserTemplatesFromPayload({
    payloadEntries: params.scanned.payloadEntries,
    sourceIssues: params.scanned.issues,
    runtimePlatform: params.runtimePlatform,
    userTemplates: params.state.userTemplates,
    userCommandSourceById: params.state.userCommandSourceById,
    loadIssues: params.state.loadIssues,
    applyMergedTemplates: params.applyMergedTemplates
  });
}

export function applyRefreshFailure(params: {
  state: CommandCatalogState;
  error: unknown;
  builtinLoaded: boolean;
  runtimePlatform: RuntimePlatform | null;
  applyMergedTemplates: () => void;
}): void {
  console.warn("[commands] failed to refresh command catalog", params.error);
  if (
    params.builtinLoaded &&
    params.state.userCommandSourceCache?.hasPrimedScan()
  ) {
    const cached = params.state.userCommandSourceCache.remapFromCache();
    applyUserTemplatesFromPayload({
      payloadEntries: cached.payloadEntries,
      sourceIssues: [
        ...cached.issues,
        createScanFailedIssue(USER_COMMAND_SOURCE_ID, params.error)
      ],
      runtimePlatform: params.runtimePlatform,
      userTemplates: params.state.userTemplates,
      userCommandSourceById: params.state.userCommandSourceById,
      loadIssues: params.state.loadIssues,
      applyMergedTemplates: params.applyMergedTemplates
    });
    markCatalogReady(params.state);
    return;
  }
  params.state.userCommandSourceCache?.clear();
  params.state.loadIssues.value = [
    params.builtinLoaded
      ? params.state.userCommandSourceCache
        ? createScanFailedIssue(USER_COMMAND_SOURCE_ID, params.error)
        : createReadFailedIssue(USER_COMMAND_SOURCE_ID, params.error)
      : createScanFailedIssue(BUILTIN_COMMAND_SOURCE_ID, params.error)
  ];
  params.applyMergedTemplates();
  if (params.builtinLoaded) {
    markCatalogReady(params.state);
    return;
  }
  markCatalogError(params.state);
}
