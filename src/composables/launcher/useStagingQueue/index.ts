import { computed, ref } from "vue";
import { createDrawerActions } from "./drawer";
import { createFocusAndReorderActions } from "./focus";
import { bindDrawerGuards, bindQueueGuards } from "./guards";
import type { StagedCommandLike, UseStagingQueueOptions, UseStagingQueueResult } from "./model";

export function useStagingQueue<T extends StagedCommandLike>(
  options: UseStagingQueueOptions<T>
): UseStagingQueueResult {
  const focusZone = ref<"search" | "staging">("search");
  const stagingActiveIndex = ref(0);
  const stagingDrawerState = ref<"closed" | "opening" | "open" | "closing">("closed");
  const stagingExpanded = computed(() => stagingDrawerState.value !== "closed");

  const drawer = createDrawerActions({
    options,
    stagingDrawerState
  });
  const focusAndReorder = createFocusAndReorderActions({
    options,
    focusZone,
    stagingActiveIndex,
    stagingExpanded,
    stagedCommands: options.stagedCommands,
    openStagingDrawer: drawer.openStagingDrawer
  });

  bindQueueGuards({
    options,
    focusZone,
    stagingActiveIndex,
    stagingDrawerState,
    stagedCommands: options.stagedCommands
  });
  bindDrawerGuards({
    options,
    focusZone,
    stagingDrawerState
  });

  return {
    focusZone,
    stagingActiveIndex,
    stagingDrawerState,
    stagingExpanded,
    clearStagingTransitionTimer: drawer.clearStagingTransitionTimer,
    openStagingDrawer: drawer.openStagingDrawer,
    closeStagingDrawer: drawer.closeStagingDrawer,
    toggleStaging: drawer.toggleStaging,
    switchFocusZone: focusAndReorder.switchFocusZone,
    moveStagedCommand: focusAndReorder.moveStagedCommand,
    onStagingDragStart: focusAndReorder.onStagingDragStart,
    onStagingDragOver: focusAndReorder.onStagingDragOver,
    onStagingDragEnd: focusAndReorder.onStagingDragEnd,
    onFocusStagingIndex: focusAndReorder.onFocusStagingIndex
  };
}

export type {
  FocusZone,
  StagedCommandLike,
  StagingDrawerState,
  UseStagingQueueOptions,
  UseStagingQueueResult
} from "./model";
