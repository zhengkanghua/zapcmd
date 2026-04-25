import {
  createReadFailedIssue,
  createScanFailedIssue
} from "../../features/commands/runtimeLoader";
import type { RuntimePlatform } from "../../features/commands/runtimeTypes";
import { applyMergedCommandCatalogState } from "./useCommandCatalog/merge";
import { bindCommandCatalogLifecycle } from "./useCommandCatalog/lifecycle";
import {
  applyUserTemplatesFromPayload,
  loadBuiltinTemplatesAndSourceForState,
  resolveRuntimePlatformOnce
} from "./useCommandCatalog/runtimePlatform";
import {
  buildCommandCatalogReturn,
  createCommandCatalogState
} from "./useCommandCatalog/state";
import {
  USER_COMMAND_SOURCE_ID,
  type UseCommandCatalogOptions,
  type UseCommandCatalogReturn
} from "./useCommandCatalog/types";

export type { UseCommandCatalogOptions, UseCommandCatalogReturn } from "./useCommandCatalog/types";

function createLatestRequestGuard() {
  let requestVersion = 0;

  return {
    start(): number {
      requestVersion += 1;
      return requestVersion;
    },
    isLatest(version: number): boolean {
      return requestVersion === version;
    }
  };
}

function markCatalogReady(state: ReturnType<typeof createCommandCatalogState>): void {
  state.catalogStatus.value = "ready";
  state.catalogReady.value = true;
}

function markCatalogError(state: ReturnType<typeof createCommandCatalogState>): void {
  state.catalogStatus.value = "error";
  state.catalogReady.value = false;
}

function setMissingPortsIssue(state: ReturnType<typeof createCommandCatalogState>): void {
  state.loadIssues.value = [
    createReadFailedIssue(
      USER_COMMAND_SOURCE_ID,
      "user command scan/read ports are not configured."
    )
  ];
}

function applyCachedUserTemplates(params: {
  state: ReturnType<typeof createCommandCatalogState>;
  runtimePlatform: RuntimePlatform | null;
  applyMergedTemplates: () => void;
}) {
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

function applyScannedUserTemplates(params: {
  state: ReturnType<typeof createCommandCatalogState>;
  runtimePlatform: RuntimePlatform | null;
  scanned: Awaited<ReturnType<NonNullable<ReturnType<typeof createCommandCatalogState>["userCommandSourceCache"]>["refreshFromScan"]>>;
  applyMergedTemplates: () => void;
}) {
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

function createCommandCatalogRuntimeController(
  options: UseCommandCatalogOptions,
  state: ReturnType<typeof createCommandCatalogState>
) {
  let runtimePlatform: RuntimePlatform | null = null;
  const requestGuard = createLatestRequestGuard();

  const resolveRuntimePlatform = () =>
    resolveRuntimePlatformOnce({
      options,
      getRuntimePlatform: () => runtimePlatform,
      setRuntimePlatform: (value) => {
        runtimePlatform = value;
      }
    });

  const loadBuiltinTemplatesAndSource = () =>
    loadBuiltinTemplatesAndSourceForState({
      builtinTemplates: state.builtinTemplates,
      builtinCommandSourceById: state.builtinCommandSourceById,
      runtimePlatform
    });

  const applyMergedTemplates = () =>
    applyMergedCommandCatalogState({
      builtinTemplates: state.builtinTemplates,
      userTemplates: state.userTemplates,
      allCommandTemplates: state.allCommandTemplates,
      commandTemplates: state.commandTemplates,
      builtinCommandSourceById: state.builtinCommandSourceById,
      commandSourceById: state.commandSourceById,
      userCommandSourceById: state.userCommandSourceById,
      overriddenCommandIds: state.overriddenCommandIds,
      disabledCommandIds: options.disabledCommandIds
    });

  async function remapFromCacheIfPrimed(): Promise<boolean> {
    if (!state.userCommandSourceCache || !state.userCommandSourceCache.hasPrimedScan()) {
      return false;
    }
    const currentRequest = requestGuard.start();
    await resolveRuntimePlatform();
    if (!requestGuard.isLatest(currentRequest)) {
      return true;
    }
    await loadBuiltinTemplatesAndSource();
    if (!requestGuard.isLatest(currentRequest)) {
      return true;
    }
    applyCachedUserTemplates({ state, runtimePlatform, applyMergedTemplates });
    if (!requestGuard.isLatest(currentRequest)) {
      return true;
    }
    markCatalogReady(state);
    return true;
  }

  async function refreshUserCommands(): Promise<void> {
    const currentRequest = requestGuard.start();
    state.catalogStatus.value = "loading";
    state.catalogReady.value = false;
    let builtinLoaded = false;

    try {
      await resolveRuntimePlatform();
      if (!requestGuard.isLatest(currentRequest)) {
        return;
      }
      await loadBuiltinTemplatesAndSource();
      if (!requestGuard.isLatest(currentRequest)) {
        return;
      }
      builtinLoaded = true;

      if (!options.isTauriRuntime()) {
        applyMergedTemplates();
        if (!requestGuard.isLatest(currentRequest)) {
          return;
        }
        markCatalogReady(state);
        return;
      }

      if (!state.userCommandSourceCache) {
        setMissingPortsIssue(state);
        applyMergedTemplates();
        if (!requestGuard.isLatest(currentRequest)) {
          return;
        }
        markCatalogReady(state);
        return;
      }
      const scanned = await state.userCommandSourceCache.refreshFromScan();
      if (!requestGuard.isLatest(currentRequest)) {
        return;
      }
      applyScannedUserTemplates({ state, runtimePlatform, scanned, applyMergedTemplates });
      if (!requestGuard.isLatest(currentRequest)) {
        return;
      }
      markCatalogReady(state);
    } catch (error) {
      if (!requestGuard.isLatest(currentRequest)) {
        return;
      }
      console.warn("[commands] failed to refresh user command files", error);
      state.userCommandSourceCache?.clear();
      state.loadIssues.value = [
        state.userCommandSourceCache
          ? createScanFailedIssue(USER_COMMAND_SOURCE_ID, error)
          : createReadFailedIssue(USER_COMMAND_SOURCE_ID, error)
      ];
      applyMergedTemplates();
      if (builtinLoaded) {
        markCatalogReady(state);
      } else {
        markCatalogError(state);
      }
    }
  }

  return {
    loadBuiltinTemplatesAndSource,
    applyMergedTemplates,
    remapFromCacheIfPrimed,
    refreshUserCommands
  };
}

export function useCommandCatalog(
  options: UseCommandCatalogOptions
): UseCommandCatalogReturn {
  const state = createCommandCatalogState(options);
  const {
    loadBuiltinTemplatesAndSource,
    applyMergedTemplates,
    remapFromCacheIfPrimed,
    refreshUserCommands
  } = createCommandCatalogRuntimeController(options, state);

  bindCommandCatalogLifecycle({
    options,
    loadBuiltinTemplatesAndSource,
    applyMergedTemplates,
    refreshUserCommands,
    remapFromCacheIfPrimed
  });

  return buildCommandCatalogReturn({
    commandTemplates: state.commandTemplates,
    allCommandTemplates: state.allCommandTemplates,
    commandSourceById: state.commandSourceById,
    userCommandSourceById: state.userCommandSourceById,
    overriddenCommandIds: state.overriddenCommandIds,
    loadIssues: state.loadIssues,
    catalogReady: state.catalogReady,
    catalogStatus: state.catalogStatus,
    refreshUserCommands
  });
}
