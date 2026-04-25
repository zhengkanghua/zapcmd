import { nextTick } from "vue";

import { resolveWindowSize } from "./calculation";
import type { createCommandPanelExitCoordinator } from "./commandPanelExit";
import type { FlowPanelPreparedGate, WindowSizingState } from "./controllerState";
import type { UseWindowSizingOptions } from "./model";
import {
  lockSettledPanelHeights,
  syncPanelHeightSessions
} from "./sessionCoordinator";
import {
  applyWindowSize,
  handleSearchSettlingResize,
  resolveShellDragStripHeightFromDom,
  type ResizeBridge
} from "./windowSync";

interface CreateWindowSizingSyncInput {
  options: UseWindowSizingOptions;
  state: WindowSizingState;
  commandPanelExit: ReturnType<typeof createCommandPanelExitCoordinator>;
  flowPanelPreparedGate: FlowPanelPreparedGate;
  scheduleWindowSync: () => void;
}

function resetFlowPanelPreparedGate(gate: FlowPanelPreparedGate): void {
  const cancelWaiter = gate.reject ?? gate.resolve;
  cancelWaiter?.();
  gate.prepared = false;
  gate.promise = null;
  gate.resolve = null;
  gate.reject = null;
  gate.version += 1;
}

function beginWindowSync(
  options: UseWindowSizingOptions,
  state: WindowSizingState
): boolean {
  if (options.isSettingsWindow.value) {
    return false;
  }
  if (state.syncingWindowSize) {
    state.queuedWindowSync = true;
    return false;
  }

  state.syncingWindowSize = true;
  return true;
}

function finalizeWindowSync(
  state: WindowSizingState,
  scheduleWindowSync: () => void
): void {
  state.syncingWindowSize = false;
  if (!state.queuedWindowSync) {
    return;
  }
  state.queuedWindowSync = false;
  scheduleWindowSync();
}

export function createWindowSizingSync(input: CreateWindowSizingSyncInput) {
  const { options, state, commandPanelExit, flowPanelPreparedGate, scheduleWindowSync } = input;

  const run = async (bridge: ResizeBridge): Promise<void> => {
    if (!beginWindowSync(options, state)) {
      return;
    }

    await nextTick();
    try {
      const dragStripHeight = resolveShellDragStripHeightFromDom(options);
      const hadActiveFlowPanel = state.flowPanelActive;
      syncPanelHeightSessions(options, state, commandPanelExit.snapshot().phase);
      if (
        (!hadActiveFlowPanel && state.flowPanelActive) ||
        (hadActiveFlowPanel && !state.flowPanelActive)
      ) {
        resetFlowPanelPreparedGate(flowPanelPreparedGate);
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
      finalizeWindowSync(state, scheduleWindowSync);
    }
  };

  return {
    run,
    runAnimated: async (): Promise<void> => run(options.requestAnimateMainWindowSize),
    runImmediate: (): void => {
      void run(options.requestSetMainWindowSize);
    }
  };
}
