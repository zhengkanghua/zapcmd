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
  const maxFocusRetries = 40;
  let focusRequestToken = 0;

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
      scheduleFrame(() => attemptFocus());
    };

    scheduleFrame(() => attemptFocus());
  }

  return {
    focusSearchInput,
    scheduleSearchInputFocus
  };
}
