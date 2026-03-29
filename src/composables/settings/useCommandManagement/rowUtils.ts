import { getCurrentLocale } from "../../../i18n";
import type {
  CommandManagementRow,
  CommandManagementViewState,
  CommandSortBy
} from "../../../features/settings/types";
import type { CommandManagementIndexedRow } from "./rows";

export function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

export function toSourceFileLabel(sourcePath: string): string {
  const normalized = sourcePath.replaceAll("\\", "/");
  const last = normalized.split("/").filter((item) => item.length > 0).pop();
  return last ?? sourcePath;
}

export function matchesQuery(row: CommandManagementIndexedRow, query: string): boolean {
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

export function compareRows(
  left: CommandManagementRow,
  right: CommandManagementRow,
  sortBy: CommandSortBy
): number {
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

export function matchesViewFilters(
  row: CommandManagementIndexedRow,
  view: CommandManagementViewState,
  query: string
): boolean {
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
}
