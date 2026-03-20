import { ref, type Ref } from "vue";

export interface PanelHeightSession {
  commandPanelInheritedHeight: Ref<number | null>;
  commandPanelLockedHeight: Ref<number | null>;
  flowPanelInheritedHeight: Ref<number | null>;
  flowPanelLockedHeight: Ref<number | null>;
}

export function createPanelHeightSession(): PanelHeightSession {
  return {
    commandPanelInheritedHeight: ref<number | null>(null),
    commandPanelLockedHeight: ref<number | null>(null),
    flowPanelInheritedHeight: ref<number | null>(null),
    flowPanelLockedHeight: ref<number | null>(null)
  };
}

export function beginCommandPanelSession(
  session: PanelHeightSession,
  inheritedHeight: number
): void {
  session.commandPanelInheritedHeight.value = inheritedHeight;
  session.commandPanelLockedHeight.value = null;
}

export function lockCommandPanelHeight(
  session: PanelHeightSession,
  lockedHeight: number
): void {
  if (session.commandPanelLockedHeight.value !== null) {
    return;
  }
  session.commandPanelLockedHeight.value = lockedHeight;
}

export function clearCommandPanelSession(session: PanelHeightSession): void {
  session.commandPanelInheritedHeight.value = null;
  session.commandPanelLockedHeight.value = null;
}

export function beginFlowPanelSession(
  session: PanelHeightSession,
  inheritedHeight: number
): void {
  session.flowPanelInheritedHeight.value = inheritedHeight;
  session.flowPanelLockedHeight.value = null;
}

export function lockFlowPanelHeight(
  session: PanelHeightSession,
  lockedHeight: number
): void {
  if (session.flowPanelLockedHeight.value !== null) {
    return;
  }
  session.flowPanelLockedHeight.value = lockedHeight;
}

/**
 * FlowPanel 在短时观察窗口内只允许向上补高，避免实测回落导致窗口来回抖动。
 */
export function raiseFlowPanelHeight(
  session: PanelHeightSession,
  lockedHeight: number
): void {
  const currentLockedHeight = session.flowPanelLockedHeight.value;
  if (currentLockedHeight === null || lockedHeight > currentLockedHeight) {
    session.flowPanelLockedHeight.value = lockedHeight;
  }
}

export function clearFlowPanelSession(session: PanelHeightSession): void {
  session.flowPanelInheritedHeight.value = null;
  session.flowPanelLockedHeight.value = null;
}
