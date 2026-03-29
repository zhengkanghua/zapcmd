import { computed, ref, type Ref } from "vue";
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
import { createDefaultCommandViewState } from "../../stores/settings/defaults";
import { normalizeCommandViewState } from "../../stores/settings/normalization";

interface UseCommandManagementOptions {
  allCommandTemplates: Readonly<Ref<CommandTemplate[]>>;
  disabledCommandIds: Readonly<Ref<string[]>>;
  commandSourceById: Readonly<Ref<Record<string, string>>>;
  userCommandSourceById: Readonly<Ref<Record<string, string>>>;
  overriddenCommandIds: Readonly<Ref<string[]>>;
  loadIssues: Readonly<Ref<CommandLoadIssue[]>>;
  setCommandEnabled: (commandId: string, enabled: boolean) => void;
  setDisabledCommandIds: (ids: string[]) => void;
};

interface CommandManagementIndexedRow extends CommandManagementRow {
  normalizedSearchText: string;
}

export const COMMAND_ROWS_INITIAL_RENDER_LIMIT = 120;
export const COMMAND_ROWS_RENDER_CHUNK_SIZE = 80;

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function toSourceFileLabel(sourcePath: string): string {
  const normalized = sourcePath.replaceAll("\\", "/");
  const last = normalized.split("/").filter((item) => item.length > 0).pop();
  return last ?? sourcePath;
}

function formatIssueStage(issue: CommandLoadIssue): string {
  if (issue.stage === "read") {
    return t("settings.commands.issueStageRead");
  }
  if (issue.stage === "parse") {
    return t("settings.commands.issueStageParse");
  }
  if (issue.stage === "schema") {
    return t("settings.commands.issueStageSchema");
  }
  return t("settings.commands.issueStageMerge");
}

function formatIssue(issue: CommandLoadIssue): string {
  const stage = formatIssueStage(issue);
  const reason = issue.reason.trim().length > 0 ? issue.reason : t("execution.failedFallback");

  let summary = "";
  if (issue.code === "read-failed") {
    summary = t("settings.commands.issueReadFailed", { sourceId: issue.sourceId });
  }
  if (issue.code === "invalid-json") {
    summary = t("settings.commands.issueInvalidJson", { sourceId: issue.sourceId });
  }
  if (issue.code === "invalid-schema") {
    summary = t("settings.commands.issueInvalidSchema", { sourceId: issue.sourceId });
  }
  if (issue.code === "duplicate-id") {
    summary = t("settings.commands.issueDuplicateId", {
      commandId: issue.commandId ?? "unknown",
      sourceId: issue.sourceId
    });
  }
  if (issue.code === "shell-ignored") {
    summary = t("settings.commands.issueShellIgnored", {
      commandId: issue.commandId ?? "unknown",
      sourceId: issue.sourceId
    });
  }

  return t("settings.commands.issueWithReason", {
    stage,
    summary,
    reason
  });
}

function matchesQuery(row: CommandManagementIndexedRow, query: string): boolean {
  if (!query) {
    return true;
  }
  return row.normalizedSearchText.includes(query);
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
  return computed<CommandManagementIndexedRow[]>(() => {
    const disabledSet = new Set(options.disabledCommandIds.value);
    const overriddenSet = new Set(options.overriddenCommandIds.value);
    const issueSourceSet = new Set(options.loadIssues.value.map((item) => item.sourceId));

    return options.allCommandTemplates.value.map((template) => {
      const sourcePath = options.commandSourceById.value[template.id];
      const sourceFileLabel = sourcePath ? toSourceFileLabel(sourcePath) : undefined;
      const source: CommandManagementRow["source"] = options.userCommandSourceById.value[template.id]
        ? "user"
        : "builtin";
      return {
        id: template.id,
        title: template.title,
        category: template.category,
        source,
        sourcePath,
        sourceFileLabel,
        overridesBuiltin: overriddenSet.has(template.id),
        enabled: !disabledSet.has(template.id),
        hasLoadIssue: Boolean(sourcePath) && issueSourceSet.has(sourcePath),
        normalizedSearchText: [
          template.title,
          template.id,
          template.category,
          sourcePath ?? "",
          sourceFileLabel ?? ""
        ]
          .join(" ")
          .toLowerCase()
      };
    });
  });
}

function createSummary(rows: Readonly<Ref<CommandManagementIndexedRow[]>>) {
  return computed<CommandManagementSummary>(() => {
    const total = rows.value.length;
    let disabled = 0;
    let userDefined = 0;
    let overridden = 0;

    for (const row of rows.value) {
      if (!row.enabled) {
        disabled += 1;
      }
      if (row.source === "user") {
        userDefined += 1;
      }
      if (row.overridesBuiltin) {
        overridden += 1;
      }
    }

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
      stage: issue.stage,
      sourceId: issue.sourceId,
      reason: issue.reason,
      commandId: issue.commandId,
      message: formatIssue(issue)
    }))
  );
}

function createSourceFileOptions(rows: Readonly<Ref<CommandManagementIndexedRow[]>>) {
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
  rows: Readonly<Ref<CommandManagementIndexedRow[]>>,
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
        if (view.categoryFilter !== "all" && row.category !== view.categoryFilter) {
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

function createCategoryOptions(rows: Readonly<Ref<CommandManagementIndexedRow[]>>) {
  return computed<CommandSelectOption<string>[]>(() => {
    const locale = getCurrentLocale();
    const seen = new Set<string>();

    for (const row of rows.value) {
      const normalized = row.category.trim();
      if (normalized.length === 0) {
        continue;
      }
      seen.add(normalized);
    }

    const categories = Array.from(seen).sort((left, right) => left.localeCompare(right, locale));

    return [
      { value: "all", label: t("settings.commandFilters.categoryAll") },
      ...categories.map((category) => ({ value: category, label: category }))
    ];
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
      { value: "list", label: t("settings.commandFilters.displayList") }
    ])
  };
}

export function useCommandManagement(options: UseCommandManagementOptions) {
  const commandView = ref<CommandManagementViewState>(createDefaultCommandViewState());
  const commandRowsAll = createAllRows(options);
  const commandSummary = createSummary(commandRowsAll);
  const commandLoadIssues = createIssueViews(options.loadIssues);
  const commandSourceFileOptions = createSourceFileOptions(commandRowsAll);
  const commandCategoryOptions = createCategoryOptions(commandRowsAll);
  const commandRows = createFilteredRows(commandRowsAll, commandView);
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
    commandView.value = normalizeCommandViewState({
      ...commandView.value,
      ...patch
    });
  }

  function resetCommandFilters(): void {
    commandView.value = createDefaultCommandViewState();
  }

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
