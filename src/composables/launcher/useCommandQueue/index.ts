import { computed, ref } from "vue";
import { createDrawerActions } from "./drawer";
import { createFocusAndReorderActions } from "./focus";
import { bindDrawerGuards, bindQueueGuards } from "./guards";
import type {
  QueuedCommandLike,
  QueuePanelState,
  UseCommandQueueOptions,
  UseCommandQueueResult
} from "./model";

export function useCommandQueue<T extends QueuedCommandLike>(
  options: UseCommandQueueOptions<T>
): UseCommandQueueResult {
  const focusZone = ref<"search" | "queue">("search");
  const queueActiveIndex = ref(0);
  const queuePanelState = ref<QueuePanelState>("closed");
  const queueOpen = computed(() => queuePanelState.value !== "closed");

  const drawer = createDrawerActions({
    options,
    queuePanelState
  });
  const focusAndReorder = createFocusAndReorderActions({
    options,
    focusZone,
    queueActiveIndex,
    queueOpen,
    queuedCommands: options.queuedCommands,
    openQueuePanel: drawer.openQueuePanel
  });

  bindQueueGuards({
    options,
    focusZone,
    queueActiveIndex,
    queuePanelState,
    queuedCommands: options.queuedCommands
  });
  bindDrawerGuards({
    options,
    focusZone,
    queuePanelState
  });

  return {
    focusZone,
    queueActiveIndex,
    queuePanelState,
    queueOpen,
    clearQueueTransitionTimer: drawer.clearQueueTransitionTimer,
    openQueuePanel: drawer.openQueuePanel,
    closeQueuePanel: drawer.closeQueuePanel,
    toggleQueue: drawer.toggleQueue,
    switchFocusZone: focusAndReorder.switchFocusZone,
    moveQueuedCommand: focusAndReorder.moveQueuedCommand,
    onQueueDragStart: focusAndReorder.onQueueDragStart,
    onQueueDragOver: focusAndReorder.onQueueDragOver,
    onQueueDragEnd: focusAndReorder.onQueueDragEnd,
    onFocusQueueIndex: focusAndReorder.onFocusQueueIndex
  };
}

export type {
  FocusZone,
  QueuedCommandLike,
  QueuePanelState,
  UseCommandQueueOptions,
  UseCommandQueueResult
} from "./model";
