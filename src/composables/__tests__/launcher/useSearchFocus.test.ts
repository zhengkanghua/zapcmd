import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useSearchFocus } from "../../launcher/useSearchFocus";

describe("useSearchFocus", () => {
  it("focuses and selects input", () => {
    const input = document.createElement("input");
    const focusSpy = vi.spyOn(input, "focus");
    const selectSpy = vi.spyOn(input, "select");

    const focus = useSearchFocus({
      searchInputRef: ref(input)
    });
    focus.focusSearchInput(true);

    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    expect(selectSpy).toHaveBeenCalledTimes(1);
  });

  it("does not focus when blocked", () => {
    const input = document.createElement("input");
    const focusSpy = vi.spyOn(input, "focus");
    const selectSpy = vi.spyOn(input, "select");
    const focus = useSearchFocus({
      searchInputRef: ref(input),
      shouldBlockFocus: () => true
    });

    focus.focusSearchInput(true);

    expect(focusSpy).not.toHaveBeenCalled();
    expect(selectSpy).not.toHaveBeenCalled();
  });

  it("safely no-ops when input ref is empty", () => {
    const requestFrame = vi.fn(() => 1);
    const focus = useSearchFocus({
      searchInputRef: ref(null),
      shouldBlockFocus: () => false,
      requestFrame: requestFrame as unknown as (callback: FrameRequestCallback) => number
    });

    focus.scheduleSearchInputFocus(false);
    expect(requestFrame).toHaveBeenCalledTimes(1);
  });
});


