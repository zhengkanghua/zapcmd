import type { CommandPanelExitPhase } from "./commandPanelExit";
import { resolveWindowChromeHeight } from "./calculation";
import type { UseWindowSizingOptions } from "./model";
import { resolvePanelHeight } from "./panelHeightContract";
import {
  beginCommandPanelSession,
  beginFlowPanelSession,
  clearCommandPanelSession,
  clearFlowPanelSession,
  lockCommandPanelHeight,
  lockFlowPanelHeight,
  raiseFlowPanelHeight,
  type PanelHeightSession
} from "./panelHeightSession";
import {
  measureCommandPanelFullNaturalHeight,
  measureFlowPanelMinHeight,
  resolveCommandPanelMinHeight
} from "./panelMeasurement";
import { stopFlowPanelObservation, type FlowObservationState } from "./flowObservation";
import { SEARCH_CAPSULE_HEIGHT_PX } from "../useLauncherLayoutMetrics";

export interface WindowSizingSessionState extends FlowObservationState {
  pendingCommandActive: boolean;
  flowPanelActive: boolean;
  pendingCommandSettled: boolean;
  flowPanelSettled: boolean;
}

export function createPanelHeightSessionView(options: UseWindowSizingOptions): PanelHeightSession {
  return {
    commandPanelInheritedHeight: options.commandPanelInheritedHeight,
    commandPanelLockedHeight: options.commandPanelLockedHeight,
    flowPanelInheritedHeight: options.flowPanelInheritedHeight,
    flowPanelLockedHeight: options.flowPanelLockedHeight
  };
}

export function resolveSearchPanelEffectiveHeight(options: UseWindowSizingOptions): number {
  const effectiveHeight = options.searchPanelEffectiveHeight.value;
  if (Number.isFinite(effectiveHeight) && effectiveHeight > 0) {
    return effectiveHeight;
  }
  return SEARCH_CAPSULE_HEIGHT_PX;
}

/**
 * 解析当前左/右面板用于会话继承的“有效高度”。
 * Search 来源必须只认 searchPanelEffectiveHeight，避免 breathing 污染 Command / Flow 入口基线。
 */
export function resolveCurrentPanelEffectiveHeight(options: UseWindowSizingOptions): number {
  if (options.pendingCommand.value !== null) {
    return (
      options.commandPanelLockedHeight.value ??
      options.commandPanelInheritedHeight.value ??
      resolveSearchPanelEffectiveHeight(options)
    );
  }

  if (options.stagingExpanded.value) {
    return (
      options.flowPanelLockedHeight.value ??
      options.flowPanelInheritedHeight.value ??
      resolveSearchPanelEffectiveHeight(options)
    );
  }

  return resolveSearchPanelEffectiveHeight(options);
}

function resolveCommandPanelEntryHeight(options: UseWindowSizingOptions): number {
  return resolveSearchPanelEffectiveHeight(options);
}

export function resolveFrameMaxHeight(
  options: UseWindowSizingOptions,
  dragStripHeight: number
): number {
  const screenCapFrame = Math.max(
    0,
    options.windowHeightCap.value - resolveWindowChromeHeight(dragStripHeight)
  );
  return Math.min(screenCapFrame, options.sharedPanelMaxHeight.value);
}

export function resolveFlowPanelRevealTargetHeight(
  options: UseWindowSizingOptions,
  dragStripHeight: number,
  measuredMinHeight: number
): number {
  return resolvePanelHeight({
    panelMaxHeight: resolveFrameMaxHeight(options, dragStripHeight),
    inheritedPanelHeight:
      options.flowPanelInheritedHeight.value ?? options.constants.windowBaseHeight,
    panelMinHeight: measuredMinHeight
  });
}

export function syncPanelHeightSessions(
  options: UseWindowSizingOptions,
  state: WindowSizingSessionState,
  commandPanelExitPhase: CommandPanelExitPhase
): void {
  const session = createPanelHeightSessionView(options);
  const pendingCommandActive = options.pendingCommand.value !== null;
  const flowPanelActive = options.stagingExpanded.value;

  if (pendingCommandActive && !state.pendingCommandActive) {
    beginCommandPanelSession(session, resolveCommandPanelEntryHeight(options));
    state.pendingCommandActive = true;
    state.pendingCommandSettled = false;
  }

  if (!pendingCommandActive && state.pendingCommandActive) {
    if (commandPanelExitPhase !== "idle") {
      return;
    }

    clearCommandPanelSession(session);
    state.pendingCommandActive = false;
    state.pendingCommandSettled = false;
  }

  if (flowPanelActive && !state.flowPanelActive) {
    beginFlowPanelSession(session, resolveCurrentPanelEffectiveHeight(options));
    state.flowPanelActive = true;
    state.flowPanelSettled = false;
    stopFlowPanelObservation(state);
  }

  if (!flowPanelActive && state.flowPanelActive) {
    clearFlowPanelSession(session);
    state.flowPanelActive = false;
    state.flowPanelSettled = false;
    stopFlowPanelObservation(state);
  }
}

export function lockSettledPanelHeights(
  options: UseWindowSizingOptions,
  state: WindowSizingSessionState,
  dragStripHeight: number
): void {
  const frameMaxHeight = resolveFrameMaxHeight(options, dragStripHeight);
  maybeLockCommandPanelHeight(options, state, frameMaxHeight);
  maybeLockFlowPanelHeight(options, state, frameMaxHeight);
}

function maybeLockCommandPanelHeight(
  options: UseWindowSizingOptions,
  state: WindowSizingSessionState,
  frameMaxHeight: number
): void {
  if (
    options.pendingCommand.value === null ||
    !state.pendingCommandActive ||
    !state.pendingCommandSettled ||
    options.commandPanelLockedHeight.value !== null
  ) {
    return;
  }

  const fullNaturalHeight = options.searchShellRef.value
    ? measureCommandPanelFullNaturalHeight(options.searchShellRef.value)
    : null;
  const panelMinHeight = resolveCommandPanelMinHeight({
    fallbackMinHeight: options.constants.paramOverlayMinHeight,
    fullNaturalHeight
  });

  lockCommandPanelHeight(
    createPanelHeightSessionView(options),
    resolvePanelHeight({
      panelMaxHeight: frameMaxHeight,
      inheritedPanelHeight:
        options.commandPanelInheritedHeight.value ?? options.constants.windowBaseHeight,
      panelMinHeight
    })
  );
}

function maybeLockFlowPanelHeight(
  options: UseWindowSizingOptions,
  state: WindowSizingSessionState,
  frameMaxHeight: number
): void {
  if (!state.flowPanelActive || !state.flowPanelSettled) {
    return;
  }

  const measuredMinHeight = options.stagingPanelRef.value
    ? measureFlowPanelMinHeight(options.stagingPanelRef.value)
    : null;
  if (
    measuredMinHeight === null ||
    !Number.isFinite(measuredMinHeight) ||
    measuredMinHeight <= 0
  ) {
    return;
  }

  const resolvedFlowPanelHeight = resolvePanelHeight({
    panelMaxHeight: frameMaxHeight,
    inheritedPanelHeight:
      options.flowPanelInheritedHeight.value ?? options.constants.windowBaseHeight,
    panelMinHeight: measuredMinHeight
  });

  if (options.flowPanelLockedHeight.value === null) {
    lockFlowPanelHeight(createPanelHeightSessionView(options), resolvedFlowPanelHeight);
    return;
  }

  if (!state.flowPanelObservationActive) {
    return;
  }

  raiseFlowPanelHeight(
    createPanelHeightSessionView(options),
    resolvePanelHeight({
      panelMaxHeight: frameMaxHeight,
      inheritedPanelHeight: options.flowPanelLockedHeight.value,
      panelMinHeight: measuredMinHeight
    })
  );
}
