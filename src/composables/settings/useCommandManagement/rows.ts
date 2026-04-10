import { computed, type Ref } from "vue";
import type { CommandTemplate } from "../../../features/commands/types";
import type {
  CommandManagementRow,
  CommandManagementSummary,
  CommandManagementViewState
} from "../../../features/settings/types";
import {
  compareRows,
  matchesViewFilters,
  normalizeText,
  toSourceFileLabel
} from "./rowUtils";

export const COMMAND_ROWS_INITIAL_RENDER_LIMIT = 120;
export const COMMAND_ROWS_RENDER_CHUNK_SIZE = 80;

interface CreateAllRowsOptions {
  allCommandTemplates: Readonly<Ref<CommandTemplate[]>>;
  disabledCommandIds: Readonly<Ref<string[]>>;
  commandSourceById: Readonly<Ref<Record<string, string>>>;
  userCommandSourceById: Readonly<Ref<Record<string, string>>>;
  overriddenCommandIds: Readonly<Ref<string[]>>;
  issueSourceIds: Readonly<Ref<string[]>>;
  issueCommandIds: Readonly<Ref<string[]>>;
}

export interface CommandManagementIndexedRow extends CommandManagementRow {
  normalizedSearchText: string;
}

export function createAllRows(options: CreateAllRowsOptions) {
  return computed<CommandManagementIndexedRow[]>(() => {
    const disabledSet = new Set(options.disabledCommandIds.value);
    const overriddenSet = new Set(options.overriddenCommandIds.value);
    const issueSourceSet = new Set(options.issueSourceIds.value);
    const issueCommandSet = new Set(options.issueCommandIds.value);

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
        hasLoadIssue:
          issueCommandSet.has(template.id) ||
          (Boolean(sourcePath) && issueSourceSet.has(sourcePath)),
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

export function createFilteredRows(
  rows: Readonly<Ref<CommandManagementIndexedRow[]>>,
  commandView: Readonly<Ref<CommandManagementViewState>>
) {
  return computed<CommandManagementRow[]>(() => {
    const view = commandView.value;
    const query = normalizeText(view.query);

    return rows.value
      .filter((row) => matchesViewFilters(row, view, query))
      .slice()
      .sort((left, right) => compareRows(left, right, view.sortBy));
  });
}

export function createSummary(rows: Readonly<Ref<CommandManagementIndexedRow[]>>) {
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
