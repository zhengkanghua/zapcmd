import { computed, ref, type Ref } from "vue";
import type { CommandLoadIssue } from "../../../features/commands/runtimeLoader";
import type { CommandTemplate } from "../../../features/commands/types";
import type { CommandManagementViewState } from "../../../features/settings/types";
import { createDefaultCommandViewState } from "../../../stores/settings/defaults";
import { createIssueViews } from "./issues";
import {
  createResetCommandFilters,
  createSetFilteredCommandsEnabled,
  createToggleCommandEnabled,
  createUpdateCommandView
} from "./mutations";
import {
  createCategoryOptions,
  createCommandFilterOptions,
  createSourceFileOptions
} from "./options";
import {
  COMMAND_ROWS_INITIAL_RENDER_LIMIT,
  COMMAND_ROWS_RENDER_CHUNK_SIZE,
  createAllRows,
  createCommandGroups,
  createFilteredRows,
  createSummary
} from "./rows";

export interface UseCommandManagementOptions {
  allCommandTemplates: Readonly<Ref<CommandTemplate[]>>;
  disabledCommandIds: Readonly<Ref<string[]>>;
  commandSourceById: Readonly<Ref<Record<string, string>>>;
  userCommandSourceById: Readonly<Ref<Record<string, string>>>;
  overriddenCommandIds: Readonly<Ref<string[]>>;
  loadIssues: Readonly<Ref<CommandLoadIssue[]>>;
  setCommandEnabled: (commandId: string, enabled: boolean) => void;
  setDisabledCommandIds: (ids: string[]) => void;
}

export { COMMAND_ROWS_INITIAL_RENDER_LIMIT, COMMAND_ROWS_RENDER_CHUNK_SIZE };

export function useCommandManagement(options: UseCommandManagementOptions) {
  const commandView = ref<CommandManagementViewState>(createDefaultCommandViewState());
  const issueSourceIds = computed(() => options.loadIssues.value.map((item) => item.sourceId));
  const commandRowsAll = createAllRows({
    allCommandTemplates: options.allCommandTemplates,
    disabledCommandIds: options.disabledCommandIds,
    commandSourceById: options.commandSourceById,
    userCommandSourceById: options.userCommandSourceById,
    overriddenCommandIds: options.overriddenCommandIds,
    issueSourceIds
  });
  const commandSummary = createSummary(commandRowsAll);
  const commandLoadIssues = createIssueViews(options.loadIssues);
  const commandSourceFileOptions = createSourceFileOptions(commandRowsAll);
  const commandCategoryOptions = createCategoryOptions(commandRowsAll);
  const commandRows = createFilteredRows(commandRowsAll, commandView);
  const commandGroups = createCommandGroups(commandRows);
  const commandFilterOptions = createCommandFilterOptions();

  const commandFilteredCount = computed(() => commandRows.value.length);
  const toggleCommandEnabled = createToggleCommandEnabled({
    setCommandEnabled: options.setCommandEnabled
  });
  const setFilteredCommandsEnabled = createSetFilteredCommandsEnabled({
    commandRows,
    disabledCommandIds: options.disabledCommandIds,
    setDisabledCommandIds: options.setDisabledCommandIds
  });
  const updateCommandView = createUpdateCommandView({ commandView });
  const resetCommandFilters = createResetCommandFilters({ commandView });

  return {
    commandRows,
    commandSummary,
    commandLoadIssues,
    commandFilteredCount,
    commandView,
    commandSourceOptions: commandFilterOptions.commandSourceOptions,
    commandStatusOptions: commandFilterOptions.commandStatusOptions,
    commandCategoryOptions,
    commandOverrideOptions: commandFilterOptions.commandOverrideOptions,
    commandIssueOptions: commandFilterOptions.commandIssueOptions,
    commandSortOptions: commandFilterOptions.commandSortOptions,
    commandDisplayModeOptions: commandFilterOptions.commandDisplayModeOptions,
    commandSourceFileOptions,
    commandGroups,
    toggleCommandEnabled,
    setFilteredCommandsEnabled,
    updateCommandView,
    resetCommandFilters
  };
}
