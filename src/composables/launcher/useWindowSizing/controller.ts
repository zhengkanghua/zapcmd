import { LogicalSize } from "@tauri-apps/api/window";
import { nextTick } from "vue";
import { resolveWindowSize, shouldSkipResize } from "./calculation";
import type { UseWindowSizingOptions, WindowSize } from "./model";

interface WindowSizingState {
  lastWindowSize: WindowSize | null;
  resizeTimer: ReturnType<typeof setTimeout> | null;
  syncingWindowSize: boolean;
  queuedWindowSync: boolean;
}

function createWindowSizingState(): WindowSizingState {
  return {
    lastWindowSize: null,
    resizeTimer: null,
    syncingWindowSize: false,
    queuedWindowSync: false
  };
}

export function createWindowSizingController(options: UseWindowSizingOptions) {
  const state = createWindowSizingState();

  async function syncWindowSize(): Promise<void> {
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
        await options.requestSetMainWindowSize(size.width, size.height);
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

  function scheduleWindowSync(): void {
    if (state.resizeTimer) {
      clearTimeout(state.resizeTimer);
    }
    state.resizeTimer = setTimeout(() => {
      state.resizeTimer = null;
      void syncWindowSize();
    }, options.constants.windowResizeDebounceMs);
  }

  function syncWindowSizeImmediate(): void {
    if (state.resizeTimer) {
      clearTimeout(state.resizeTimer);
      state.resizeTimer = null;
    }
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

  function clearResizeTimer(): void {
    if (!state.resizeTimer) {
      return;
    }
    clearTimeout(state.resizeTimer);
    state.resizeTimer = null;
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
