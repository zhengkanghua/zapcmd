import { watch, type Ref } from "vue";
import type { FocusZone, QueuedCommandLike, QueuePanelState, UseCommandQueueOptions } from "./model";

export function bindQueueGuards<T extends QueuedCommandLike>(deps: {
  options: UseCommandQueueOptions<T>;
  focusZone: Ref<FocusZone>;
  queueActiveIndex: Ref<number>;
  queuePanelState: Ref<QueuePanelState>;
  queuedCommands: Ref<T[]>;
}): void {
  watch(
    () => deps.queuedCommands.value.length,
    (length) => {
      if (length === 0 && deps.focusZone.value === "queue") {
        deps.queueActiveIndex.value = 0;
        if (deps.queuePanelState.value === "closed") {
          deps.focusZone.value = "search";
          deps.options.scheduleSearchInputFocus(false);
        }
        return;
      }
      if (deps.queueActiveIndex.value >= length) {
        deps.queueActiveIndex.value = Math.max(0, length - 1);
      }
    }
  );
}

export function bindDrawerGuards<T extends QueuedCommandLike>(deps: {
  options: UseCommandQueueOptions<T>;
  focusZone: Ref<FocusZone>;
  queuePanelState: Ref<QueuePanelState>;
}): void {
  watch(deps.queuePanelState, (state) => {
    if (state !== "closed" && state !== "closing" && deps.focusZone.value === "search") {
      deps.focusZone.value = "queue";
    }
    if (state === "closed" && deps.focusZone.value === "queue") {
      deps.focusZone.value = "search";
      deps.options.scheduleSearchInputFocus(false);
    }
  });
}
