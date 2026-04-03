import { nextTick } from "vue";
import { resolveWindowSize, resolveWindowChromeHeight } from "./calculation";
import { createCommandPanelExitCoordinator } from "./commandPanelExit";
import {
  beginFlowPanelObservation,
  createFlowObservationState,
  refreshFlowPanelObservationIdleTimer,
  stopFlowPanelObservation
} from "./flowObservation";
import type { UseWindowSizingOptions } from "./model";
import { lockFlowPanelHeight } from "./panelHeightSession";
import {
  createPanelHeightSessionView,
  lockSettledPanelHeights,
  resolveFlowPanelRevealTargetHeight,
  syncPanelHeightSessions,
  type WindowSizingSessionState
} from "./sessionCoordinator";
import { measureFlowPanelMinHeight } from "./panelMeasurement";
import {
  applyWindowSize,
  handleSearchSettlingResize,
  resolveShellDragStripHeightFromDom,
  type ResizeBridge,
  type SearchSettlingState
} from "./windowSync";

interface WindowSizingState extends SearchSettlingState, WindowSizingSessionState {
  syncingWindowSize: boolean;
}

interface FlowPanelPreparedGate {
  prepared: boolean;
  promise: Promise<void> | null;
  resolve: (() => void) | null;
}

function isCommandPageOpen(options: UseWindowSizingOptions): boolean {
  return options.commandPageOpen?.value ?? (options.pendingCommand.value !== null);
}

function createWindowSizingState(options: UseWindowSizingOptions): WindowSizingState {
  const pendingCommandActive =
    isCommandPageOpen(options) &&
    (options.commandPanelInheritedHeight.value !== null ||
      options.commandPanelLockedHeight.value !== null);
  const flowPanelActive =
    options.stagingExpanded.value &&
    (options.flowPanelInheritedHeight.value !== null || options.flowPanelLockedHeight.value !== null);

  return {
    lastWindowSize: null,
    syncingWindowSize: false,
    queuedWindowSync: false,
    pendingCommandActive,
    flowPanelActive,
    pendingCommandSettled: pendingCommandActive && options.commandPanelLockedHeight.value !== null,
    flowPanelSettled: flowPanelActive && options.flowPanelLockedHeight.value !== null,
    ...createFlowObservationState()
  };
}

function createSyncWindowSizeCore(
  options: UseWindowSizingOptions,
  state: WindowSizingState,
  commandPanelExit: ReturnType<typeof createCommandPanelExitCoordinator>,
  flowPanelPreparedGate: FlowPanelPreparedGate,
  scheduleWindowSync: () => void
) {
  return async function syncWindowSizeCore(bridge: ResizeBridge): Promise<void> {
    if (options.isSettingsWindow.value) {
      return;
    }
    if (state.syncingWindowSize) {
      state.queuedWindowSync = true;
      return;
    }

    state.syncingWindowSize = true;
    await nextTick();
    try {
      const dragStripHeight = resolveShellDragStripHeightFromDom(options);
      const hadActiveFlowPanel = state.flowPanelActive;
      syncPanelHeightSessions(options, state, commandPanelExit.snapshot().phase);
      if ((!hadActiveFlowPanel && state.flowPanelActive) || (hadActiveFlowPanel && !state.flowPanelActive)) {
        flowPanelPreparedGate.prepared = false;
        flowPanelPreparedGate.promise = null;
        flowPanelPreparedGate.resolve = null;
      }
      lockSettledPanelHeights(options, state, dragStripHeight);
      const preferWindowHeightForLauncherFrame =
        options.stagingExpanded.value || hadActiveFlowPanel;
      if (
        await handleSearchSettlingResize(
          options,
          state,
          commandPanelExit,
          bridge,
          dragStripHeight
        )
      ) {
        return;
      }

      const commandPanelExitFrameHeightLock = commandPanelExit.snapshot().lockedExitFrameHeight;
      await applyWindowSize(
        options,
        state,
        bridge,
        resolveWindowSize(options, { commandPanelExitFrameHeightLock }),
        {
          frameHeightLock: commandPanelExitFrameHeightLock,
          preferWindowHeight: preferWindowHeightForLauncherFrame
        }
      );
    } finally {
      state.syncingWindowSize = false;
      if (state.queuedWindowSync) {
        state.queuedWindowSync = false;
        scheduleWindowSync();
      }
    }
  };
}

async function waitForFlowPanelPrepared(
  options: UseWindowSizingOptions,
  gate: FlowPanelPreparedGate
): Promise<void> {
  if (options.stagingPanelRef.value) {
    gate.prepared = true;
    return;
  }
  if (gate.prepared) {
    return;
  }
  if (gate.promise === null) {
    gate.promise = new Promise<void>((resolve) => {
      gate.resolve = () => {
        gate.prepared = true;
        gate.promise = null;
        gate.resolve = null;
        resolve();
      };
    });
  }
  await gate.promise;
}

async function measureFlowPanelMinHeightForReveal(
  options: UseWindowSizingOptions
): Promise<number | null> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const panel = options.stagingPanelRef.value;
    const measuredMinHeight = panel ? measureFlowPanelMinHeight(panel) : null;
    if (Number.isFinite(measuredMinHeight) && (measuredMinHeight ?? 0) > 0) {
      return measuredMinHeight as number;
    }
    await nextTick();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }

  return null;
}

function createRequestCommandPanelExit(
  options: UseWindowSizingOptions,
  state: WindowSizingState,
  commandPanelExit: ReturnType<typeof createCommandPanelExitCoordinator>
) {
  return function requestCommandPanelExit(): void {
    const dragStripHeight = resolveShellDragStripHeightFromDom(options);
    const lockedFrameHeight = state.lastWindowSize
      ? Math.max(0, state.lastWindowSize.height - resolveWindowChromeHeight(dragStripHeight))
      : options.commandPanelLockedHeight.value ??
        options.commandPanelInheritedHeight.value ??
        options.constants.commandPageMinHeight;
    commandPanelExit.beginExit(lockedFrameHeight);
  };
}

function createOnAppFocused(
  options: UseWindowSizingOptions,
  syncWindowSizeImmediate: () => void
) {
  return function onAppFocused(): void {
    if (options.isSettingsWindow.value) {
      return;
    }

    options.loadSettings();
    syncWindowSizeImmediate();
    options.scheduleSearchInputFocus(true);
  };
}

export function createWindowSizingController(options: UseWindowSizingOptions) {
  const state = createWindowSizingState(options);
  const commandPanelExit = createCommandPanelExitCoordinator();
  const flowPanelPreparedGate: FlowPanelPreparedGate = {
    prepared: false,
    promise: null,
    resolve: null
  };

  /** 缓动动画路径，用于 watcher 触发的响应式更新。 */
  const scheduleWindowSync = (): void => {
    void syncWindowSize();
  };
  const syncWindowSizeCore = createSyncWindowSizeCore(
    options,
    state,
    commandPanelExit,
    flowPanelPreparedGate,
    scheduleWindowSync
  );
  async function syncWindowSize(): Promise<void> {
    return syncWindowSizeCore(options.requestAnimateMainWindowSize);
  }

  /** 即时跳转路径，用于聚焦校准等无动画场景。 */
  function syncWindowSizeImmediate(): void {
    void syncWindowSizeCore(options.requestSetMainWindowSize);
  }

  const requestCommandPanelExit = createRequestCommandPanelExit(
    options,
    state,
    commandPanelExit
  );

  async function prepareFlowPanelReveal(): Promise<void> {
    if (options.isSettingsWindow.value || !options.stagingExpanded.value) {
      return;
    }

    syncPanelHeightSessions(options, state, commandPanelExit.snapshot().phase);
    if (!state.flowPanelActive) {
      return;
    }

    await waitForFlowPanelPrepared(options, flowPanelPreparedGate);

    const measuredMinHeight = await measureFlowPanelMinHeightForReveal(options);
    if (
      measuredMinHeight === null ||
      !Number.isFinite(measuredMinHeight) ||
      measuredMinHeight <= 0
    ) {
      return;
    }

    const dragStripHeight = resolveShellDragStripHeightFromDom(options);
    const resolvedFlowPanelHeight = resolveFlowPanelRevealTargetHeight(
      options,
      dragStripHeight,
      measuredMinHeight
    );
    lockFlowPanelHeight(createPanelHeightSessionView(options), resolvedFlowPanelHeight);

    const commandPanelExitFrameHeightLock = commandPanelExit.snapshot().lockedExitFrameHeight;
    await applyWindowSize(
      options,
      state,
      options.requestResizeMainWindowForReveal,
      resolveWindowSize(options, { commandPanelExitFrameHeightLock }),
      {
        frameHeightLock: commandPanelExitFrameHeightLock,
        preferWindowHeight: true
      }
    );
  }

  const notifySearchPageSettled = (): void => {
    commandPanelExit.markSearchSettled();
    scheduleWindowSync();
  };
  const notifyCommandPageSettled = (): void => {
    state.pendingCommandSettled = true;
    scheduleWindowSync();
  };
  const notifyFlowPanelSettled = (): void => {
    state.flowPanelSettled = true;
    beginFlowPanelObservation(state);
    scheduleWindowSync();
  };
  const notifyFlowPanelPrepared = (): void => {
    flowPanelPreparedGate.prepared = true;
    flowPanelPreparedGate.resolve?.();
  };
  const notifyFlowPanelHeightChange = (): void => {
    if (!state.flowPanelActive || !state.flowPanelSettled || !state.flowPanelObservationActive) {
      return;
    }

    refreshFlowPanelObservationIdleTimer(state);
    scheduleWindowSync();
  };
  const onViewportResize = scheduleWindowSync;
  const onAppFocused = createOnAppFocused(options, syncWindowSizeImmediate);

  /** 清理 FlowPanel 观察窗口定时器，避免窗口卸载后遗留异步回调。 */
  function clearResizeTimer(): void {
    stopFlowPanelObservation(state);
  }

  return {
    onViewportResize,
    onAppFocused,
    notifyFlowPanelPrepared,
    requestCommandPanelExit,
    prepareFlowPanelReveal,
    notifyCommandPageSettled,
    notifyFlowPanelHeightChange,
    notifyFlowPanelSettled,
    notifySearchPageSettled,
    scheduleWindowSync,
    syncWindowSize,
    syncWindowSizeImmediate,
    clearResizeTimer
  };
}
