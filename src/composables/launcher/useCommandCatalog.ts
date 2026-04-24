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

function createCommandCatalogRuntimeController(
  options: UseCommandCatalogOptions,
  state: ReturnType<typeof createCommandCatalogState>
) {
  let runtimePlatform: RuntimePlatform | null = null;

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
    await resolveRuntimePlatform();
    await loadBuiltinTemplatesAndSource();
    const cached = state.userCommandSourceCache.remapFromCache();
    applyUserTemplatesFromPayload({
      payloadEntries: cached.payloadEntries,
      sourceIssues: cached.issues,
      runtimePlatform,
      userTemplates: state.userTemplates,
      userCommandSourceById: state.userCommandSourceById,
      loadIssues: state.loadIssues,
      applyMergedTemplates
    });
    state.catalogStatus.value = "ready";
    state.catalogReady.value = true;
    return true;
  }

  async function refreshUserCommands(): Promise<void> {
    state.catalogStatus.value = "loading";
    state.catalogReady.value = false;
    let builtinLoaded = false;

    try {
      await resolveRuntimePlatform();
      await loadBuiltinTemplatesAndSource();
      builtinLoaded = true;

      if (!options.isTauriRuntime()) {
        applyMergedTemplates();
        state.catalogStatus.value = "ready";
        state.catalogReady.value = true;
        return;
      }

      if (!state.userCommandSourceCache) {
        state.loadIssues.value = [
          createReadFailedIssue(
            USER_COMMAND_SOURCE_ID,
            "user command scan/read ports are not configured."
          )
        ];
        applyMergedTemplates();
        state.catalogStatus.value = "ready";
        state.catalogReady.value = true;
        return;
      }
      const scanned = await state.userCommandSourceCache.refreshFromScan();
      applyUserTemplatesFromPayload({
        payloadEntries: scanned.payloadEntries,
        sourceIssues: scanned.issues,
        runtimePlatform,
        userTemplates: state.userTemplates,
        userCommandSourceById: state.userCommandSourceById,
        loadIssues: state.loadIssues,
        applyMergedTemplates
      });
      state.catalogStatus.value = "ready";
      state.catalogReady.value = true;
    } catch (error) {
      console.warn("[commands] failed to refresh user command files", error);
      state.userCommandSourceCache?.clear();
      state.loadIssues.value = [
        state.userCommandSourceCache
          ? createScanFailedIssue(USER_COMMAND_SOURCE_ID, error)
          : createReadFailedIssue(USER_COMMAND_SOURCE_ID, error)
      ];
      applyMergedTemplates();
      if (builtinLoaded) {
        state.catalogStatus.value = "ready";
        state.catalogReady.value = true;
      } else {
        state.catalogStatus.value = "error";
        state.catalogReady.value = false;
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
