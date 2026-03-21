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
import {
  lockSettledPanelHeights,
  syncPanelHeightSessions,
  type WindowSizingSessionState
} from "./sessionCoordinator";
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

function createWindowSizingState(options: UseWindowSizingOptions): WindowSizingState {
  const pendingCommandActive =
    options.pendingCommand.value !== null &&
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
        options.constants.paramOverlayMinHeight;
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

  /** 缓动动画路径，用于 watcher 触发的响应式更新。 */
  const scheduleWindowSync = (): void => {
    void syncWindowSize();
  };
  const syncWindowSizeCore = createSyncWindowSizeCore(
    options,
    state,
    commandPanelExit,
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
    requestCommandPanelExit,
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
