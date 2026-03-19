export type CommandPanelExitPhase = "idle" | "command-exiting" | "search-settling";

interface CommandPanelExitState {
  phase: CommandPanelExitPhase;
  lockedExitFrameHeight: number | null;
  restoreTargetFrameHeight: number | null;
}

export function createCommandPanelExitCoordinator() {
  const state: CommandPanelExitState = {
    phase: "idle",
    lockedExitFrameHeight: null,
    restoreTargetFrameHeight: null
  };

  function beginExit(frameHeight: number): void {
    state.phase = "command-exiting";
    state.lockedExitFrameHeight = frameHeight;
    state.restoreTargetFrameHeight = null;
  }

  function markSearchSettled(): void {
    if (state.lockedExitFrameHeight === null) {
      return;
    }
    state.phase = "search-settling";
  }

  function captureRestoreTarget(frameHeight: number): void {
    if (state.phase !== "search-settling" || state.restoreTargetFrameHeight !== null) {
      return;
    }
    state.restoreTargetFrameHeight = frameHeight;
  }

  function clear(): void {
    state.phase = "idle";
    state.lockedExitFrameHeight = null;
    state.restoreTargetFrameHeight = null;
  }

  return {
    beginExit,
    markSearchSettled,
    captureRestoreTarget,
    clear,
    snapshot: () => ({ ...state })
  };
}
