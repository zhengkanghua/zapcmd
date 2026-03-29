import { computed } from "vue";
import type {
  CommandFilterIssue,
  CommandFilterOverride,
  CommandFilterSource,
  CommandFilterStatus,
  CommandManagementSummary,
  CommandManagementViewState,
  CommandSelectOption,
  CommandSortBy,
  CommandSourceFileOption
} from "../../../../features/settings/types";

export interface FilterOption {
  value: string;
  label: string;
}

export interface PrimaryFilter {
  key: string;
  label: string;
  modelValue: string;
  options: FilterOption[];
  onUpdate: (value: string) => void;
}

export interface SecondaryFilter {
  key: string;
  label: string;
  modelValue: string;
  options: FilterOption[];
  onUpdate: (value: string) => void;
}

export interface SettingsCommandsToolbarProps {
  commandFilteredCount: number;
  commandSummary: CommandManagementSummary;
  commandView: CommandManagementViewState;
  commandSourceOptions: CommandSelectOption<CommandFilterSource>[];
  commandStatusOptions: CommandSelectOption<CommandFilterStatus>[];
  commandCategoryOptions: CommandSelectOption<string>[];
  commandOverrideOptions: CommandSelectOption<CommandFilterOverride>[];
  commandIssueOptions: CommandSelectOption<CommandFilterIssue>[];
  commandSortOptions: CommandSelectOption<CommandSortBy>[];
  commandSourceFileOptions: CommandSourceFileOption[];
  moreFiltersOpen: boolean;
  toolbarHeadingId: string;
}

interface CreateToolbarFiltersOptions {
  props: SettingsCommandsToolbarProps;
  t: (key: string) => string;
  updateView: (patch: Partial<CommandManagementViewState>) => void;
}

export function createToolbarFilters(options: CreateToolbarFiltersOptions) {
  const fileFilterOptions = computed(() => [
    { value: "all", label: options.t("settings.commands.allFiles") },
    ...options.props.commandSourceFileOptions.map((item) => ({
      value: item.value,
      label: `${item.label} (${item.count})`
    }))
  ]);

  const primaryFilters = computed<PrimaryFilter[]>(() => [
    {
      key: "sourceFilter",
      label: options.t("settings.commands.sourceFilter"),
      modelValue: options.props.commandView.sourceFilter,
      options: options.props.commandSourceOptions,
      onUpdate: (value) => {
        options.updateView({ sourceFilter: value as CommandFilterSource });
      }
    },
    {
      key: "categoryFilter",
      label: options.t("settings.commands.tableHeaderCategory"),
      modelValue: options.props.commandView.categoryFilter,
      options: options.props.commandCategoryOptions,
      onUpdate: (value) => {
        options.updateView({ categoryFilter: value });
      }
    },
    {
      key: "statusFilter",
      label: options.t("settings.commands.statusFilter"),
      modelValue: options.props.commandView.statusFilter,
      options: options.props.commandStatusOptions,
      onUpdate: (value) => {
        options.updateView({ statusFilter: value as CommandFilterStatus });
      }
    },
    {
      key: "sortBy",
      label: options.t("settings.commands.sortLabel"),
      modelValue: options.props.commandView.sortBy,
      options: options.props.commandSortOptions,
      onUpdate: (value) => {
        options.updateView({ sortBy: value as CommandSortBy });
      }
    }
  ]);

  const secondaryFilters = computed<SecondaryFilter[]>(() => [
    {
      key: "fileFilter",
      label: options.t("settings.commands.fileFilter"),
      modelValue: options.props.commandView.fileFilter,
      options: fileFilterOptions.value,
      onUpdate: (value) => {
        options.updateView({ fileFilter: value });
      }
    },
    {
      key: "overrideFilter",
      label: options.t("settings.commands.overrideFilter"),
      modelValue: options.props.commandView.overrideFilter,
      options: options.props.commandOverrideOptions,
      onUpdate: (value) => {
        options.updateView({ overrideFilter: value as CommandFilterOverride });
      }
    },
    {
      key: "issueFilter",
      label: options.t("settings.commands.issueFilter"),
      modelValue: options.props.commandView.issueFilter,
      options: options.props.commandIssueOptions,
      onUpdate: (value) => {
        options.updateView({ issueFilter: value as CommandFilterIssue });
      }
    }
  ]);

  const activeSecondaryFilterCount = computed(() => {
    let count = 0;
    if (options.props.commandView.fileFilter !== "all") {
      count += 1;
    }
    if (options.props.commandView.overrideFilter !== "all") {
      count += 1;
    }
    if (options.props.commandView.issueFilter !== "all") {
      count += 1;
    }
    return count;
  });

  const hasActiveFilters = computed(() => {
    const view = options.props.commandView;
    return (
      view.query.trim().length > 0 ||
      view.sourceFilter !== "all" ||
      view.statusFilter !== "all" ||
      view.categoryFilter !== "all" ||
      view.overrideFilter !== "all" ||
      view.issueFilter !== "all" ||
      view.fileFilter !== "all" ||
      view.sortBy !== "default"
    );
  });

  return {
    primaryFilters,
    secondaryFilters,
    activeSecondaryFilterCount,
    hasActiveFilters
  };
}
