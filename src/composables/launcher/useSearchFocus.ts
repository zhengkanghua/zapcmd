import { getCurrentScope, onScopeDispose, type Ref } from "vue";

type FrameScheduler = (callback: FrameRequestCallback) => number;
type FrameCanceler = (handle: number) => void;

interface UseSearchFocusOptions {
  searchInputRef: Ref<HTMLInputElement | null>;
  shouldBlockFocus?: () => boolean;
  requestFrame?: FrameScheduler;
  cancelFrame?: FrameCanceler;
}

function getDefaultFrameScheduler(): FrameScheduler {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    return (callback) => window.requestAnimationFrame(callback);
  }
  return (callback) => setTimeout(() => callback(0), 0) as unknown as number;
}

function getDefaultFrameCanceler(): FrameCanceler {
  if (typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function") {
    return (handle) => window.cancelAnimationFrame(handle);
  }
  return (handle) => clearTimeout(handle);
}

export function useSearchFocus(options: UseSearchFocusOptions) {
  const scheduleFrame = options.requestFrame ?? getDefaultFrameScheduler();
  const cancelFrame = options.cancelFrame ?? getDefaultFrameCanceler();
  const maxFocusRetries = 40;
  let focusRequestToken = 0;
  let pendingFrameHandle: number | null = null;

  function clearPendingFrame(): void {
    if (pendingFrameHandle === null) {
      return;
    }
    cancelFrame(pendingFrameHandle);
    pendingFrameHandle = null;
  }

  function schedulePendingFrame(callback: FrameRequestCallback): void {
    clearPendingFrame();
    pendingFrameHandle = scheduleFrame((timestamp) => {
      pendingFrameHandle = null;
      callback(timestamp);
    });
  }

  function focusSearchInput(selectText = false): void {
    if (options.shouldBlockFocus?.()) {
      return;
    }
    const input = options.searchInputRef.value;
    if (!input) {
      return;
    }
    input.focus({ preventScroll: true });
    if (selectText) {
      input.select();
    }
  }

  function scheduleSearchInputFocus(selectText = false): void {
    const token = ++focusRequestToken;
    let attempts = 0;

    const attemptFocus = () => {
      if (token !== focusRequestToken) {
        return;
      }
      if (options.shouldBlockFocus?.()) {
        return;
      }
      if (options.searchInputRef.value) {
        focusSearchInput(selectText);
        return;
      }
      attempts += 1;
      if (attempts >= maxFocusRetries) {
        return;
      }
      schedulePendingFrame(() => attemptFocus());
    };

    schedulePendingFrame(() => attemptFocus());
  }

  // 组件卸载后必须让迟到的 focus 调度失效，避免旧回调继续触碰已销毁输入框。
  if (getCurrentScope()) {
    onScopeDispose(() => {
      focusRequestToken += 1;
      clearPendingFrame();
    });
  }

  return {
    focusSearchInput,
    scheduleSearchInputFocus
  };
}
