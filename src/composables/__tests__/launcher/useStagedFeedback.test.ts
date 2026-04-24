import { effectScope } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useStagedFeedback } from "../../launcher/useStagedFeedback";

describe("useStagedFeedback", () => {
  it("sets command id then clears it after duration", () => {
    vi.useFakeTimers();
    const feedback = useStagedFeedback({ durationMs: 120 });

    feedback.triggerStagedFeedback("cmd-1");
    expect(feedback.stagedFeedbackCommandId.value).toBe("cmd-1");

    vi.advanceTimersByTime(119);
    expect(feedback.stagedFeedbackCommandId.value).toBe("cmd-1");

    vi.advanceTimersByTime(1);
    expect(feedback.stagedFeedbackCommandId.value).toBeNull();
    vi.useRealTimers();
  });

  it("restarts timer when trigger is called repeatedly", () => {
    vi.useFakeTimers();
    const feedback = useStagedFeedback({ durationMs: 100 });

    feedback.triggerStagedFeedback("cmd-a");
    vi.advanceTimersByTime(50);
    feedback.triggerStagedFeedback("cmd-b");

    vi.advanceTimersByTime(60);
    expect(feedback.stagedFeedbackCommandId.value).toBe("cmd-b");

    vi.advanceTimersByTime(40);
    expect(feedback.stagedFeedbackCommandId.value).toBeNull();
    vi.useRealTimers();
  });

  it("clears pending timer explicitly", () => {
    vi.useFakeTimers();
    const feedback = useStagedFeedback({ durationMs: 80 });

    feedback.triggerStagedFeedback("cmd-z");
    feedback.clearStagedFeedbackTimer();
    vi.advanceTimersByTime(200);

    expect(feedback.stagedFeedbackCommandId.value).toBe("cmd-z");
    vi.useRealTimers();
  });

  it("clears pending timer when enclosing scope is disposed", () => {
    vi.useFakeTimers();
    const scope = effectScope();
    const feedback = scope.run(() => useStagedFeedback({ durationMs: 80 }));

    if (!feedback) {
      throw new Error("expected staged feedback composable to initialize");
    }

    feedback.triggerStagedFeedback("cmd-scope");
    expect(vi.getTimerCount()).toBe(1);

    scope.stop();

    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(200);
    expect(feedback.stagedFeedbackCommandId.value).toBe("cmd-scope");
    vi.useRealTimers();
  });

  it("ignores new feedback requests after enclosing scope is disposed", () => {
    vi.useFakeTimers();
    const scope = effectScope();
    const feedback = scope.run(() => useStagedFeedback({ durationMs: 80 }));

    if (!feedback) {
      throw new Error("expected staged feedback composable to initialize");
    }

    scope.stop();
    feedback.triggerStagedFeedback("cmd-after-stop");

    expect(feedback.stagedFeedbackCommandId.value).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
});
