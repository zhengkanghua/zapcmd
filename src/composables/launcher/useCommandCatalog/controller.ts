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
  BUILTIN_COMMAND_SOURCE_ID,
  USER_COMMAND_SOURCE_ID,
  type UseCommandCatalogOptions
} from "./types";

type CommandCatalogState = ReturnType<typeof createCommandCatalogState>;
type RequestGuard = ReturnType<typeof createLatestRequestGuard>;
type UserCommandSourceCache = NonNullable<CommandCatalogState["userCommandSourceCache"]>;
type UserCommandSourceCacheSnapshot = Awaited<
  ReturnType<UserCommandSourceCache["refreshFromScan"]>
>;

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
  scanned: UserCommandSourceCacheSnapshot;
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

function createResolveRuntimePlatform(
  options: UseCommandCatalogOptions,
  getRuntimePlatform: () => RuntimePlatform | null,
  setRuntimePlatform: (value: RuntimePlatform) => void
) {
  return () =>
    resolveRuntimePlatformOnce({
      options,
      getRuntimePlatform,
      setRuntimePlatform
    });
}

function createLoadBuiltinTemplatesAndSource(
  state: CommandCatalogState,
  getRuntimePlatform: () => RuntimePlatform | null
) {
  return () =>
    loadBuiltinTemplatesAndSourceForState({
      builtinTemplates: state.builtinTemplates,
      builtinCommandSourceById: state.builtinCommandSourceById,
      runtimePlatform: getRuntimePlatform()
    });
}

function createApplyMergedTemplates(
  options: UseCommandCatalogOptions,
  state: CommandCatalogState
) {
  return () =>
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
}

function createRemapFromCacheIfPrimed(params: {
  state: CommandCatalogState;
  requestGuard: RequestGuard;
  resolveRuntimePlatform: () => Promise<void>;
  loadBuiltinTemplatesAndSource: () => Promise<void>;
  applyMergedTemplates: () => void;
  getRuntimePlatform: () => RuntimePlatform | null;
}) {
  return async (): Promise<boolean> => {
    if (!params.state.userCommandSourceCache?.hasPrimedScan()) {
      return false;
    }

    const currentRequest = params.requestGuard.start();
    await params.resolveRuntimePlatform();
    if (!params.requestGuard.isLatest(currentRequest)) {
      return true;
    }

    await params.loadBuiltinTemplatesAndSource();
    if (!params.requestGuard.isLatest(currentRequest)) {
      return true;
    }

    applyCachedUserTemplates({
      state: params.state,
      runtimePlatform: params.getRuntimePlatform(),
      applyMergedTemplates: params.applyMergedTemplates
    });
    if (!params.requestGuard.isLatest(currentRequest)) {
      return true;
    }

    markCatalogReady(params.state);
    return true;
  };
}

function handleNonTauriRefresh(params: {
  state: CommandCatalogState;
  requestGuard: RequestGuard;
  currentRequest: number;
  applyMergedTemplates: () => void;
}): boolean {
  params.applyMergedTemplates();
  if (!params.requestGuard.isLatest(params.currentRequest)) {
    return true;
  }
  markCatalogReady(params.state);
  return true;
}

function handleMissingPortsRefresh(params: {
  state: CommandCatalogState;
  requestGuard: RequestGuard;
  currentRequest: number;
  applyMergedTemplates: () => void;
}): boolean {
  setMissingPortsIssue(params.state);
  params.applyMergedTemplates();
  if (!params.requestGuard.isLatest(params.currentRequest)) {
    return true;
  }
  markCatalogReady(params.state);
  return true;
}

function applyRefreshFailure(params: {
  state: CommandCatalogState;
  error: unknown;
  builtinLoaded: boolean;
  applyMergedTemplates: () => void;
}) {
  console.warn("[commands] failed to refresh command catalog", params.error);
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

function createRefreshUserCommands(params: {
  options: UseCommandCatalogOptions;
  state: CommandCatalogState;
  requestGuard: RequestGuard;
  resolveRuntimePlatform: () => Promise<void>;
  loadBuiltinTemplatesAndSource: () => Promise<void>;
  applyMergedTemplates: () => void;
  getRuntimePlatform: () => RuntimePlatform | null;
}) {
  return async (): Promise<void> => {
    const currentRequest = params.requestGuard.start();
    params.state.catalogStatus.value = "loading";
    params.state.catalogReady.value = false;
    let builtinLoaded = false;

    try {
      await params.resolveRuntimePlatform();
      if (!params.requestGuard.isLatest(currentRequest)) {
        return;
      }

      await params.loadBuiltinTemplatesAndSource();
      if (!params.requestGuard.isLatest(currentRequest)) {
        return;
      }
      builtinLoaded = true;

      if (!params.options.isTauriRuntime()) {
        handleNonTauriRefresh({
          state: params.state,
          requestGuard: params.requestGuard,
          currentRequest,
          applyMergedTemplates: params.applyMergedTemplates
        });
        return;
      }

      if (!params.state.userCommandSourceCache) {
        handleMissingPortsRefresh({
          state: params.state,
          requestGuard: params.requestGuard,
          currentRequest,
          applyMergedTemplates: params.applyMergedTemplates
        });
        return;
      }

      const scanned = await params.state.userCommandSourceCache.refreshFromScan({
        shouldContinue: () => params.requestGuard.isLatest(currentRequest)
      });
      if (!params.requestGuard.isLatest(currentRequest)) {
        return;
      }

      applyScannedUserTemplates({
        state: params.state,
        runtimePlatform: params.getRuntimePlatform(),
        scanned,
        applyMergedTemplates: params.applyMergedTemplates
      });
      if (!params.requestGuard.isLatest(currentRequest)) {
        return;
      }

      markCatalogReady(params.state);
    } catch (error) {
      if (!params.requestGuard.isLatest(currentRequest)) {
        return;
      }
      applyRefreshFailure({
        state: params.state,
        error,
        builtinLoaded,
        applyMergedTemplates: params.applyMergedTemplates
      });
    }
  };
}

export function createCommandCatalogRuntimeController(
  options: UseCommandCatalogOptions,
  state: CommandCatalogState
) {
  let runtimePlatform: RuntimePlatform | null = null;
  let inFlightRefresh: Promise<void> | null = null;
  const requestGuard = createLatestRequestGuard();
  const getRuntimePlatform = () => runtimePlatform;
  const setRuntimePlatform = (value: RuntimePlatform) => {
    runtimePlatform = value;
  };
  const resolveRuntimePlatform = createResolveRuntimePlatform(
    options,
    getRuntimePlatform,
    setRuntimePlatform
  );
  const loadBuiltinTemplatesAndSource = createLoadBuiltinTemplatesAndSource(
    state,
    getRuntimePlatform
  );
  const applyMergedTemplates = createApplyMergedTemplates(options, state);
  const remapFromCacheIfPrimed = createRemapFromCacheIfPrimed({
    state,
    requestGuard,
    resolveRuntimePlatform,
    loadBuiltinTemplatesAndSource,
    applyMergedTemplates,
    getRuntimePlatform
  });
  const refreshUserCommandsInternal = createRefreshUserCommands({
    options,
    state,
    requestGuard,
    resolveRuntimePlatform,
    loadBuiltinTemplatesAndSource,
    applyMergedTemplates,
    getRuntimePlatform
  });

  async function refreshUserCommands(): Promise<void> {
    if (inFlightRefresh) {
      return inFlightRefresh;
    }

    inFlightRefresh = refreshUserCommandsInternal().finally(() => {
      inFlightRefresh = null;
    });
    return inFlightRefresh;
  }

  return {
    loadBuiltinTemplatesAndSource,
    applyMergedTemplates,
    remapFromCacheIfPrimed,
    refreshUserCommands
  };
}
