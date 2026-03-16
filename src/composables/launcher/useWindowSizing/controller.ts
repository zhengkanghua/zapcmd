import { LogicalSize } from "@tauri-apps/api/window";
import { nextTick } from "vue";
import { resolveWindowSize, shouldSkipResize } from "./calculation";
import { UI_TOP_ALIGN_OFFSET_PX_FALLBACK, type UseWindowSizingOptions, type WindowSize } from "./model";

interface WindowSizingState {
  lastWindowSize: WindowSize | null;
  syncingWindowSize: boolean;
  queuedWindowSync: boolean;
  pendingCommandActive: boolean;
}

function createWindowSizingState(): WindowSizingState {
  return {
    lastWindowSize: null,
    syncingWindowSize: false,
    queuedWindowSync: false,
    pendingCommandActive: false
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

export function createWindowSizingController(options: UseWindowSizingOptions) {
  const state = createWindowSizingState();

  /**
   * 核心同步逻辑 — 通过指定的 bridge 函数设置窗口尺寸
   * @param bridge 实际的 IPC 调用函数（animate 或 immediate）
   */
  async function syncWindowSizeCore(
    bridge: (width: number, height: number) => Promise<void>
  ): Promise<void> {
    if (options.isSettingsWindow.value) {
      return;
    }
    if (state.syncingWindowSize) {
      state.queuedWindowSync = true;
      return;
    }

    state.syncingWindowSize = true;
    const preTickDragStripHeight = resolveShellDragStripHeightFromDom(options);
    const preTickWindowSize = state.lastWindowSize ?? resolveWindowSize(options);
    await nextTick();
    try {
      const isPending = options.pendingCommand.value !== null;
      if (isPending && !state.pendingCommandActive) {
        const dragStripHeight = resolveShellDragStripHeightFromDom(options);
        const frameHeightBeforeEnter = state.lastWindowSize
          ? state.lastWindowSize.height - dragStripHeight
          : Math.max(options.constants.windowBaseHeight, preTickWindowSize.height - preTickDragStripHeight);
        options.commandPanelFrameHeightFloor.value = frameHeightBeforeEnter;
        state.pendingCommandActive = true;
      } else if (!isPending && state.pendingCommandActive) {
        options.commandPanelFrameHeightFloor.value = null;
        state.pendingCommandActive = false;
      }

      const size = resolveWindowSize(options);
      const appWindow = options.resolveAppWindow();
      if (shouldSkipResize(state.lastWindowSize, size, options.constants.windowSizeEpsilon)) {
        return;
      }
      state.lastWindowSize = size;
      if (!options.isTauriRuntime()) {
        return;
      }

      try {
        await bridge(size.width, size.height);
      } catch (error) {
        console.warn("window command resize failed", error);
        try {
          if (appWindow) {
            await appWindow.setSize(new LogicalSize(size.width, size.height));
          }
        } catch (fallbackError) {
          console.warn("window webview resize failed", fallbackError);
        }
      }
    } finally {
      state.syncingWindowSize = false;
      if (state.queuedWindowSync) {
        state.queuedWindowSync = false;
        scheduleWindowSync();
      }
    }
  }

  /** 缓动动画路径 — 用于 watcher 触发的响应式更新 */
  async function syncWindowSize(): Promise<void> {
    return syncWindowSizeCore(options.requestAnimateMainWindowSize);
  }

  /** 即时跳转路径 — 用于聚焦校准等无动画场景 */
  function syncWindowSizeImmediate(): void {
    void syncWindowSizeCore(options.requestSetMainWindowSize);
  }

  /** 调度窗口同步 — 防抖已在 Rust 端，此处直接调用 */
  function scheduleWindowSync(): void {
    void syncWindowSize();
  }

  function onViewportResize(): void {
    scheduleWindowSync();
  }

  function onAppFocused(): void {
    if (options.isSettingsWindow.value) {
      return;
    }
    options.loadSettings();
    syncWindowSizeImmediate();
    options.scheduleSearchInputFocus(true);
  }

  /** 清理 resize 定时器 — debounce 已移除，保留为空函数兼容外部调用 */
  function clearResizeTimer(): void {
    // 前端 debounce 已移除（防抖在 Rust 端），此处为 no-op
  }

  return {
    onViewportResize,
    onAppFocused,
    scheduleWindowSync,
    syncWindowSize,
    syncWindowSizeImmediate,
    clearResizeTimer
  };
}
