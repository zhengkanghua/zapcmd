import { ref, type Ref } from "vue";
import {
  type CommandLoadIssue,
  loadBuiltinCommandTemplatesWithReport
} from "../../../features/commands/runtimeLoader";
import type { CommandTemplate } from "../../../features/commands/types";
import { createUserCommandSourceCache } from "../../../features/commands/userCommandSourceCache";
import type { UseCommandCatalogOptions, UseCommandCatalogReturn } from "./types";

/**
 * catalog state 只负责持有 refs 与 cache，不承担任何业务合并或生命周期逻辑。
 */
export function createCommandCatalogState(
  options: UseCommandCatalogOptions,
  initialBuiltinLoaded: ReturnType<typeof loadBuiltinCommandTemplatesWithReport>
) {
  const builtinTemplates = ref<CommandTemplate[]>(initialBuiltinLoaded.templates);
  const userTemplates = ref<CommandTemplate[]>([]);
  const allCommandTemplates = ref<CommandTemplate[]>(builtinTemplates.value);
  const commandTemplates = ref<CommandTemplate[]>(builtinTemplates.value);
  const builtinCommandSourceById = ref<Record<string, string>>(
    initialBuiltinLoaded.sourceByCommandId
  );
  const commandSourceById = ref<Record<string, string>>({});
  const userCommandSourceById = ref<Record<string, string>>({});
  const overriddenCommandIds = ref<string[]>([]);
  const loadIssues = ref<CommandLoadIssue[]>([]);
  const catalogReady = ref(!options.isTauriRuntime());
  const userCommandSourceCache =
    options.scanUserCommandFiles && options.readUserCommandFile
      ? createUserCommandSourceCache({
          scanUserCommandFiles: options.scanUserCommandFiles,
          readUserCommandFile: options.readUserCommandFile
        })
      : null;

  return {
    builtinTemplates,
    userTemplates,
    allCommandTemplates,
    commandTemplates,
    builtinCommandSourceById,
    commandSourceById,
    userCommandSourceById,
    overriddenCommandIds,
    loadIssues,
    catalogReady,
    userCommandSourceCache
  };
}

interface BuildCommandCatalogReturnOptions {
  commandTemplates: Ref<CommandTemplate[]>;
  allCommandTemplates: Ref<CommandTemplate[]>;
  commandSourceById: Ref<Record<string, string>>;
  userCommandSourceById: Ref<Record<string, string>>;
  overriddenCommandIds: Ref<string[]>;
  loadIssues: Ref<CommandLoadIssue[]>;
  catalogReady: Ref<boolean>;
  refreshUserCommands: () => Promise<void>;
}

export function buildCommandCatalogReturn(
  options: BuildCommandCatalogReturnOptions
): UseCommandCatalogReturn {
  return {
    commandTemplates: options.commandTemplates,
    allCommandTemplates: options.allCommandTemplates,
    commandSourceById: options.commandSourceById,
    userCommandSourceById: options.userCommandSourceById,
    overriddenCommandIds: options.overriddenCommandIds,
    loadIssues: options.loadIssues,
    catalogReady: options.catalogReady,
    refreshUserCommands: options.refreshUserCommands
  };
}
