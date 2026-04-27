import {
  createCommandCatalogRuntimeController
} from "./useCommandCatalog/controller";
import { bindCommandCatalogLifecycle } from "./useCommandCatalog/lifecycle";
import {
  buildCommandCatalogReturn,
  createCommandCatalogState
} from "./useCommandCatalog/state";
import {
  type UseCommandCatalogOptions,
  type UseCommandCatalogReturn
} from "./useCommandCatalog/types";

export type { UseCommandCatalogOptions, UseCommandCatalogReturn } from "./useCommandCatalog/types";

export function useCommandCatalog(
  options: UseCommandCatalogOptions
): UseCommandCatalogReturn {
  const state = createCommandCatalogState(options);
  const {
    applyMergedTemplates,
    remapFromCacheIfPrimed,
    refreshUserCommands
  } = createCommandCatalogRuntimeController(options, state);

  bindCommandCatalogLifecycle({
    options,
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
