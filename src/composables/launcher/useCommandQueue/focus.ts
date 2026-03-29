import { nextTick, ref, type Ref } from "vue";
import type { FocusZone, QueuedCommandLike, UseCommandQueueOptions } from "./model";

function ensureActiveStagingVisibleSoon(ensureVisible: () => void): void {
  void nextTick(() => ensureVisible());
}

function clampIndex(index: number, max: number): number {
  return Math.max(0, Math.min(index, max));
}

export function createFocusAndReorderActions<T extends QueuedCommandLike>(deps: {
  options: UseCommandQueueOptions<T>;
  focusZone: Ref<FocusZone>;
  queueActiveIndex: Ref<number>;
  queueOpen: Readonly<Ref<boolean>>;
  queuedCommands: Ref<T[]>;
  openQueuePanel: () => void;
}): {
  switchFocusZone: () => void;
  moveQueuedCommand: (fromIndex: number, toIndex: number) => void;
  onQueueDragStart: (index: number, event: DragEvent) => void;
  onQueueDragOver: (index: number, event: DragEvent) => void;
  onQueueDragEnd: () => void;
  onFocusQueueIndex: (index: number) => void;
} {
  const {
    options,
    focusZone,
    queueActiveIndex,
    queueOpen,
    queuedCommands,
    openQueuePanel
  } = deps;
  const draggingStagingIndex = ref<number | null>(null);

  function switchFocusZone(): void {
    if (!queueOpen.value) {
      focusZone.value = "search";
      options.scheduleSearchInputFocus(false);
      return;
    }
    if (focusZone.value === "search") {
      focusZone.value = "queue";
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      if (queuedCommands.value.length > 0) {
        queueActiveIndex.value = clampIndex(queueActiveIndex.value, queuedCommands.value.length - 1);
        ensureActiveStagingVisibleSoon(options.ensureActiveQueueVisible);
      }
      return;
    }

    focusZone.value = "search";
    options.scheduleSearchInputFocus(false);
  }

  function moveQueuedCommand(fromIndex: number, toIndex: number): void {
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= queuedCommands.value.length ||
      toIndex >= queuedCommands.value.length ||
      fromIndex === toIndex
    ) {
      return;
    }
    const next = [...queuedCommands.value];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    queuedCommands.value = next;
    queueActiveIndex.value = toIndex;
    ensureActiveStagingVisibleSoon(options.ensureActiveQueueVisible);
  }

  function onQueueDragStart(index: number, event: DragEvent): void {
    draggingStagingIndex.value = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
    }
  }

  function onQueueDragOver(index: number, event: DragEvent): void {
    event.preventDefault();
    if (draggingStagingIndex.value == null || draggingStagingIndex.value === index) {
      return;
    }
    moveQueuedCommand(draggingStagingIndex.value, index);
    draggingStagingIndex.value = index;
  }

  function onQueueDragEnd(): void {
    draggingStagingIndex.value = null;
  }

  function onFocusQueueIndex(index: number): void {
    focusZone.value = "queue";
    queueActiveIndex.value = index;
    if (!queueOpen.value) {
      openQueuePanel();
    }
  }

  return {
    switchFocusZone,
    moveQueuedCommand,
    onQueueDragStart,
    onQueueDragOver,
    onQueueDragEnd,
    onFocusQueueIndex
  };
}
