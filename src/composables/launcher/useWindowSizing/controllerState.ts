import { createFlowObservationState } from "./flowObservation";
import type { UseWindowSizingOptions } from "./model";
import type { WindowSizingSessionState } from "./sessionCoordinator";
import type { SearchSettlingState } from "./windowSync";

export interface WindowSizingState extends SearchSettlingState, WindowSizingSessionState {
  syncingWindowSize: boolean;
}

export interface FlowPanelPreparedGate {
  prepared: boolean;
  promise: Promise<void> | null;
  resolve: (() => void) | null;
  reject: (() => void) | null;
  version: number;
}

function isCommandPageOpen(options: UseWindowSizingOptions): boolean {
  return options.commandPageOpen?.value ?? (options.pendingCommand.value !== null);
}

export function createWindowSizingState(options: UseWindowSizingOptions): WindowSizingState {
  const pendingCommandActive =
    isCommandPageOpen(options) &&
    (options.commandPanelInheritedHeight.value !== null ||
      options.commandPanelLockedHeight.value !== null);
  const flowPanelActive =
    options.stagingExpanded.value &&
    (options.flowPanelInheritedHeight.value !== null ||
      options.flowPanelLockedHeight.value !== null);

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
