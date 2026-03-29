import { ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDrawerActions } from "../../launcher/useCommandQueue/drawer";
import type {
  QueuedCommandLike,
  QueuePanelState,
  UseCommandQueueOptions
} from "../../launcher/useCommandQueue/model";

interface FakeQueuedCommand extends QueuedCommandLike {
  id: string;
}

function createDrawerHarness(
  overrides: Partial<UseCommandQueueOptions<FakeQueuedCommand>> = {},
  initialState: QueuePanelState = "closed"
) {
  const queuePanelState = ref<QueuePanelState>(initialState);
  const queuedCommands = ref<FakeQueuedCommand[]>([]);
  const preparePanelReveal = vi.fn(async () => {});
  const scheduleSearchInputFocus = vi.fn();
  const ensureActiveQueueVisible = vi.fn();
  const onPanelStateChanged = vi.fn();

  const options: UseCommandQueueOptions<FakeQueuedCommand> = {
    queuedCommands,
    transitionMs: 120,
    scheduleSearchInputFocus,
    ensureActiveQueueVisible,
    preparePanelReveal,
    onPanelStateChanged,
    ...overrides
  };

  const actions = createDrawerActions({
    options,
    queuePanelState
  });

  return {
    actions,
    options,
    queuePanelState,
    spies: {
      preparePanelReveal,
      scheduleSearchInputFocus,
      onPanelStateChanged
    }
  };
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  vi.useRealTimers();
});

describe("createDrawerActions", () => {
  it("按 preparing -> resizing -> opening -> open 的顺序推进 reveal", async () => {
    vi.useFakeTimers();
    let resolveReveal!: () => void;
    const harness = createDrawerHarness({
      preparePanelReveal: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveReveal = resolve;
          })
      )
    });

    harness.actions.openQueuePanel();
    await flushMicrotasks();

    expect(harness.queuePanelState.value).toBe("resizing");
    expect(harness.spies.onPanelStateChanged.mock.calls.map(([state]) => state)).toEqual([
      "preparing",
      "resizing"
    ]);

    resolveReveal();
    await flushMicrotasks();

    expect(harness.queuePanelState.value).toBe("opening");
    vi.advanceTimersByTime(harness.options.transitionMs);
    await flushMicrotasks();

    expect(harness.queuePanelState.value).toBe("open");
    expect(harness.spies.onPanelStateChanged.mock.calls.map(([state]) => state)).toEqual([
      "preparing",
      "resizing",
      "opening",
      "open"
    ]);
  });

  it("在 preparing 或 reveal 过程中再次 open 会被忽略", async () => {
    vi.useFakeTimers();
    let resolveReveal!: () => void;
    const preparePanelReveal = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveReveal = resolve;
        })
    );
    const harness = createDrawerHarness({ preparePanelReveal });

    harness.actions.openQueuePanel();
    harness.actions.openQueuePanel();
    await flushMicrotasks();

    expect(preparePanelReveal).toHaveBeenCalledTimes(1);
    expect(harness.queuePanelState.value).toBe("resizing");

    harness.actions.openQueuePanel();
    expect(preparePanelReveal).toHaveBeenCalledTimes(1);

    resolveReveal();
    await flushMicrotasks();
    expect(harness.queuePanelState.value).toBe("opening");

    harness.actions.openQueuePanel();
    vi.advanceTimersByTime(harness.options.transitionMs);
    await flushMicrotasks();
    expect(harness.queuePanelState.value).toBe("open");

    harness.actions.openQueuePanel();
    expect(preparePanelReveal).toHaveBeenCalledTimes(1);
  });

  it("close 会在 reveal 未完成时取消迟到 reopen，并在动画结束后回到 closed", async () => {
    vi.useFakeTimers();
    let resolveReveal!: () => void;
    const harness = createDrawerHarness({
      preparePanelReveal: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveReveal = resolve;
          })
      )
    });

    harness.actions.openQueuePanel();
    await flushMicrotasks();
    expect(harness.queuePanelState.value).toBe("resizing");

    harness.actions.closeQueuePanel();
    expect(harness.queuePanelState.value).toBe("closing");

    resolveReveal();
    await flushMicrotasks();
    expect(harness.queuePanelState.value).toBe("closing");

    vi.advanceTimersByTime(harness.options.transitionMs);
    await flushMicrotasks();

    expect(harness.queuePanelState.value).toBe("closed");
    expect(harness.spies.scheduleSearchInputFocus).toHaveBeenCalledWith(false);
    expect(harness.spies.onPanelStateChanged.mock.calls.map(([state]) => state)).toContain(
      "closing"
    );
  });

  it("closed/closing 的 close 与 toggle 分支保持稳定", async () => {
    vi.useFakeTimers();
    const closedHarness = createDrawerHarness({}, "closed");
    closedHarness.actions.closeQueuePanel();
    expect(closedHarness.queuePanelState.value).toBe("closed");

    const closingHarness = createDrawerHarness({}, "closing");
    closingHarness.actions.closeQueuePanel();
    expect(closingHarness.queuePanelState.value).toBe("closing");

    closingHarness.actions.toggleQueue();
    await flushMicrotasks();
    expect(closingHarness.queuePanelState.value).toBe("opening");
  });
});
