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
  gate.prepared = false;
  gate.promise = null;
  gate.resolve = null;
}

export function createWindowSizingSync(input: CreateWindowSizingSyncInput) {
  const { options, state, commandPanelExit, flowPanelPreparedGate, scheduleWindowSync } = input;

  const run = async (bridge: ResizeBridge): Promise<void> => {
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
      state.syncingWindowSize = false;
      if (state.queuedWindowSync) {
        state.queuedWindowSync = false;
        scheduleWindowSync();
      }
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
