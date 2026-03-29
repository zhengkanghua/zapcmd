import { ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDrawerActions } from "../../launcher/useStagingQueue/drawer";
import type {
  StagedCommandLike,
  StagingDrawerState,
  UseStagingQueueOptions
} from "../../launcher/useStagingQueue/model";

interface FakeStagedCommand extends StagedCommandLike {
  id: string;
}

function createDrawerHarness(
  overrides: Partial<UseStagingQueueOptions<FakeStagedCommand>> = {},
  initialState: StagingDrawerState = "closed"
) {
  const stagingDrawerState = ref<StagingDrawerState>(initialState);
  const stagedCommands = ref<FakeStagedCommand[]>([]);
  const prepareDrawerReveal = vi.fn(async () => {});
  const scheduleSearchInputFocus = vi.fn();
  const ensureActiveStagingVisible = vi.fn();
  const onDrawerStateChanged = vi.fn();

  const options: UseStagingQueueOptions<FakeStagedCommand> = {
    stagedCommands,
    transitionMs: 120,
    scheduleSearchInputFocus,
    ensureActiveStagingVisible,
    prepareDrawerReveal,
    onDrawerStateChanged,
    ...overrides
  };

  const actions = createDrawerActions({
    options,
    stagingDrawerState
  });

  return {
    actions,
    options,
    stagingDrawerState,
    spies: {
      prepareDrawerReveal,
      scheduleSearchInputFocus,
      onDrawerStateChanged
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
      prepareDrawerReveal: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveReveal = resolve;
          })
      )
    });

    harness.actions.openStagingDrawer();
    await flushMicrotasks();

    expect(harness.stagingDrawerState.value).toBe("resizing");
    expect(harness.spies.onDrawerStateChanged.mock.calls.map(([state]) => state)).toEqual([
      "preparing",
      "resizing"
    ]);

    resolveReveal();
    await flushMicrotasks();

    expect(harness.stagingDrawerState.value).toBe("opening");
    vi.advanceTimersByTime(harness.options.transitionMs);
    await flushMicrotasks();

    expect(harness.stagingDrawerState.value).toBe("open");
    expect(harness.spies.onDrawerStateChanged.mock.calls.map(([state]) => state)).toEqual([
      "preparing",
      "resizing",
      "opening",
      "open"
    ]);
  });

  it("在 preparing 或 reveal 过程中再次 open 会被忽略", async () => {
    vi.useFakeTimers();
    let resolveReveal!: () => void;
    const prepareDrawerReveal = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveReveal = resolve;
        })
    );
    const harness = createDrawerHarness({ prepareDrawerReveal });

    harness.actions.openStagingDrawer();
    harness.actions.openStagingDrawer();
    await flushMicrotasks();

    expect(prepareDrawerReveal).toHaveBeenCalledTimes(1);
    expect(harness.stagingDrawerState.value).toBe("resizing");

    harness.actions.openStagingDrawer();
    expect(prepareDrawerReveal).toHaveBeenCalledTimes(1);

    resolveReveal();
    await flushMicrotasks();
    expect(harness.stagingDrawerState.value).toBe("opening");

    harness.actions.openStagingDrawer();
    vi.advanceTimersByTime(harness.options.transitionMs);
    await flushMicrotasks();
    expect(harness.stagingDrawerState.value).toBe("open");

    harness.actions.openStagingDrawer();
    expect(prepareDrawerReveal).toHaveBeenCalledTimes(1);
  });

  it("close 会在 reveal 未完成时取消迟到 reopen，并在动画结束后回到 closed", async () => {
    vi.useFakeTimers();
    let resolveReveal!: () => void;
    const harness = createDrawerHarness({
      prepareDrawerReveal: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveReveal = resolve;
          })
      )
    });

    harness.actions.openStagingDrawer();
    await flushMicrotasks();
    expect(harness.stagingDrawerState.value).toBe("resizing");

    harness.actions.closeStagingDrawer();
    expect(harness.stagingDrawerState.value).toBe("closing");

    resolveReveal();
    await flushMicrotasks();
    expect(harness.stagingDrawerState.value).toBe("closing");

    vi.advanceTimersByTime(harness.options.transitionMs);
    await flushMicrotasks();

    expect(harness.stagingDrawerState.value).toBe("closed");
    expect(harness.spies.scheduleSearchInputFocus).toHaveBeenCalledWith(false);
    expect(harness.spies.onDrawerStateChanged.mock.calls.map(([state]) => state)).toContain(
      "closing"
    );
  });

  it("closed/closing 的 close 与 toggle 分支保持稳定", async () => {
    vi.useFakeTimers();
    const closedHarness = createDrawerHarness({}, "closed");
    closedHarness.actions.closeStagingDrawer();
    expect(closedHarness.stagingDrawerState.value).toBe("closed");

    const closingHarness = createDrawerHarness({}, "closing");
    closingHarness.actions.closeStagingDrawer();
    expect(closingHarness.stagingDrawerState.value).toBe("closing");

    closingHarness.actions.toggleStaging();
    await flushMicrotasks();
    expect(closingHarness.stagingDrawerState.value).toBe("opening");
  });
});
