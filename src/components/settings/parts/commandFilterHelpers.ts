import type { CommandManagementViewState, CommandSelectOption } from "../../../features/settings/types";

export interface ActiveFilterChip {
  key: string;
  label: string;
}

const defaultViewState: Omit<CommandManagementViewState, "query" | "displayMode"> = {
  sourceFilter: "all",
  statusFilter: "all",
  overrideFilter: "all",
  issueFilter: "all",
  fileFilter: "all",
  sortBy: "default"
};

export function hasNonDefaultFilters(view: CommandManagementViewState): boolean {
  return (
    view.sourceFilter !== defaultViewState.sourceFilter ||
    view.statusFilter !== defaultViewState.statusFilter ||
    view.overrideFilter !== defaultViewState.overrideFilter ||
    view.issueFilter !== defaultViewState.issueFilter ||
    view.fileFilter !== defaultViewState.fileFilter ||
    view.sortBy !== defaultViewState.sortBy
  );
}

export function buildActiveFilterChips(
  view: CommandManagementViewState,
  options: {
    sourceOptions: CommandSelectOption<string>[];
    statusOptions: CommandSelectOption<string>[];
    overrideOptions: CommandSelectOption<string>[];
    issueOptions: CommandSelectOption<string>[];
    sortOptions: CommandSelectOption<string>[];
  }
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  if (view.sourceFilter !== defaultViewState.sourceFilter) {
    const opt = options.sourceOptions.find((o) => o.value === view.sourceFilter);
    if (opt) chips.push({ key: "source", label: opt.label });
  }

  if (view.statusFilter !== defaultViewState.statusFilter) {
    const opt = options.statusOptions.find((o) => o.value === view.statusFilter);
    if (opt) chips.push({ key: "status", label: opt.label });
  }

  if (view.overrideFilter !== defaultViewState.overrideFilter) {
    const opt = options.overrideOptions.find((o) => o.value === view.overrideFilter);
    if (opt) chips.push({ key: "override", label: opt.label });
  }

  if (view.issueFilter !== defaultViewState.issueFilter) {
    const opt = options.issueOptions.find((o) => o.value === view.issueFilter);
    if (opt) chips.push({ key: "issue", label: opt.label });
  }

  if (view.fileFilter !== defaultViewState.fileFilter) {
    chips.push({ key: "file", label: view.fileFilter });
  }

  if (view.sortBy !== defaultViewState.sortBy) {
    const opt = options.sortOptions.find((o) => o.value === view.sortBy);
    if (opt) chips.push({ key: "sort", label: opt.label });
  }

  return chips;
}
