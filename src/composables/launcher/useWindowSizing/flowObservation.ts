export interface FlowObservationState {
  flowPanelObservationActive: boolean;
  flowPanelObservationIdleTimer: ReturnType<typeof setTimeout> | null;
  flowPanelObservationMaxTimer: ReturnType<typeof setTimeout> | null;
}

const FLOW_PANEL_OBSERVATION_IDLE_MS = 96;
const FLOW_PANEL_OBSERVATION_MAX_MS = 640;

export function createFlowObservationState(): FlowObservationState {
  return {
    flowPanelObservationActive: false,
    flowPanelObservationIdleTimer: null,
    flowPanelObservationMaxTimer: null
  };
}

function clearFlowPanelObservationIdleTimer(state: FlowObservationState): void {
  if (state.flowPanelObservationIdleTimer === null) {
    return;
  }

  clearTimeout(state.flowPanelObservationIdleTimer);
  state.flowPanelObservationIdleTimer = null;
}

function clearFlowPanelObservationMaxTimer(state: FlowObservationState): void {
  if (state.flowPanelObservationMaxTimer === null) {
    return;
  }

  clearTimeout(state.flowPanelObservationMaxTimer);
  state.flowPanelObservationMaxTimer = null;
}

export function stopFlowPanelObservation(state: FlowObservationState): void {
  state.flowPanelObservationActive = false;
  clearFlowPanelObservationIdleTimer(state);
  clearFlowPanelObservationMaxTimer(state);
}

export function refreshFlowPanelObservationIdleTimer(state: FlowObservationState): void {
  clearFlowPanelObservationIdleTimer(state);
  state.flowPanelObservationIdleTimer = setTimeout(() => {
    stopFlowPanelObservation(state);
  }, FLOW_PANEL_OBSERVATION_IDLE_MS);
}

export function beginFlowPanelObservation(state: FlowObservationState): void {
  stopFlowPanelObservation(state);
  state.flowPanelObservationActive = true;
  refreshFlowPanelObservationIdleTimer(state);
  state.flowPanelObservationMaxTimer = setTimeout(() => {
    stopFlowPanelObservation(state);
  }, FLOW_PANEL_OBSERVATION_MAX_MS);
}
