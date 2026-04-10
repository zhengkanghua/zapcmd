import { computed, type Ref } from "vue";
import { getCurrentLocale, t } from "../../../i18n";
import type {
  CommandFilterIssue,
  CommandFilterOverride,
  CommandFilterSource,
  CommandFilterStatus,
  CommandSelectOption,
  CommandSortBy,
  CommandSourceFileOption
} from "../../../features/settings/types";
import type { CommandManagementIndexedRow } from "./rows";

export function createCategoryOptions(rows: Readonly<Ref<CommandManagementIndexedRow[]>>) {
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

export function createSourceFileOptions(rows: Readonly<Ref<CommandManagementIndexedRow[]>>) {
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

export function createCommandFilterOptions() {
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
    ])
  };
}
