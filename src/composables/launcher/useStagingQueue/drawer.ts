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
  let openGeneration = 0;

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

  async function runOpenStagingDrawer(currentGeneration: number): Promise<void> {
    setStagingDrawerState("preparing");
    await Promise.resolve();
    if (openGeneration !== currentGeneration || stagingDrawerState.value !== "preparing") {
      return;
    }

    setStagingDrawerState("resizing");
    await options.prepareDrawerReveal?.();
    if (
      openGeneration !== currentGeneration ||
      (stagingDrawerState.value !== "preparing" && stagingDrawerState.value !== "resizing")
    ) {
      return;
    }

    setStagingDrawerState("opening");
    stagingStateTimer = setTimeout(() => {
      if (openGeneration === currentGeneration && stagingDrawerState.value === "opening") {
        setStagingDrawerState("open");
      }
      stagingStateTimer = null;
    }, options.transitionMs);
  }

  function openStagingDrawer(): void {
    if (
      stagingDrawerState.value === "preparing" ||
      stagingDrawerState.value === "resizing" ||
      stagingDrawerState.value === "opening" ||
      stagingDrawerState.value === "open"
    ) {
      return;
    }

    const currentGeneration = ++openGeneration;
    clearStagingTransitionTimer();
    void runOpenStagingDrawer(currentGeneration);
  }

  function closeStagingDrawer(): void {
    if (stagingDrawerState.value === "closed" || stagingDrawerState.value === "closing") {
      return;
    }

    openGeneration += 1;
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
    if (stagingDrawerState.value !== "closed" && stagingDrawerState.value !== "closing") {
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
