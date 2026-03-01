import type { Ref } from "vue";

type FrameScheduler = (callback: FrameRequestCallback) => number;

interface UseSearchFocusOptions {
  searchInputRef: Ref<HTMLInputElement | null>;
  shouldBlockFocus?: () => boolean;
  requestFrame?: FrameScheduler;
}

function getDefaultFrameScheduler(): FrameScheduler {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    return (callback) => window.requestAnimationFrame(callback);
  }
  return (callback) => setTimeout(() => callback(0), 0) as unknown as number;
}

export function useSearchFocus(options: UseSearchFocusOptions) {
  const scheduleFrame = options.requestFrame ?? getDefaultFrameScheduler();

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
    scheduleFrame(() => {
      focusSearchInput(selectText);
    });
  }

  return {
    focusSearchInput,
    scheduleSearchInputFocus
  };
}
