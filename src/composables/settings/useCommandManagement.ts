import { computed, type Ref } from "vue";
import { getCurrentLocale, t } from "../../i18n";
import type { CommandLoadIssue } from "../../features/commands/runtimeLoader";
import type { CommandTemplate } from "../../features/commands/types";
import type {
  CommandDisplayMode,
  CommandFilterIssue,
  CommandFilterOverride,
  CommandFilterSource,
  CommandFilterStatus,
  CommandManagementGroup,
  CommandLoadIssueView,
  CommandManagementRow,
  CommandManagementSummary,
  CommandManagementViewState,
  CommandSelectOption,
  CommandSortBy,
  CommandSourceFileOption
} from "../../features/settings/types";

interface UseCommandManagementOptions {
  allCommandTemplates: Readonly<Ref<CommandTemplate[]>>;
  disabledCommandIds: Readonly<Ref<string[]>>;
  commandSourceById: Readonly<Ref<Record<string, string>>>;
  userCommandSourceById: Readonly<Ref<Record<string, string>>>;
  overriddenCommandIds: Readonly<Ref<string[]>>;
  loadIssues: Readonly<Ref<CommandLoadIssue[]>>;
  commandView: Readonly<Ref<CommandManagementViewState>>;
  setCommandEnabled: (commandId: string, enabled: boolean) => void;
  setDisabledCommandIds: (ids: string[]) => void;
  setCommandViewState: (patch: Partial<CommandManagementViewState>) => void;
}

const DEFAULT_VIEW_PATCH: Partial<CommandManagementViewState> = {
  query: "",
  sourceFilter: "all",
  statusFilter: "all",
  overrideFilter: "all",
  issueFilter: "all",
  fileFilter: "all",
  sortBy: "default",
  displayMode: "list"
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function toSourceFileLabel(sourcePath: string): string {
  const normalized = sourcePath.replaceAll("\\", "/");
  const last = normalized.split("/").filter((item) => item.length > 0).pop();
  return last ?? sourcePath;
}

function formatIssue(issue: CommandLoadIssue): string {
  if (issue.code === "invalid-json") {
    return t("settings.commands.issueInvalidJson", { sourceId: issue.sourceId });
  }
  if (issue.code === "invalid-schema") {
    return t("settings.commands.issueInvalidSchema", { sourceId: issue.sourceId });
  }
  return t("settings.commands.issueDuplicateId", {
    commandId: issue.commandId ?? "unknown",
    sourceId: issue.sourceId
  });
}

function matchesQuery(row: CommandManagementRow, query: string): boolean {
  if (!query) {
    return true;
  }
  const haystack = [row.title, row.id, row.category, row.sourcePath ?? "", row.sourceFileLabel ?? ""]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function compareByDefault(left: CommandManagementRow, right: CommandManagementRow): number {
  const locale = getCurrentLocale();
  if (left.enabled !== right.enabled) {
    return left.enabled ? 1 : -1;
  }
  if (left.overridesBuiltin !== right.overridesBuiltin) {
    return left.overridesBuiltin ? -1 : 1;
  }
  return left.title.localeCompare(right.title, locale);
}

function compareRows(left: CommandManagementRow, right: CommandManagementRow, sortBy: CommandSortBy): number {
  const locale = getCurrentLocale();
  if (sortBy === "title") {
    return left.title.localeCompare(right.title, locale);
  }
  if (sortBy === "category") {
    return left.category.localeCompare(right.category, locale) || left.title.localeCompare(right.title, locale);
  }
  if (sortBy === "source") {
    return left.source.localeCompare(right.source, locale) || left.title.localeCompare(right.title, locale);
  }
  if (sortBy === "status") {
    if (left.enabled !== right.enabled) {
      return left.enabled ? 1 : -1;
    }
    return left.title.localeCompare(right.title, locale);
  }
  return compareByDefault(left, right);
}

function createAllRows(options: UseCommandManagementOptions) {
  return computed<CommandManagementRow[]>(() => {
    const disabledSet = new Set(options.disabledCommandIds.value);
    const overriddenSet = new Set(options.overriddenCommandIds.value);
    const issueSourceSet = new Set(options.loadIssues.value.map((item) => item.sourceId));

    return options.allCommandTemplates.value.map((template) => {
      const sourcePath = options.commandSourceById.value[template.id];
      const source: CommandManagementRow["source"] = options.userCommandSourceById.value[template.id]
        ? "user"
        : "builtin";
      return {
        id: template.id,
        title: template.title,
        category: template.category,
        source,
        sourcePath,
        sourceFileLabel: sourcePath ? toSourceFileLabel(sourcePath) : undefined,
        overridesBuiltin: overriddenSet.has(template.id),
        enabled: !disabledSet.has(template.id),
        hasLoadIssue: Boolean(sourcePath) && issueSourceSet.has(sourcePath)
      };
    });
  });
}

function createSummary(rows: Readonly<Ref<CommandManagementRow[]>>) {
  return computed<CommandManagementSummary>(() => {
    const total = rows.value.length;
    const disabled = rows.value.filter((item) => !item.enabled).length;
    const userDefined = rows.value.filter((item) => item.source === "user").length;
    const overridden = rows.value.filter((item) => item.overridesBuiltin).length;
    return {
      total,
      enabled: total - disabled,
      disabled,
      userDefined,
      overridden
    };
  });
}

function createIssueViews(loadIssues: Readonly<Ref<CommandLoadIssue[]>>) {
  return computed<CommandLoadIssueView[]>(() =>
    loadIssues.value.map((issue) => ({
      code: issue.code,
      sourceId: issue.sourceId,
      commandId: issue.commandId,
      message: formatIssue(issue)
    }))
  );
}

function createSourceFileOptions(rows: Readonly<Ref<CommandManagementRow[]>>) {
  return computed<CommandSourceFileOption[]>(() => {
    const byPath = new Map<string, CommandSourceFileOption>();
    for (const row of rows.value) {
      if (!row.sourcePath) {
        continue;
      }
      const current = byPath.get(row.sourcePath);
      if (current) {
        current.count += 1;
        continue;
      }
      byPath.set(row.sourcePath, {
        value: row.sourcePath,
        label: row.sourceFileLabel ?? row.sourcePath,
        count: 1
      });
    }
    return Array.from(byPath.values()).sort((left, right) =>
      left.label.localeCompare(right.label, getCurrentLocale())
    );
  });
}

function createFilteredRows(
  rows: Readonly<Ref<CommandManagementRow[]>>,
  commandView: Readonly<Ref<CommandManagementViewState>>
) {
  return computed<CommandManagementRow[]>(() => {
    const view = commandView.value;
    const query = normalizeText(view.query);

    return rows.value
      .filter((row) => {
        if (!matchesQuery(row, query)) {
          return false;
        }
        if (view.sourceFilter !== "all" && row.source !== view.sourceFilter) {
          return false;
        }
        if (view.statusFilter === "enabled" && !row.enabled) {
          return false;
        }
        if (view.statusFilter === "disabled" && row.enabled) {
          return false;
        }
        if (view.overrideFilter === "overridden" && !row.overridesBuiltin) {
          return false;
        }
        if (view.issueFilter === "with-issues" && !row.hasLoadIssue) {
          return false;
        }
        if (view.fileFilter !== "all" && row.sourcePath !== view.fileFilter) {
          return false;
        }
        return true;
      })
      .slice()
      .sort((left, right) => compareRows(left, right, view.sortBy));
  });
}

function createCommandGroups(rows: Readonly<Ref<CommandManagementRow[]>>) {
  return computed<CommandManagementGroup[]>(() => {
    const byKey = new Map<string, CommandManagementGroup>();
    for (const row of rows.value) {
      const key = row.sourcePath ?? "__unknown_source__";
      const title = row.sourceFileLabel ?? row.sourcePath ?? t("settings.commands.unknownSourceFile");
      const existing = byKey.get(key);
      if (existing) {
        existing.rows.push(row);
        existing.count += 1;
        continue;
      }
      byKey.set(key, {
        key,
        title,
        count: 1,
        sourcePath: row.sourcePath,
        rows: [row]
      });
    }

    return Array.from(byKey.values()).sort((left, right) =>
      left.title.localeCompare(right.title, getCurrentLocale())
    );
  });
}

function createCommandFilterOptions() {
  return {
    commandSourceOptions: computed<CommandSelectOption<CommandFilterSource>[]>(() => [
      { value: "all", label: t("settings.commandFilters.sourceAll") },
      { value: "builtin", label: t("settings.commandFilters.sourceBuiltin") },
      { value: "user", label: t("settings.commandFilters.sourceUser") }
    ]),
    commandStatusOptions: computed<CommandSelectOption<CommandFilterStatus>[]>(() => [
      { value: "all", label: t("settings.commandFilters.statusAll") },
      { value: "enabled", label: t("settings.commandFilters.statusEnabled") },
      { value: "disabled", label: t("settings.commandFilters.statusDisabled") }
    ]),
    commandOverrideOptions: computed<CommandSelectOption<CommandFilterOverride>[]>(() => [
      { value: "all", label: t("settings.commandFilters.overrideAll") },
      { value: "overridden", label: t("settings.commandFilters.overrideOnly") }
    ]),
    commandIssueOptions: computed<CommandSelectOption<CommandFilterIssue>[]>(() => [
      { value: "all", label: t("settings.commandFilters.issueAll") },
      { value: "with-issues", label: t("settings.commandFilters.issueOnly") }
    ]),
    commandSortOptions: computed<CommandSelectOption<CommandSortBy>[]>(() => [
      { value: "default", label: t("settings.commandFilters.sortDefault") },
      { value: "title", label: t("settings.commandFilters.sortTitle") },
      { value: "category", label: t("settings.commandFilters.sortCategory") },
      { value: "source", label: t("settings.commandFilters.sortSource") },
      { value: "status", label: t("settings.commandFilters.sortStatus") }
    ]),
    commandDisplayModeOptions: computed<CommandSelectOption<CommandDisplayMode>[]>(() => [
      { value: "list", label: t("settings.commandFilters.displayList") },
      { value: "groupedByFile", label: t("settings.commandFilters.displayGroupedByFile") }
    ])
  };
}

export function useCommandManagement(options: UseCommandManagementOptions) {
  const commandRowsAll = createAllRows(options);
  const commandSummary = createSummary(commandRowsAll);
  const commandLoadIssues = createIssueViews(options.loadIssues);
  const commandSourceFileOptions = createSourceFileOptions(commandRowsAll);
  const commandRows = createFilteredRows(commandRowsAll, options.commandView);
  const commandGroups = createCommandGroups(commandRows);
  const commandFilterOptions = createCommandFilterOptions();

  const commandFilteredCount = computed(() => commandRows.value.length);

  function toggleCommandEnabled(commandId: string, enabled: boolean): void {
    options.setCommandEnabled(commandId, enabled);
  }

  function setFilteredCommandsEnabled(enabled: boolean): void {
    const targetIds = commandRows.value.map((item) => item.id);
    if (targetIds.length === 0) {
      return;
    }

    const disabledSet = new Set(options.disabledCommandIds.value);
    if (enabled) {
      for (const id of targetIds) {
        disabledSet.delete(id);
      }
    } else {
      for (const id of targetIds) {
        disabledSet.add(id);
      }
    }

    options.setDisabledCommandIds(Array.from(disabledSet));
  }

  function updateCommandView(patch: Partial<CommandManagementViewState>): void {
    options.setCommandViewState(patch);
  }

  function resetCommandFilters(): void {
    updateCommandView(DEFAULT_VIEW_PATCH);
  }

  return {
    commandRows,
    commandSummary,
    commandLoadIssues,
    commandFilteredCount,
    commandView: options.commandView,
    commandSourceOptions: commandFilterOptions.commandSourceOptions,
    commandStatusOptions: commandFilterOptions.commandStatusOptions,
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
