import { nextTick } from "vue";

import { resolveWindowSize } from "./calculation";
import type { createCommandPanelExitCoordinator } from "./commandPanelExit";
import type { FlowPanelPreparedGate, WindowSizingState } from "./controllerState";
import type { UseWindowSizingOptions } from "./model";
import { measureFlowPanelMinHeight } from "./panelMeasurement";
import { lockFlowPanelHeight } from "./panelHeightSession";
import {
  createPanelHeightSessionView,
  resolveFlowPanelRevealTargetHeight,
  syncPanelHeightSessions
} from "./sessionCoordinator";
import { applyWindowSize, resolveShellDragStripHeightFromDom } from "./windowSync";

interface CreateFlowRevealCoordinatorInput {
  options: UseWindowSizingOptions;
  state: WindowSizingState;
  flowPanelPreparedGate: FlowPanelPreparedGate;
  commandPanelExit: ReturnType<typeof createCommandPanelExitCoordinator>;
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
    const version = gate.version;
    gate.promise = new Promise<void>((resolve) => {
      gate.resolve = () => {
        if (gate.version !== version) {
          resolve();
          return;
        }
        gate.prepared = true;
        gate.promise = null;
        gate.resolve = null;
        gate.reject = null;
        resolve();
      };
      gate.reject = () => {
        if (gate.version !== version) {
          resolve();
          return;
        }
        gate.promise = null;
        gate.resolve = null;
        gate.reject = null;
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

export function createFlowRevealCoordinator(input: CreateFlowRevealCoordinatorInput) {
  const { options, state, flowPanelPreparedGate, commandPanelExit } = input;

  return {
    async prepare(): Promise<void> {
      const prepareVersion = flowPanelPreparedGate.version;
      if (options.isSettingsWindow.value || !options.stagingExpanded.value) {
        return;
      }

      syncPanelHeightSessions(options, state, commandPanelExit.snapshot().phase);
      if (!state.flowPanelActive) {
        return;
      }

      await waitForFlowPanelPrepared(options, flowPanelPreparedGate);
      if (
        prepareVersion !== flowPanelPreparedGate.version ||
        options.isSettingsWindow.value ||
        !options.stagingExpanded.value ||
        !state.flowPanelActive
      ) {
        return;
      }

      const measuredMinHeight = await measureFlowPanelMinHeightForReveal(options);
      if (
        prepareVersion !== flowPanelPreparedGate.version ||
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
    },
    notifyPrepared(): void {
      flowPanelPreparedGate.prepared = true;
      flowPanelPreparedGate.resolve?.();
    }
  };
}
