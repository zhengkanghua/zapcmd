import { LogicalSize } from "@tauri-apps/api/window";
import {
  resolveWindowSize,
  resolveWindowChromeHeight,
  shouldSkipResize
} from "./calculation";
import { createCommandPanelExitCoordinator } from "./commandPanelExit";
import { UI_TOP_ALIGN_OFFSET_PX_FALLBACK, type UseWindowSizingOptions, type WindowSize } from "./model";
import { clearCommandPanelSession } from "./panelHeightSession";
import { createPanelHeightSessionView } from "./sessionCoordinator";
import { LAUNCHER_SHELL_BREATHING_BOTTOM_PX } from "../useLauncherLayoutMetrics";

export interface WindowSyncState {
  lastWindowSize: WindowSize | null;
}

export interface SearchSettlingState extends WindowSyncState {
  queuedWindowSync: boolean;
  pendingCommandActive: boolean;
  pendingCommandSettled: boolean;
}

export type ResizeBridge = (width: number, height: number) => Promise<void>;

interface ResizeStyleSyncOptions {
  beforeSyncStyle?: () => void;
  frameHeightLock?: number | null;
  preferWindowHeight?: boolean;
}

export function resolveShellDragStripHeightFromDom(options: UseWindowSizingOptions): number {
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

  const shouldKeepFrameHeightStyle =
    options.pendingCommand.value !== null || options.stagingExpanded.value || preferWindowHeight;
  if (!shouldKeepFrameHeightStyle) {
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
    if (
      Number.isFinite(rootRect.height) &&
      Number.isFinite(frameRect.top) &&
      Number.isFinite(rootRect.top)
    ) {
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

export async function applyWindowSize(
  options: UseWindowSizingOptions,
  state: WindowSyncState,
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

function finalizeCommandPanelExit(
  options: UseWindowSizingOptions,
  state: SearchSettlingState,
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

export async function handleSearchSettlingResize(
  options: UseWindowSizingOptions,
  state: SearchSettlingState,
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
