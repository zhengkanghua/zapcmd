import type { Ref } from "vue";
import type { StagedCommandLike, StagingDrawerState, UseStagingQueueOptions } from "./model";

export function createDrawerActions<T extends StagedCommandLike>(deps: {
  options: UseStagingQueueOptions<T>;
  stagingDrawerState: Ref<StagingDrawerState>;
}): {
  clearStagingTransitionTimer: () => void;
  openStagingDrawer: () => void;
  closeStagingDrawer: () => void;
  toggleStaging: () => void;
} {
  const { options, stagingDrawerState } = deps;
  let stagingStateTimer: ReturnType<typeof setTimeout> | null = null;

  function clearStagingTransitionTimer(): void {
    if (!stagingStateTimer) {
      return;
    }
    clearTimeout(stagingStateTimer);
    stagingStateTimer = null;
  }

  function setStagingDrawerState(next: StagingDrawerState): void {
    stagingDrawerState.value = next;
    options.onDrawerStateChanged?.(next);
  }

  function openStagingDrawer(): void {
    if (stagingDrawerState.value === "open" || stagingDrawerState.value === "opening") {
      return;
    }
    clearStagingTransitionTimer();
    setStagingDrawerState("opening");
    stagingStateTimer = setTimeout(() => {
      if (stagingDrawerState.value === "opening") {
        setStagingDrawerState("open");
      }
      stagingStateTimer = null;
    }, options.transitionMs);
  }

  function closeStagingDrawer(): void {
    if (stagingDrawerState.value === "closed" || stagingDrawerState.value === "closing") {
      return;
    }
    clearStagingTransitionTimer();
    setStagingDrawerState("closing");
    stagingStateTimer = setTimeout(() => {
      if (stagingDrawerState.value === "closing") {
        setStagingDrawerState("closed");
        options.scheduleSearchInputFocus(false);
      }
      stagingStateTimer = null;
    }, options.transitionMs);
  }

  function toggleStaging(): void {
    if (stagingDrawerState.value === "open" || stagingDrawerState.value === "opening") {
      closeStagingDrawer();
      return;
    }
    openStagingDrawer();
  }

  return {
    clearStagingTransitionTimer,
    openStagingDrawer,
    closeStagingDrawer,
    toggleStaging
  };
}
