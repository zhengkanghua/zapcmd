import type { RuntimePlatform } from "../../../features/commands/runtimeTypes";
import { applyMergedCommandCatalogState } from "./merge";
import {
  loadBuiltinTemplatesAndSourceForState,
  resolveRuntimePlatformOnce
} from "./runtimePlatform";
import { createCommandCatalogState } from "./state";
import { createLatestRequestGuard } from "./requestGuard";
import {
  type UseCommandCatalogOptions
} from "./types";
import {
  markCatalogReady,
  setMissingPortsIssue
} from "./status";
import {
  applyCachedUserTemplates,
  applyRefreshFailure,
  applyScannedUserTemplates
} from "./templateApplication";

export {
  markCatalogError,
  markCatalogReady,
  setMissingPortsIssue
} from "./status";

type CommandCatalogState = ReturnType<typeof createCommandCatalogState>;
type RequestGuard = ReturnType<typeof createLatestRequestGuard>;
type UserCommandSourceCache = NonNullable<CommandCatalogState["userCommandSourceCache"]>;
type UserCommandSourceCacheSnapshot = Awaited<
  ReturnType<UserCommandSourceCache["refreshFromScan"]>
>;

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

function createRefreshUserCommands(params: {
  options: UseCommandCatalogOptions;
  state: CommandCatalogState;
  requestGuard: RequestGuard;
  resolveRuntimePlatform: () => Promise<void>;
  loadBuiltinTemplatesAndSource: () => Promise<void>;
  applyMergedTemplates: () => void;
  getRuntimePlatform: () => RuntimePlatform | null;
  onUserSourceRefreshWindowChange?: (eligible: boolean) => void;
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

      params.onUserSourceRefreshWindowChange?.(true);
      let scanned: UserCommandSourceCacheSnapshot;
      try {
        scanned = await params.state.userCommandSourceCache.refreshFromScan({
          shouldContinue: () => params.requestGuard.isLatest(currentRequest)
        });
      } finally {
        params.onUserSourceRefreshWindowChange?.(false);
      }
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
        runtimePlatform: params.getRuntimePlatform(),
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
  let queuedRefresh: Promise<void> | null = null;
  let needsRerun = false;
  let rerunEligible = false;
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
    getRuntimePlatform,
    onUserSourceRefreshWindowChange: (eligible) => {
      rerunEligible = eligible;
    }
  });

  function startRefreshCycle(): Promise<void> {
    const currentRefresh = refreshUserCommandsInternal();
    inFlightRefresh = currentRefresh.finally(() => {
      if (inFlightRefresh === currentRefresh) {
        inFlightRefresh = null;
      }
      rerunEligible = false;
    });
    return inFlightRefresh;
  }

  async function runQueuedRefreshes(): Promise<void> {
    while (needsRerun) {
      needsRerun = false;
      await startRefreshCycle();
    }
  }

  async function refreshUserCommands(): Promise<void> {
    if (inFlightRefresh && state.catalogStatus.value !== "loading") {
      inFlightRefresh = null;
    }

    if (!inFlightRefresh) {
      return startRefreshCycle();
    }

    if (!rerunEligible) {
      return inFlightRefresh;
    }

    // 不吞掉并发期间的第二次刷新意图；当前轮结束后最多顺延补跑一轮，
    // 若补跑期间又有新请求，则继续合并到同一条串行队列里。
    needsRerun = true;
    if (!queuedRefresh) {
      queuedRefresh = inFlightRefresh
        .catch(() => undefined)
        .then(() => runQueuedRefreshes())
        .finally(() => {
          queuedRefresh = null;
        });
    }
    return queuedRefresh;
  }

  return {
    loadBuiltinTemplatesAndSource,
    applyMergedTemplates,
    remapFromCacheIfPrimed,
    refreshUserCommands
  };
}
