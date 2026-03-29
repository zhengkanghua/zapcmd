import { effectScope, nextTick, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useLauncherWatchers } from "../../launcher/useLauncherWatchers";
import type { QueuePanelState } from "../../launcher/useCommandQueue";

async function flushWatchers(): Promise<void> {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

function createHarness() {
  const drawerOpen = ref(false);
  const drawerVisibleRows = ref(0);
  const pendingCommand = ref<unknown>(null);
  const stagingDrawerState = ref<QueuePanelState>("closed");
  const filteredResults = ref<unknown[]>([]);
  const resultButtons = ref<Array<HTMLElement | null>>([document.createElement("button")]);
  const activeIndex = ref(2);
  const drawerRef = ref(document.createElement("div"));
  drawerRef.value.scrollTop = 36;
  const paramInputRef = ref(document.createElement("input"));

  const focusSpy = vi.fn();
  const selectSpy = vi.fn();
  paramInputRef.value.focus = focusSpy;
  paramInputRef.value.select = selectSpy;

  const scheduleWindowSync = vi.fn();
  const ensureActiveResultVisible = vi.fn();

  const scope = effectScope();
  scope.run(() => {
    useLauncherWatchers({
      drawerOpen,
      drawerVisibleRows,
      pendingCommand,
      stagingDrawerState,
      scheduleWindowSync,
      filteredResults,
      resultButtons,
      activeIndex,
      drawerRef,
      ensureActiveResultVisible,
      paramInputRef
    });
  });

  return {
    scope,
    state: {
      drawerOpen,
      drawerVisibleRows,
      pendingCommand,
      stagingDrawerState,
      filteredResults,
      resultButtons,
      activeIndex,
      drawerRef
    },
    spies: {
      scheduleWindowSync,
      ensureActiveResultVisible,
      focusSpy,
      selectSpy
    }
  };
}

describe("useLauncherWatchers", () => {
  it("不再暴露 stagingVisibleRows 旧状态", async () => {
    const harness = createHarness();

    expect("stagingVisibleRows" in harness.state).toBe(false);
    harness.scope.stop();
  });

  it("triggers sync on every staging drawer state change", async () => {
    const harness = createHarness();

    harness.state.stagingDrawerState.value = "opening";
    await flushWatchers();
    expect(harness.spies.scheduleWindowSync).toHaveBeenCalledTimes(1);

    harness.state.stagingDrawerState.value = "open";
    await flushWatchers();
    expect(harness.spies.scheduleWindowSync).toHaveBeenCalledTimes(2);

    harness.state.stagingDrawerState.value = "closing";
    await flushWatchers();
    expect(harness.spies.scheduleWindowSync).toHaveBeenCalledTimes(3);

    harness.state.stagingDrawerState.value = "closed";
    await flushWatchers();
    expect(harness.spies.scheduleWindowSync).toHaveBeenCalledTimes(4);

    harness.scope.stop();
  });

  it("resets result list view state when filtered result length changes", async () => {
    const harness = createHarness();
    harness.state.filteredResults.value = [{ id: 1 }, { id: 2 }];
    await flushWatchers();

    expect(harness.state.resultButtons.value).toEqual([]);
    expect(harness.state.activeIndex.value).toBe(0);
    expect(harness.state.drawerRef.value?.scrollTop).toBe(0);
    expect(harness.spies.ensureActiveResultVisible).toHaveBeenCalled();

    harness.scope.stop();
  });

  it("focuses first param input when pending command appears", async () => {
    const harness = createHarness();

    harness.state.pendingCommand.value = { id: "cmd-1" };
    await flushWatchers();

    expect(harness.spies.focusSpy).toHaveBeenCalledTimes(1);
    expect(harness.spies.selectSpy).toHaveBeenCalledTimes(1);
    harness.scope.stop();
  });
});
