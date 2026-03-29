import { watch, type Ref } from "vue";
import type { FocusZone, StagedCommandLike, StagingDrawerState, UseStagingQueueOptions } from "./model";

export function bindQueueGuards<T extends StagedCommandLike>(deps: {
  options: UseStagingQueueOptions<T>;
  focusZone: Ref<FocusZone>;
  stagingActiveIndex: Ref<number>;
  stagingDrawerState: Ref<StagingDrawerState>;
  stagedCommands: Ref<T[]>;
}): void {
  watch(
    () => deps.stagedCommands.value.length,
    (length) => {
      if (length === 0 && deps.focusZone.value === "staging") {
        deps.stagingActiveIndex.value = 0;
        if (deps.stagingDrawerState.value === "closed") {
          deps.focusZone.value = "search";
          deps.options.scheduleSearchInputFocus(false);
        }
        return;
      }
      if (deps.stagingActiveIndex.value >= length) {
        deps.stagingActiveIndex.value = Math.max(0, length - 1);
      }
    }
  );
}

export function bindDrawerGuards<T extends StagedCommandLike>(deps: {
  options: UseStagingQueueOptions<T>;
  focusZone: Ref<FocusZone>;
  stagingDrawerState: Ref<StagingDrawerState>;
}): void {
  watch(deps.stagingDrawerState, (state) => {
    if (state !== "closed" && state !== "closing" && deps.focusZone.value === "search") {
      deps.focusZone.value = "staging";
    }
    if (state === "closed" && deps.focusZone.value === "staging") {
      deps.focusZone.value = "search";
      deps.options.scheduleSearchInputFocus(false);
    }
  });
}
