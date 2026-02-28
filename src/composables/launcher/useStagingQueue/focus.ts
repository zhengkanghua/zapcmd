import { nextTick, ref, type Ref } from "vue";
import type { FocusZone, StagedCommandLike, UseStagingQueueOptions } from "./model";

function ensureActiveStagingVisibleSoon(ensureVisible: () => void): void {
  void nextTick(() => ensureVisible());
}

function clampIndex(index: number, max: number): number {
  return Math.max(0, Math.min(index, max));
}

export function createFocusAndReorderActions<T extends StagedCommandLike>(deps: {
  options: UseStagingQueueOptions<T>;
  focusZone: Ref<FocusZone>;
  stagingActiveIndex: Ref<number>;
  stagingExpanded: Readonly<Ref<boolean>>;
  stagedCommands: Ref<T[]>;
  openStagingDrawer: () => void;
}): {
  switchFocusZone: () => void;
  moveStagedCommand: (fromIndex: number, toIndex: number) => void;
  onStagingDragStart: (index: number, event: DragEvent) => void;
  onStagingDragOver: (index: number, event: DragEvent) => void;
  onStagingDragEnd: () => void;
  onFocusStagingIndex: (index: number) => void;
} {
  const {
    options,
    focusZone,
    stagingActiveIndex,
    stagingExpanded,
    stagedCommands,
    openStagingDrawer
  } = deps;
  const draggingStagingIndex = ref<number | null>(null);

  function switchFocusZone(): void {
    if (!stagingExpanded.value) {
      focusZone.value = "search";
      options.scheduleSearchInputFocus(false);
      return;
    }
    if (focusZone.value === "search") {
      focusZone.value = "staging";
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      if (stagedCommands.value.length > 0) {
        stagingActiveIndex.value = clampIndex(stagingActiveIndex.value, stagedCommands.value.length - 1);
        ensureActiveStagingVisibleSoon(options.ensureActiveStagingVisible);
      }
      return;
    }

    focusZone.value = "search";
    options.scheduleSearchInputFocus(false);
  }

  function moveStagedCommand(fromIndex: number, toIndex: number): void {
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= stagedCommands.value.length ||
      toIndex >= stagedCommands.value.length ||
      fromIndex === toIndex
    ) {
      return;
    }
    const next = [...stagedCommands.value];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    stagedCommands.value = next;
    stagingActiveIndex.value = toIndex;
    ensureActiveStagingVisibleSoon(options.ensureActiveStagingVisible);
  }

  function onStagingDragStart(index: number, event: DragEvent): void {
    draggingStagingIndex.value = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
    }
  }

  function onStagingDragOver(index: number, event: DragEvent): void {
    event.preventDefault();
    if (draggingStagingIndex.value == null || draggingStagingIndex.value === index) {
      return;
    }
    moveStagedCommand(draggingStagingIndex.value, index);
    draggingStagingIndex.value = index;
  }

  function onStagingDragEnd(): void {
    draggingStagingIndex.value = null;
  }

  function onFocusStagingIndex(index: number): void {
    focusZone.value = "staging";
    stagingActiveIndex.value = index;
    if (!stagingExpanded.value) {
      openStagingDrawer();
    }
  }

  return {
    switchFocusZone,
    moveStagedCommand,
    onStagingDragStart,
    onStagingDragOver,
    onStagingDragEnd,
    onFocusStagingIndex
  };
}
