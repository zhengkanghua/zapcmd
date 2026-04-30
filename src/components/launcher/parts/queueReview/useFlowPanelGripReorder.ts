import { onBeforeUnmount, ref, type Ref } from "vue";
import type { LauncherQueueReviewPanelProps } from "../../types";

interface FlowPanelGripReorderDeps {
  props: LauncherQueueReviewPanelProps;
  reviewListRef: Ref<HTMLElement | null>;
  cancelInlineEdit: () => void;
  emitGripReorderActiveChange: (value: boolean) => void;
  emitStagingDragStart: (index: number, event: DragEvent) => void;
  emitStagingDragOver: (index: number, event: DragEvent) => void;
  emitStagingDragEnd: () => void;
}

interface FlowPanelGripReorderState {
  gripReorderActive: Ref<boolean>;
  draggingCommandId: Ref<string | null>;
  dragOverCommandId: Ref<string | null>;
  cleanup: (() => void) | null;
  previousBodyUserSelect: string;
}

function createSyntheticDragEvent(type: "dragstart" | "dragover"): DragEvent {
  if (typeof DragEvent === "function") {
    return new DragEvent(type);
  }

  return {
    preventDefault() {},
    dataTransfer: null
  } as unknown as DragEvent;
}

function resetDragIndicators(state: FlowPanelGripReorderState): void {
  state.draggingCommandId.value = null;
  state.dragOverCommandId.value = null;
}

function endGripReorder(state: FlowPanelGripReorderState, deps: FlowPanelGripReorderDeps): void {
  if (!state.gripReorderActive.value) {
    return;
  }
  state.gripReorderActive.value = false;
  deps.emitGripReorderActiveChange(false);
  if (typeof document !== "undefined") {
    document.body.style.userSelect = state.previousBodyUserSelect;
  }
  state.cleanup?.();
  state.cleanup = null;
  resetDragIndicators(state);
  deps.emitStagingDragEnd();
}

function maybeEmitGripReorder(
  state: FlowPanelGripReorderState,
  deps: FlowPanelGripReorderDeps,
  index: number,
  clientY: number,
  currentTarget: HTMLElement | null
): void {
  state.dragOverCommandId.value = deps.props.queuedCommands[index]?.id ?? null;

  const draggingId = state.draggingCommandId.value;
  if (!draggingId) {
    return;
  }

  const draggingIndex = deps.props.queuedCommands.findIndex((cmd) => cmd.id === draggingId);
  if (draggingIndex < 0 || draggingIndex === index) {
    return;
  }

  if (!currentTarget) {
    deps.emitStagingDragOver(index, createSyntheticDragEvent("dragover"));
    return;
  }

  const rect = currentTarget.getBoundingClientRect();
  const offsetY = clientY - rect.top;
  const midY = rect.height / 2;
  const buffer = Math.min(12, rect.height / 8);

  if (draggingIndex < index && offsetY < midY + buffer) {
    return;
  }
  if (draggingIndex > index && offsetY > midY - buffer) {
    return;
  }

  deps.emitStagingDragOver(index, createSyntheticDragEvent("dragover"));
}

function findGripTargetItem(
  reviewListRef: Ref<HTMLElement | null>,
  clientX: number,
  clientY: number
): HTMLElement | null {
  if (typeof document.elementFromPoint !== "function") {
    return null;
  }

  const hit = document.elementFromPoint(clientX, clientY);
  if (!(hit instanceof Element)) {
    return null;
  }

  const item = hit.closest<HTMLElement>(".flow-panel__list-item");
  if (!item || !(reviewListRef.value?.contains(item) ?? false)) {
    return null;
  }

  return item;
}

function createWindowGripMoveHandler(
  state: FlowPanelGripReorderState,
  deps: FlowPanelGripReorderDeps
) {
  return (event: MouseEvent): void => {
    if (!state.gripReorderActive.value) {
      return;
    }
    if ((event.buttons & 1) === 0) {
      endGripReorder(state, deps);
      return;
    }

    event.preventDefault();

    const currentTarget = findGripTargetItem(deps.reviewListRef, event.clientX, event.clientY);
    if (!currentTarget) {
      return;
    }

    const index = Number.parseInt(currentTarget.dataset.stagingIndex ?? "", 10);
    if (Number.isFinite(index) && index >= 0) {
      maybeEmitGripReorder(state, deps, index, event.clientY, currentTarget);
    }
  };
}

export function useFlowPanelGripReorder(deps: FlowPanelGripReorderDeps) {
  const state: FlowPanelGripReorderState = {
    gripReorderActive: ref(false),
    draggingCommandId: ref<string | null>(null),
    dragOverCommandId: ref<string | null>(null),
    cleanup: null,
    previousBodyUserSelect: ""
  };
  const onWindowGripMove = createWindowGripMoveHandler(state, deps);

  function startGripReorder(index: number, event: MouseEvent): void {
    if (event.button !== 0 || deps.props.executing) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    state.gripReorderActive.value = true;
    deps.emitGripReorderActiveChange(true);
    if (typeof document !== "undefined") {
      state.previousBodyUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = "none";
    }
    state.draggingCommandId.value = deps.props.queuedCommands[index]?.id ?? null;
    state.dragOverCommandId.value = state.draggingCommandId.value;
    deps.emitStagingDragStart(index, createSyntheticDragEvent("dragstart"));

    window.addEventListener("mousemove", onWindowGripMove);
    const onMouseUp = () => endGripReorder(state, deps);
    const onWindowBlur = () => endGripReorder(state, deps);
    window.addEventListener("mouseup", onMouseUp, { once: true });
    window.addEventListener("blur", onWindowBlur, { once: true });

    state.cleanup = () => {
      window.removeEventListener("mousemove", onWindowGripMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("blur", onWindowBlur);
    };
  }

  function onDragStartWithEditGuard(event: DragEvent, index: number): void {
    if (state.gripReorderActive.value || deps.props.executing) {
      event.preventDefault();
      return;
    }
    endGripReorder(state, deps);
    state.draggingCommandId.value = deps.props.queuedCommands[index]?.id ?? null;
    state.dragOverCommandId.value = state.draggingCommandId.value;
    deps.cancelInlineEdit();
    deps.emitStagingDragStart(index, event);
  }

  function onStagingDragOver(index: number, event: DragEvent): void {
    if (deps.props.executing) {
      event.preventDefault();
      return;
    }
    state.dragOverCommandId.value = deps.props.queuedCommands[index]?.id ?? null;
    deps.emitStagingDragOver(index, event);
  }

  function onDragEnd(): void {
    resetDragIndicators(state);
    deps.emitStagingDragEnd();
  }

  onBeforeUnmount(() => {
    endGripReorder(state, deps);
    resetDragIndicators(state);
  });

  return {
    gripReorderActive: state.gripReorderActive,
    draggingCommandId: state.draggingCommandId,
    dragOverCommandId: state.dragOverCommandId,
    startGripReorder,
    onDragStartWithEditGuard,
    onStagingDragOver,
    onDragEnd
  };
}
