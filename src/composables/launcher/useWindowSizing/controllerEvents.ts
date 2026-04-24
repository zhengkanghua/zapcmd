import type { createCommandPanelExitCoordinator } from "./commandPanelExit";
import type { FlowPanelPreparedGate, WindowSizingState } from "./controllerState";
import {
  beginFlowPanelObservation,
  refreshFlowPanelObservationIdleTimer,
  stopFlowPanelObservation
} from "./flowObservation";

interface CreateWindowSizingEventsInput {
  state: WindowSizingState;
  commandPanelExit: ReturnType<typeof createCommandPanelExitCoordinator>;
  flowPanelPreparedGate: FlowPanelPreparedGate;
  scheduleWindowSync: () => void;
}

export function createWindowSizingEvents(input: CreateWindowSizingEventsInput) {
  const { state, commandPanelExit, flowPanelPreparedGate, scheduleWindowSync } = input;

  return {
    notifySearchPageSettled(): void {
      commandPanelExit.markSearchSettled();
      scheduleWindowSync();
    },
    notifyCommandPageSettled(): void {
      state.pendingCommandSettled = true;
      scheduleWindowSync();
    },
    notifyFlowPanelSettled(): void {
      state.flowPanelSettled = true;
      beginFlowPanelObservation(state);
      scheduleWindowSync();
    },
    notifyFlowPanelPrepared(): void {
      flowPanelPreparedGate.prepared = true;
      flowPanelPreparedGate.resolve?.();
    },
    notifyFlowPanelHeightChange(): void {
      if (!state.flowPanelActive || !state.flowPanelSettled || !state.flowPanelObservationActive) {
        return;
      }

      refreshFlowPanelObservationIdleTimer(state);
      scheduleWindowSync();
    },
    clearResizeTimer(): void {
      stopFlowPanelObservation(state);
    }
  };
}
