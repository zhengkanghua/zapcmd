import { resolveWindowChromeHeight } from "./calculation";
import { createCommandPanelExitCoordinator } from "./commandPanelExit";
import { createWindowSizingEvents } from "./controllerEvents";
import {
  createWindowSizingState,
  type FlowPanelPreparedGate,
  type WindowSizingState
} from "./controllerState";
import { createWindowSizingSync } from "./controllerSync";
import { createFlowRevealCoordinator } from "./flowRevealCoordinator";
import type { UseWindowSizingOptions } from "./model";
import { resolveShellDragStripHeightFromDom } from "./windowSync";

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

    options.reloadSettings();
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
    resolve: null,
    reject: null,
    version: 0
  };

  /** 缓动动画路径，用于 watcher 触发的响应式更新。 */
  const scheduleWindowSync = (): void => {
    void syncWindowSize();
  };
  const windowSizingSync = createWindowSizingSync({
    options,
    state,
    commandPanelExit,
    flowPanelPreparedGate,
    scheduleWindowSync
  });
  async function syncWindowSize(): Promise<void> {
    return windowSizingSync.run(options.requestAnimateMainWindowSize);
  }

  /** 即时跳转路径，用于聚焦校准等无动画场景。 */
  function syncWindowSizeImmediate(): void {
    windowSizingSync.runImmediate();
  }

  const requestCommandPanelExit = createRequestCommandPanelExit(
    options,
    state,
    commandPanelExit
  );
  const flowRevealCoordinator = createFlowRevealCoordinator({
    options,
    state,
    flowPanelPreparedGate,
    commandPanelExit
  });
  const events = createWindowSizingEvents({
    state,
    commandPanelExit,
    flowPanelPreparedGate,
    scheduleWindowSync
  });
  const onViewportResize = scheduleWindowSync;
  const onAppFocused = createOnAppFocused(options, syncWindowSizeImmediate);

  return {
    onViewportResize,
    onAppFocused,
    notifyFlowPanelPrepared: events.notifyFlowPanelPrepared,
    requestCommandPanelExit,
    prepareFlowPanelReveal: flowRevealCoordinator.prepare,
    notifyCommandPageSettled: events.notifyCommandPageSettled,
    notifyFlowPanelHeightChange: events.notifyFlowPanelHeightChange,
    notifyFlowPanelSettled: events.notifyFlowPanelSettled,
    notifySearchPageSettled: events.notifySearchPageSettled,
    scheduleWindowSync,
    syncWindowSize,
    syncWindowSizeImmediate,
    clearResizeTimer: events.clearResizeTimer
  };
}
