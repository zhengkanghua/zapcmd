import { LogicalSize } from "@tauri-apps/api/window";
import { nextTick } from "vue";
import {
  resolveCommandPanelFrameHeight,
  resolveFlowPanelFrameHeight,
  resolveWindowSize,
  shouldSkipResize
} from "./calculation";
import { UI_TOP_ALIGN_OFFSET_PX_FALLBACK, type UseWindowSizingOptions, type WindowSize } from "./model";
import { createCommandPanelExitCoordinator } from "./commandPanelExit";
import {
  beginCommandPanelSession,
  beginFlowPanelSession,
  clearCommandPanelSession,
  clearFlowPanelSession,
  lockCommandPanelHeight,
  lockFlowPanelHeight,
  type PanelHeightSession
} from "./panelHeightSession";
import { LAUNCHER_FRAME_DESIGN_CAP_PX } from "../useLauncherLayoutMetrics";

interface WindowSizingState {
  lastWindowSize: WindowSize | null;
  syncingWindowSize: boolean;
  queuedWindowSync: boolean;
  pendingCommandActive: boolean;
  flowPanelActive: boolean;
  pendingCommandSettled: boolean;
  flowPanelSettled: boolean;
}

function createWindowSizingState(options: UseWindowSizingOptions): WindowSizingState {
  const pendingCommandActive =
    options.pendingCommand.value !== null &&
    (options.commandPanelInheritedHeight.value !== null ||
      options.commandPanelLockedHeight.value !== null);
  const flowPanelActive =
    options.stagingExpanded.value &&
    (options.flowPanelInheritedHeight.value !== null || options.flowPanelLockedHeight.value !== null);
  return {
    lastWindowSize: null,
    syncingWindowSize: false,
    queuedWindowSync: false,
    pendingCommandActive,
    flowPanelActive,
    pendingCommandSettled: pendingCommandActive && options.commandPanelLockedHeight.value !== null,
    flowPanelSettled: flowPanelActive && options.flowPanelLockedHeight.value !== null
  };
}

function createPanelHeightSessionView(options: UseWindowSizingOptions): PanelHeightSession {
  return {
    commandPanelInheritedHeight: options.commandPanelInheritedHeight,
    commandPanelLockedHeight: options.commandPanelLockedHeight,
    flowPanelInheritedHeight: options.flowPanelInheritedHeight,
    flowPanelLockedHeight: options.flowPanelLockedHeight
  };
}

function resolveShellDragStripHeightFromDom(options: UseWindowSizingOptions): number {
  const shell = options.searchShellRef.value;
  const dragStrip = shell ? shell.querySelector<HTMLElement>(".shell-drag-strip") : null;
  if (dragStrip) {
    const height = dragStrip.getBoundingClientRect().height;
    if (Number.isFinite(height) && height > 0) {
      return Math.ceil(height);
    }
  }
  return UI_TOP_ALIGN_OFFSET_PX_FALLBACK;
}

function resolveLastFrameHeight(
  options: UseWindowSizingOptions,
  state: WindowSizingState,
  dragStripHeight: number
): number {
  if (state.lastWindowSize) {
    return Math.max(0, state.lastWindowSize.height - dragStripHeight);
  }

  if (options.pendingCommand.value !== null) {
    return (
      options.commandPanelLockedHeight.value ??
      options.commandPanelInheritedHeight.value ??
      options.constants.paramOverlayMinHeight
    );
  }

  return options.constants.windowBaseHeight;
}

function resolveFrameMaxHeight(options: UseWindowSizingOptions, dragStripHeight: number): number {
  const screenCapFrame = Math.max(0, options.windowHeightCap.value - dragStripHeight);
  return Math.min(screenCapFrame, LAUNCHER_FRAME_DESIGN_CAP_PX);
}

function syncLauncherFrameHeightStyle(
  options: UseWindowSizingOptions,
  windowHeight: number,
  commandPanelExitFrameHeightLock: number | null = null
): void {
  const shell = options.searchShellRef.value;
  if (!shell) {
    return;
  }

  if (commandPanelExitFrameHeightLock !== null) {
    shell.style.setProperty(
      "--launcher-frame-height",
      `${Math.max(0, Math.floor(commandPanelExitFrameHeightLock))}px`
    );
    return;
  }

  if (options.pendingCommand.value === null) {
    shell.style.removeProperty("--launcher-frame-height");
    return;
  }

  const root = shell.parentElement;
  const frame = shell.querySelector<HTMLElement>(".launcher-frame");
  if (root && frame) {
    const rootRect = root.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    if (Number.isFinite(rootRect.height) && Number.isFinite(frameRect.top) && Number.isFinite(rootRect.top)) {
      const topOffset = Math.max(0, frameRect.top - rootRect.top);
      const frameHeight = Math.max(0, Math.floor(rootRect.height - topOffset));
      shell.style.setProperty("--launcher-frame-height", `${frameHeight}px`);
      return;
    }
  }

  const dragStripHeight = resolveShellDragStripHeightFromDom(options);
  const fallbackHeight = Math.max(0, windowHeight - dragStripHeight);
  shell.style.setProperty("--launcher-frame-height", `${fallbackHeight}px`);
}

type ResizeBridge = (width: number, height: number) => Promise<void>;

interface ResizeStyleSyncOptions {
  beforeSyncStyle?: () => void;
  frameHeightLock?: number | null;
}

async function applyWindowSize(
  options: UseWindowSizingOptions,
  state: WindowSizingState,
  bridge: ResizeBridge,
  size: WindowSize,
  styleSyncOptions: ResizeStyleSyncOptions = {}
): Promise<void> {
  const syncStyle = () => {
    styleSyncOptions.beforeSyncStyle?.();
    syncLauncherFrameHeightStyle(
      options,
      size.height,
      styleSyncOptions.frameHeightLock ?? null
    );
  };

  if (shouldSkipResize(state.lastWindowSize, size, options.constants.windowSizeEpsilon)) {
    state.lastWindowSize = size;
    syncStyle();
    return;
  }

  state.lastWindowSize = size;
  if (!options.isTauriRuntime()) {
    syncStyle();
    return;
  }

  const appWindow = options.resolveAppWindow();
  try {
    await bridge(size.width, size.height);
    syncStyle();
  } catch (error) {
    console.warn("window command resize failed", error);
    try {
      if (appWindow) {
        await appWindow.setSize(new LogicalSize(size.width, size.height));
      }
      syncStyle();
    } catch (fallbackError) {
      console.warn("window webview resize failed", fallbackError);
    }
  }
}

function syncPanelHeightSessions(
  options: UseWindowSizingOptions,
  state: WindowSizingState,
  dragStripHeight: number
): void {
  const session = createPanelHeightSessionView(options);
  const pendingCommandActive = options.pendingCommand.value !== null;
  const flowPanelActive = options.stagingExpanded.value;

  if (pendingCommandActive && !state.pendingCommandActive) {
    beginCommandPanelSession(session, resolveLastFrameHeight(options, state, dragStripHeight));
    state.pendingCommandActive = true;
    state.pendingCommandSettled = false;
  }

  if (!pendingCommandActive && state.pendingCommandActive) {
    clearCommandPanelSession(session);
    state.pendingCommandActive = false;
    state.pendingCommandSettled = false;
  }

  if (flowPanelActive && !state.flowPanelActive) {
    beginFlowPanelSession(session, resolveLastFrameHeight(options, state, dragStripHeight));
    state.flowPanelActive = true;
    state.flowPanelSettled = false;
  }

  if (!flowPanelActive && state.flowPanelActive) {
    clearFlowPanelSession(session);
    state.flowPanelActive = false;
    state.flowPanelSettled = false;
  }
}

function lockSettledPanelHeights(
  options: UseWindowSizingOptions,
  state: WindowSizingState,
  dragStripHeight: number
): void {
  const session = createPanelHeightSessionView(options);
  const frameMaxHeight = resolveFrameMaxHeight(options, dragStripHeight);

  if (state.pendingCommandActive && state.pendingCommandSettled) {
    const commandFrameHeight =
      resolveCommandPanelFrameHeight(options, frameMaxHeight) ?? options.constants.paramOverlayMinHeight;
    lockCommandPanelHeight(session, commandFrameHeight);
  }

  if (state.flowPanelActive && state.flowPanelSettled) {
    const flowFrameHeight = resolveFlowPanelFrameHeight(options, frameMaxHeight);
    if (flowFrameHeight !== null) {
      lockFlowPanelHeight(session, flowFrameHeight);
    }
  }
}

async function handleSearchSettlingResize(
  options: UseWindowSizingOptions,
  state: WindowSizingState,
  commandPanelExit: ReturnType<typeof createCommandPanelExitCoordinator>,
  bridge: ResizeBridge,
  dragStripHeight: number
): Promise<boolean> {
  const snapshot = commandPanelExit.snapshot();
  const commandPanelExitFrameHeightLock = snapshot.lockedExitFrameHeight;
  if (snapshot.phase !== "search-settling" || commandPanelExitFrameHeightLock === null) {
    return false;
  }

  const restoreBaseSize = resolveWindowSize(options, {
    commandPanelExitFrameHeightLock,
    ignoreCommandPanelExitLock: true
  });
  const restoreTargetFrameHeight =
    snapshot.restoreTargetFrameHeight ??
    Math.max(0, restoreBaseSize.height - dragStripHeight);
  if (snapshot.restoreTargetFrameHeight === null) {
    commandPanelExit.captureRestoreTarget(restoreTargetFrameHeight);
  }

  if (restoreTargetFrameHeight >= commandPanelExitFrameHeightLock) {
    commandPanelExit.clear();
    state.queuedWindowSync = true;
    return true;
  }

  await applyWindowSize(
    options,
    state,
    bridge,
    {
      width: restoreBaseSize.width,
      height: restoreTargetFrameHeight + dragStripHeight
    },
    {
      beforeSyncStyle: () => commandPanelExit.clear()
    }
  );
  return true;
}

function createSyncWindowSizeCore(
  options: UseWindowSizingOptions,
  state: WindowSizingState,
  commandPanelExit: ReturnType<typeof createCommandPanelExitCoordinator>,
  scheduleWindowSync: () => void
) {
  return async function syncWindowSizeCore(bridge: ResizeBridge): Promise<void> {
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
      syncPanelHeightSessions(options, state, dragStripHeight);
      lockSettledPanelHeights(options, state, dragStripHeight);
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
          frameHeightLock: commandPanelExitFrameHeightLock
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
}

function createRequestCommandPanelExit(
  options: UseWindowSizingOptions,
  state: WindowSizingState,
  commandPanelExit: ReturnType<typeof createCommandPanelExitCoordinator>
) {
  return function requestCommandPanelExit(): void {
    const dragStripHeight = resolveShellDragStripHeightFromDom(options);
    const lockedFrameHeight = state.lastWindowSize
      ? Math.max(0, state.lastWindowSize.height - dragStripHeight)
      : options.commandPanelLockedHeight.value ??
        options.commandPanelInheritedHeight.value ??
        options.constants.paramOverlayMinHeight;
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
    options.loadSettings();
    syncWindowSizeImmediate();
    options.scheduleSearchInputFocus(true);
  };
}

export function createWindowSizingController(options: UseWindowSizingOptions) {
  const state = createWindowSizingState(options);
  const commandPanelExit = createCommandPanelExitCoordinator();

  /** 缓动动画路径，用于 watcher 触发的响应式更新。 */
  const scheduleWindowSync = (): void => {
    void syncWindowSize();
  };
  const syncWindowSizeCore = createSyncWindowSizeCore(
    options,
    state,
    commandPanelExit,
    scheduleWindowSync
  );
  async function syncWindowSize(): Promise<void> {
    return syncWindowSizeCore(options.requestAnimateMainWindowSize);
  }

  /** 即时跳转路径，用于聚焦校准等无动画场景。 */
  function syncWindowSizeImmediate(): void {
    void syncWindowSizeCore(options.requestSetMainWindowSize);
  }

  const requestCommandPanelExit = createRequestCommandPanelExit(
    options,
    state,
    commandPanelExit
  );

  const notifySearchPageSettled = (): void => {
    commandPanelExit.markSearchSettled();
    scheduleWindowSync();
  };
  const notifyCommandPageSettled = (): void => {
    state.pendingCommandSettled = true;
    scheduleWindowSync();
  };
  const notifyFlowPanelSettled = (): void => {
    state.flowPanelSettled = true;
    scheduleWindowSync();
  };
  const onViewportResize = scheduleWindowSync;
  const onAppFocused = createOnAppFocused(options, syncWindowSizeImmediate);

  /** 清理 resize 定时器，debounce 已移除，保留为空函数兼容外部调用。 */
  function clearResizeTimer(): void {
    // 前端 debounce 已移除（防抖在 Rust 端），此处为 no-op。
  }

  return {
    onViewportResize,
    onAppFocused,
    requestCommandPanelExit,
    notifyCommandPageSettled,
    notifyFlowPanelSettled,
    notifySearchPageSettled,
    scheduleWindowSync,
    syncWindowSize,
    syncWindowSizeImmediate,
    clearResizeTimer
  };
}
