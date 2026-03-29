import type { Ref } from "vue";
import type { QueuedCommandLike, QueuePanelState, UseCommandQueueOptions } from "./model";

export function createDrawerActions<T extends QueuedCommandLike>(deps: {
  options: UseCommandQueueOptions<T>;
  queuePanelState: Ref<QueuePanelState>;
}): {
  clearQueueTransitionTimer: () => void;
  openQueuePanel: () => void;
  closeQueuePanel: () => void;
  toggleQueue: () => void;
} {
  const { options, queuePanelState } = deps;
  let stagingStateTimer: ReturnType<typeof setTimeout> | null = null;
  let openGeneration = 0;

  function clearQueueTransitionTimer(): void {
    if (!stagingStateTimer) {
      return;
    }
    clearTimeout(stagingStateTimer);
    stagingStateTimer = null;
  }

  function setQueuePanelState(next: QueuePanelState): void {
    queuePanelState.value = next;
    options.onPanelStateChanged?.(next);
  }

  async function runOpenQueuePanel(currentGeneration: number): Promise<void> {
    setQueuePanelState("preparing");
    await Promise.resolve();
    if (openGeneration !== currentGeneration || queuePanelState.value !== "preparing") {
      return;
    }

    setQueuePanelState("resizing");
    await options.preparePanelReveal?.();
    if (
      openGeneration !== currentGeneration ||
      (queuePanelState.value !== "preparing" && queuePanelState.value !== "resizing")
    ) {
      return;
    }

    setQueuePanelState("opening");
    stagingStateTimer = setTimeout(() => {
      if (openGeneration === currentGeneration && queuePanelState.value === "opening") {
        setQueuePanelState("open");
      }
      stagingStateTimer = null;
    }, options.transitionMs);
  }

  function openQueuePanel(): void {
    if (
      queuePanelState.value === "preparing" ||
      queuePanelState.value === "resizing" ||
      queuePanelState.value === "opening" ||
      queuePanelState.value === "open"
    ) {
      return;
    }

    const currentGeneration = ++openGeneration;
    clearQueueTransitionTimer();
    void runOpenQueuePanel(currentGeneration);
  }

  function closeQueuePanel(): void {
    if (queuePanelState.value === "closed" || queuePanelState.value === "closing") {
      return;
    }

    openGeneration += 1;
    clearQueueTransitionTimer();
    setQueuePanelState("closing");
    stagingStateTimer = setTimeout(() => {
      if (queuePanelState.value === "closing") {
        setQueuePanelState("closed");
        options.scheduleSearchInputFocus(false);
      }
      stagingStateTimer = null;
    }, options.transitionMs);
  }

  function toggleQueue(): void {
    if (queuePanelState.value !== "closed" && queuePanelState.value !== "closing") {
      closeQueuePanel();
      return;
    }
    openQueuePanel();
  }

  return {
    clearQueueTransitionTimer,
    openQueuePanel,
    closeQueuePanel,
    toggleQueue
  };
}
