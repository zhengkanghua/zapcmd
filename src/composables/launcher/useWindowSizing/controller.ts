import { LogicalSize } from "@tauri-apps/api/window";
import { nextTick } from "vue";
import {
  resolveWindowSize,
  resolveWindowChromeHeight,
  shouldSkipResize
} from "./calculation";
import { UI_TOP_ALIGN_OFFSET_PX_FALLBACK, type UseWindowSizingOptions, type WindowSize } from "./model";
import { createCommandPanelExitCoordinator } from "./commandPanelExit";
import { resolvePanelHeight } from "./panelHeightContract";
import {
  beginCommandPanelSession,
  beginFlowPanelSession,
  clearCommandPanelSession,
  clearFlowPanelSession,
  lockCommandPanelHeight,
  lockFlowPanelHeight,
  type PanelHeightSession
} from "./panelHeightSession";
import {
  measureCommandPanelFullNaturalHeight,
  measureFlowPanelMinHeight,
  resolveCommandPanelMinHeight,
  resolveFlowPanelMinHeight
} from "./panelMeasurement";
import {
  LAUNCHER_SHELL_BREATHING_BOTTOM_PX,
  SEARCH_CAPSULE_HEIGHT_PX
} from "../useLauncherLayoutMetrics";

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

function resolveSearchPanelEffectiveHeight(options: UseWindowSizingOptions): number {
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
function resolveCurrentPanelEffectiveHeight(options: UseWindowSizingOptions): number {
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

function resolveFrameMaxHeight(options: UseWindowSizingOptions, dragStripHeight: number): number {
  const screenCapFrame = Math.max(
    0,
    options.windowHeightCap.value - resolveWindowChromeHeight(dragStripHeight)
  );
  return Math.min(screenCapFrame, options.sharedPanelMaxHeight.value);
}

function syncLauncherFrameHeightStyle(
  options: UseWindowSizingOptions,
  windowHeight: number,
  commandPanelExitFrameHeightLock: number | null = null,
  preferWindowHeight = false
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

  const dragStripHeight = resolveShellDragStripHeightFromDom(options);
  const fallbackHeight = Math.max(0, windowHeight - resolveWindowChromeHeight(dragStripHeight));
  if (preferWindowHeight) {
    shell.style.setProperty("--launcher-frame-height", `${fallbackHeight}px`);
    return;
  }

  const root = shell.parentElement;
  const frame = shell.querySelector<HTMLElement>(".launcher-frame");
  if (root && frame) {
    const rootRect = root.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    if (Number.isFinite(rootRect.height) && Number.isFinite(frameRect.top) && Number.isFinite(rootRect.top)) {
      const topOffset = Math.max(0, frameRect.top - rootRect.top);
      const frameHeight = Math.max(
        0,
        Math.floor(rootRect.height - topOffset - LAUNCHER_SHELL_BREATHING_BOTTOM_PX)
      );
      shell.style.setProperty("--launcher-frame-height", `${frameHeight}px`);
      return;
    }
  }

  shell.style.setProperty("--launcher-frame-height", `${fallbackHeight}px`);
}

type ResizeBridge = (width: number, height: number) => Promise<void>;

interface ResizeStyleSyncOptions {
  beforeSyncStyle?: () => void;
  frameHeightLock?: number | null;
  preferWindowHeight?: boolean;
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
      styleSyncOptions.frameHeightLock ?? null,
      styleSyncOptions.preferWindowHeight ?? false
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
  commandPanelExit: ReturnType<typeof createCommandPanelExitCoordinator>
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
    if (commandPanelExit.snapshot().phase !== "idle") {
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
  const frameMaxHeight = resolveFrameMaxHeight(options, dragStripHeight);
  maybeLockCommandPanelHeight(options, state, frameMaxHeight);
  maybeLockFlowPanelHeight(options, state, frameMaxHeight);
}

function resolveFlowPanelFallbackMinHeight(options: UseWindowSizingOptions): number {
  return (
    options.constants.stagingChromeHeight +
    options.constants.stagingCardEstHeight * 2 +
    options.constants.stagingListGap
  );
}

function maybeLockCommandPanelHeight(
  options: UseWindowSizingOptions,
  state: WindowSizingState,
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
  state: WindowSizingState,
  frameMaxHeight: number
): void {
  if (
    !state.flowPanelActive ||
    !state.flowPanelSettled ||
    options.flowPanelLockedHeight.value !== null
  ) {
    return;
  }

  const measuredMinHeight = options.stagingPanelRef.value
    ? measureFlowPanelMinHeight(options.stagingPanelRef.value)
    : null;
  const panelMinHeight = resolveFlowPanelMinHeight({
    fallbackMinHeight: resolveFlowPanelFallbackMinHeight(options),
    measuredMinHeight
  });

  lockFlowPanelHeight(
    createPanelHeightSessionView(options),
    resolvePanelHeight({
      panelMaxHeight: frameMaxHeight,
      inheritedPanelHeight:
        options.flowPanelInheritedHeight.value ?? options.constants.windowBaseHeight,
      panelMinHeight
    })
  );
}

function finalizeCommandPanelExit(
  options: UseWindowSizingOptions,
  state: WindowSizingState,
  commandPanelExit: ReturnType<typeof createCommandPanelExitCoordinator>
): void {
  commandPanelExit.clear();
  if (options.pendingCommand.value !== null) {
    return;
  }

  clearCommandPanelSession(createPanelHeightSessionView(options));
  state.pendingCommandActive = false;
  state.pendingCommandSettled = false;
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
    ignoreCommandPanelExitLock: true,
    // nav-slide out-in 期间可能还残留旧 search shell；恢复目标采样必须只走安全口径。
    ignoreMeasuredSearchPanelHeight: true
  });
  const restoreTargetFrameHeight =
    snapshot.restoreTargetFrameHeight ??
    Math.max(0, restoreBaseSize.height - resolveWindowChromeHeight(dragStripHeight));
  if (snapshot.restoreTargetFrameHeight === null) {
    commandPanelExit.captureRestoreTarget(restoreTargetFrameHeight);
  }

  if (restoreTargetFrameHeight >= commandPanelExitFrameHeightLock) {
    finalizeCommandPanelExit(options, state, commandPanelExit);
    state.queuedWindowSync = true;
    return true;
  }

  await applyWindowSize(
    options,
    state,
    bridge,
    {
      width: restoreBaseSize.width,
      height: restoreTargetFrameHeight + resolveWindowChromeHeight(dragStripHeight)
    },
    {
      beforeSyncStyle: () => finalizeCommandPanelExit(options, state, commandPanelExit)
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
      const hadActiveFlowPanel = state.flowPanelActive;
      syncPanelHeightSessions(options, state, commandPanelExit);
      lockSettledPanelHeights(options, state, dragStripHeight);
      const preferWindowHeightForLauncherFrame =
        options.pendingCommand.value !== null &&
        (options.stagingExpanded.value || hadActiveFlowPanel);
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
}

function createRequestCommandPanelExit(
  options: UseWindowSizingOptions,
  state: WindowSizingState,
  commandPanelExit: ReturnType<typeof createCommandPanelExitCoordinator>
) {
  return function requestCommandPanelExit(): void {
    const dragStripHeight = resolveShellDragStripHeightFromDom(options);
    const lockedFrameHeight = state.lastWindowSize
      ? Math.max(0, state.lastWindowSize.height - resolveWindowChromeHeight(dragStripHeight))
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
