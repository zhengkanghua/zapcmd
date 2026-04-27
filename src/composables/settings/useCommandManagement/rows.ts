import { computed, getCurrentScope, onScopeDispose, ref, watch, type Ref } from "vue";
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

type FrameScheduler = (callback: FrameRequestCallback) => number;
type FrameCanceler = (handle: number) => void;

function getDefaultFrameScheduler(): FrameScheduler {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    return (callback) => window.requestAnimationFrame(callback);
  }
  return (callback) => setTimeout(() => callback(0), 0) as unknown as number;
}

function getDefaultFrameCanceler(): FrameCanceler {
  if (typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function") {
    return (handle) => window.cancelAnimationFrame(handle);
  }
  return (handle) => clearTimeout(handle);
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

    const filtered = rows.value.filter((row) => matchesViewFilters(row, view, query));
    if (view.sortBy === "default") {
      return filtered;
    }

    return filtered.slice().sort((left, right) => compareRows(left, right, view.sortBy));
  });
}

export function createVisibleRowsWindow(
  rows: Readonly<Ref<CommandManagementRow[]>>
) {
  const renderedCommandRowCount = ref(0);
  const scheduleFrame = getDefaultFrameScheduler();
  const cancelFrame = getDefaultFrameCanceler();
  let pendingFrameHandle: number | null = null;

  function cancelDeferredAdvance(): void {
    if (pendingFrameHandle === null) {
      return;
    }
    cancelFrame(pendingFrameHandle);
    pendingFrameHandle = null;
  }

  function resetVisibleCommandRows(): void {
    cancelDeferredAdvance();
    renderedCommandRowCount.value = Math.min(
      rows.value.length,
      COMMAND_ROWS_INITIAL_RENDER_LIMIT
    );
  }

  function advanceVisibleCommandRows(): void {
    renderedCommandRowCount.value = Math.min(
      rows.value.length,
      renderedCommandRowCount.value + COMMAND_ROWS_RENDER_CHUNK_SIZE
    );
  }

  function scheduleVisibleCommandRowsHydration(): void {
    cancelDeferredAdvance();
    if (renderedCommandRowCount.value >= rows.value.length) {
      return;
    }

    pendingFrameHandle = scheduleFrame(() => {
      pendingFrameHandle = null;
      advanceVisibleCommandRows();
      if (renderedCommandRowCount.value < rows.value.length) {
        scheduleVisibleCommandRowsHydration();
      }
    });
  }

  const visibleCommandRows = computed(() =>
    rows.value.slice(0, renderedCommandRowCount.value)
  );

  watch(
    rows,
    () => {
      resetVisibleCommandRows();
      scheduleVisibleCommandRowsHydration();
    },
    { immediate: true, flush: "sync" }
  );

  if (getCurrentScope()) {
    onScopeDispose(() => {
      cancelDeferredAdvance();
    });
  }

  return {
    renderedCommandRowCount,
    visibleCommandRows,
    advanceVisibleCommandRows,
    resetVisibleCommandRows,
    scheduleVisibleCommandRowsHydration,
    cancelDeferredAdvance
  };
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
