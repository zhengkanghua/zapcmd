import { nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from "vue";
import type { LauncherQueueReviewPanelProps } from "../../types";

const FLOW_PANEL_HEIGHT_OBSERVATION_IDLE_MS = 96;
const FLOW_PANEL_HEIGHT_OBSERVATION_MAX_MS = 640;

interface FlowPanelHeightObservationDeps {
  props: LauncherQueueReviewPanelProps;
  reviewPanelRef: Ref<HTMLElement | null>;
  focusActiveCardOrFallback: () => void;
  emitFlowPanelPrepared: () => void;
  emitFlowPanelHeightChange: () => void;
  emitFlowPanelSettled: () => void;
}

interface FlowPanelHeightObservationState {
  flowPanelPreparedEmitted: Ref<boolean>;
  flowPanelSettledEmitted: Ref<boolean>;
  observer: ResizeObserver | null;
  idleTimer: ReturnType<typeof setTimeout> | null;
  maxTimer: ReturnType<typeof setTimeout> | null;
  changeQueued: boolean;
}

function clearTimer(timer: ReturnType<typeof setTimeout> | null): ReturnType<typeof setTimeout> | null {
  if (timer !== null) {
    clearTimeout(timer);
  }
  return null;
}

function stopFlowPanelHeightObservation(state: FlowPanelHeightObservationState): void {
  state.idleTimer = clearTimer(state.idleTimer);
  state.maxTimer = clearTimer(state.maxTimer);
  state.observer?.disconnect();
  state.observer = null;
  state.changeQueued = false;
}

function scheduleFlowPanelHeightChangeEmit(
  state: FlowPanelHeightObservationState,
  deps: FlowPanelHeightObservationDeps
): void {
  if (state.changeQueued || deps.props.queuePanelState !== "open") {
    return;
  }
  state.changeQueued = true;
  void Promise.resolve().then(() => {
    state.changeQueued = false;
    if (deps.props.queuePanelState !== "open" || state.observer === null) {
      return;
    }
    deps.emitFlowPanelHeightChange();
  });
}

function refreshFlowPanelHeightIdleTimer(state: FlowPanelHeightObservationState): void {
  state.idleTimer = clearTimer(state.idleTimer);
  state.idleTimer = setTimeout(() => {
    stopFlowPanelHeightObservation(state);
  }, FLOW_PANEL_HEIGHT_OBSERVATION_IDLE_MS);
}

function resolveFlowPanelHeightObservationTargets(panel: HTMLElement | null): HTMLElement[] {
  if (!panel) {
    return [];
  }

  const targets: HTMLElement[] = [];
  const header = panel.querySelector<HTMLElement>(".flow-panel__header");
  const footer = panel.querySelector<HTMLElement>(".flow-panel__footer");
  if (header) {
    targets.push(header);
  }
  if (footer) {
    targets.push(footer);
  }

  const emptyState = panel.querySelector<HTMLElement>(".flow-panel__empty");
  if (emptyState) {
    targets.push(emptyState);
    return targets;
  }

  const listItems = Array.from(panel.querySelectorAll<HTMLElement>(".flow-panel__list-item")).slice(0, 2);
  targets.push(...listItems);
  return targets;
}

function bindFlowPanelHeightObservationTargets(
  state: FlowPanelHeightObservationState,
  reviewPanelRef: Ref<HTMLElement | null>
): void {
  if (!state.observer) {
    return;
  }
  state.observer.disconnect();
  for (const target of resolveFlowPanelHeightObservationTargets(reviewPanelRef.value)) {
    state.observer.observe(target);
  }
}

function beginFlowPanelHeightObservation(
  state: FlowPanelHeightObservationState,
  deps: FlowPanelHeightObservationDeps
): void {
  stopFlowPanelHeightObservation(state);
  if (deps.props.queuePanelState !== "open" || typeof ResizeObserver !== "function") {
    return;
  }

  state.observer = new ResizeObserver(() => {
    if (deps.props.queuePanelState !== "open") {
      return;
    }
    scheduleFlowPanelHeightChangeEmit(state, deps);
    refreshFlowPanelHeightIdleTimer(state);
  });
  bindFlowPanelHeightObservationTargets(state, deps.reviewPanelRef);
  refreshFlowPanelHeightIdleTimer(state);
  state.maxTimer = setTimeout(() => {
    stopFlowPanelHeightObservation(state);
  }, FLOW_PANEL_HEIGHT_OBSERVATION_MAX_MS);
}

async function refreshFlowPanelHeightObservationTargets(
  state: FlowPanelHeightObservationState,
  deps: FlowPanelHeightObservationDeps,
  emitChange = false
): Promise<void> {
  if (!state.observer || deps.props.queuePanelState !== "open") {
    return;
  }

  await nextTick();
  if (!state.observer || deps.props.queuePanelState !== "open") {
    return;
  }

  bindFlowPanelHeightObservationTargets(state, deps.reviewPanelRef);
  if (emitChange) {
    refreshFlowPanelHeightIdleTimer(state);
    scheduleFlowPanelHeightChangeEmit(state, deps);
  }
}

async function emitFlowPanelSettledOnce(
  state: FlowPanelHeightObservationState,
  deps: FlowPanelHeightObservationDeps
): Promise<void> {
  if (state.flowPanelSettledEmitted.value) {
    return;
  }

  await nextTick();
  if (state.flowPanelSettledEmitted.value || deps.props.queuePanelState !== "open") {
    return;
  }

  state.flowPanelSettledEmitted.value = true;
  deps.emitFlowPanelSettled();
  beginFlowPanelHeightObservation(state, deps);
}

async function emitFlowPanelPreparedOnce(
  state: FlowPanelHeightObservationState,
  deps: FlowPanelHeightObservationDeps
): Promise<void> {
  if (state.flowPanelPreparedEmitted.value) {
    return;
  }

  await nextTick();
  if (
    state.flowPanelPreparedEmitted.value ||
    (deps.props.queuePanelState !== "preparing" &&
      deps.props.queuePanelState !== "resizing")
  ) {
    return;
  }

  state.flowPanelPreparedEmitted.value = true;
  deps.emitFlowPanelPrepared();
}

export function useFlowPanelHeightObservation(deps: FlowPanelHeightObservationDeps) {
  const state: FlowPanelHeightObservationState = {
    flowPanelPreparedEmitted: ref(false),
    flowPanelSettledEmitted: ref(false),
    observer: null,
    idleTimer: null,
    maxTimer: null,
    changeQueued: false
  };

  watch(
    () => deps.props.queuePanelState,
    async (stateName) => {
      if (stateName !== "opening" && stateName !== "open") {
        return;
      }
      await nextTick();
      deps.focusActiveCardOrFallback();
    },
    { immediate: true }
  );

  watch(
    () => deps.props.queuePanelState,
    (stage, previousStage) => {
      if (stage === "preparing" || stage === "resizing") {
        state.flowPanelSettledEmitted.value = false;
        stopFlowPanelHeightObservation(state);
        void emitFlowPanelPreparedOnce(state, deps);
        return;
      }

      if (stage === "closed") {
        state.flowPanelPreparedEmitted.value = false;
      }

      if (stage !== "open") {
        state.flowPanelSettledEmitted.value = false;
        stopFlowPanelHeightObservation(state);
        return;
      }

      if (previousStage !== "open") {
        void emitFlowPanelSettledOnce(state, deps);
      }
    }
  );

  watch(
    () => deps.props.queuedCommands.slice(0, 2).map((cmd) => cmd.id).join("|"),
    () => {
      if (deps.props.queuePanelState === "open") {
        void refreshFlowPanelHeightObservationTargets(state, deps, true);
      }
    }
  );

  onMounted(() => {
    if (
      deps.props.queuePanelState === "preparing" ||
      deps.props.queuePanelState === "resizing"
    ) {
      state.flowPanelPreparedEmitted.value = false;
      void emitFlowPanelPreparedOnce(state, deps);
      return;
    }
    if (deps.props.queuePanelState === "open") {
      state.flowPanelSettledEmitted.value = false;
      void emitFlowPanelSettledOnce(state, deps);
    }
  });

  onBeforeUnmount(() => {
    stopFlowPanelHeightObservation(state);
  });

  return {
    stopFlowPanelHeightObservation: () => stopFlowPanelHeightObservation(state)
  };
}
