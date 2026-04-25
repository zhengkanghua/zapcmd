import {
  createReadFailedIssue,
  createScanFailedIssue
} from "../../../features/commands/runtimeLoader";
import type { RuntimePlatform } from "../../../features/commands/runtimeTypes";
import { applyMergedCommandCatalogState } from "./merge";
import {
  applyUserTemplatesFromPayload,
  loadBuiltinTemplatesAndSourceForState,
  resolveRuntimePlatformOnce
} from "./runtimePlatform";
import { createCommandCatalogState } from "./state";
import { createLatestRequestGuard } from "./requestGuard";
import {
  USER_COMMAND_SOURCE_ID,
  type UseCommandCatalogOptions
} from "./types";

type CommandCatalogState = ReturnType<typeof createCommandCatalogState>;

export function markCatalogReady(state: CommandCatalogState): void {
  state.catalogStatus.value = "ready";
  state.catalogReady.value = true;
}

export function markCatalogError(state: CommandCatalogState): void {
  state.catalogStatus.value = "error";
  state.catalogReady.value = false;
}

export function setMissingPortsIssue(state: CommandCatalogState): void {
  state.loadIssues.value = [
    createReadFailedIssue(
      USER_COMMAND_SOURCE_ID,
      "user command scan/read ports are not configured."
    )
  ];
}

function applyCachedUserTemplates(params: {
  state: CommandCatalogState;
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
  state: CommandCatalogState;
  runtimePlatform: RuntimePlatform | null;
  scanned: Awaited<ReturnType<NonNullable<CommandCatalogState["userCommandSourceCache"]>["refreshFromScan"]>>;
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

export function createCommandCatalogRuntimeController(
  options: UseCommandCatalogOptions,
  state: CommandCatalogState
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
