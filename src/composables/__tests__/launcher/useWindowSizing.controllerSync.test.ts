import { computed, ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import { createCommandPanelExitCoordinator } from "../../launcher/useWindowSizing/commandPanelExit";
import { createWindowSizingSync } from "../../launcher/useWindowSizing/controllerSync";
import {
  createWindowSizingState,
  type FlowPanelPreparedGate
} from "../../launcher/useWindowSizing/controllerState";
import { WINDOW_SIZING_CONSTANTS } from "../../launcher/useLauncherLayoutMetrics";
import type { UseWindowSizingOptions } from "../../launcher/useWindowSizing/model";

function createSyncHarness(overrides: Partial<UseWindowSizingOptions> = {}) {
  const pendingCommand = ref<unknown>(null);
  const requestAnimateMainWindowSize = vi.fn<UseWindowSizingOptions["requestAnimateMainWindowSize"]>(
    async () => {}
  );
  const requestSetMainWindowSize = vi.fn<UseWindowSizingOptions["requestSetMainWindowSize"]>(
    async () => {}
  );
  const options: UseWindowSizingOptions = {
    constants: WINDOW_SIZING_CONSTANTS,
    isSettingsWindow: ref(false),
    isTauriRuntime: () => true,
    resolveAppWindow: () => null,
    requestSetMainWindowSize,
    requestAnimateMainWindowSize,
    requestResizeMainWindowForReveal: vi.fn(async () => {}),
    searchShellRef: ref(null),
    stagingPanelRef: ref(null),
    stagingExpanded: ref(false),
    commandPageOpen: computed(() => pendingCommand.value !== null),
    pendingCommand,
    commandPanelInheritedHeight: ref<number | null>(null),
    commandPanelLockedHeight: ref<number | null>(null),
    flowPanelInheritedHeight: ref<number | null>(null),
    flowPanelLockedHeight: ref<number | null>(null),
    drawerOpen: ref(false),
    drawerViewportHeight: ref(0),
    searchPanelEffectiveHeight: ref(WINDOW_SIZING_CONSTANTS.windowBaseHeight),
    sharedPanelMaxHeight: ref(720),
    searchMainWidth: ref(680),
    minShellWidth: ref(0),
    windowWidthCap: ref(1600),
    windowHeightCap: ref(1600),
    scheduleSearchInputFocus: vi.fn(),
    loadSettings: vi.fn(),
    ...overrides
  };
  const state = createWindowSizingState(options);
  const commandPanelExit = createCommandPanelExitCoordinator();
  const flowPanelPreparedGate: FlowPanelPreparedGate = {
    prepared: false,
    promise: null,
    resolve: null
  };
  const scheduleWindowSync = vi.fn();
  return {
    options,
    state,
    commandPanelExit,
    flowPanelPreparedGate,
    scheduleWindowSync,
    sync: createWindowSizingSync({
      options,
      state,
      commandPanelExit,
      flowPanelPreparedGate,
      scheduleWindowSync
    })
  };
}

describe("createWindowSizingSync", () => {
  it("settings window 下直接 short-circuit，不触发 resize bridge", async () => {
    const harness = createSyncHarness({
      isSettingsWindow: ref(true)
    });
    const bridge = vi.fn(async () => {});

    await harness.sync.run(bridge);

    expect(bridge).not.toHaveBeenCalled();
    expect(harness.state.syncingWindowSize).toBe(false);
    expect(harness.scheduleWindowSync).not.toHaveBeenCalled();
  });

  it("sync 中途再次触发时只置 queued 标记，finally 后补跑一次", async () => {
    const bridgeResolvers: Array<() => void> = [];
    const bridge = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          bridgeResolvers.push(() => {
            resolve();
          });
        })
    );
    const harness = createSyncHarness();

    const firstRun = harness.sync.run(bridge);
    await Promise.resolve();
    expect(harness.state.syncingWindowSize).toBe(true);

    await harness.sync.run(bridge);

    expect(harness.state.queuedWindowSync).toBe(true);
    expect(bridge).toHaveBeenCalledTimes(1);
    expect(harness.scheduleWindowSync).not.toHaveBeenCalled();

    const resolveBridge = bridgeResolvers.shift();
    expect(resolveBridge).toBeTypeOf("function");
    resolveBridge?.();
    await firstRun;

    expect(harness.state.syncingWindowSize).toBe(false);
    expect(harness.state.queuedWindowSync).toBe(false);
    expect(harness.scheduleWindowSync).toHaveBeenCalledTimes(1);
  });

  it("runAnimated 走动画 bridge，runImmediate 走即时 bridge", async () => {
    const harness = createSyncHarness();

    await harness.sync.runAnimated();
    harness.state.lastWindowSize = null;
    await harness.sync.run(harness.options.requestSetMainWindowSize);

    expect(harness.options.requestAnimateMainWindowSize).toHaveBeenCalledTimes(1);
    expect(harness.options.requestSetMainWindowSize).toHaveBeenCalledTimes(1);
  });

  it("Flow 激活边界切换时会重置 prepared gate", async () => {
    const gate: FlowPanelPreparedGate = {
      prepared: true,
      promise: Promise.resolve(),
      resolve: vi.fn()
    };
    const harness = createSyncHarness({
      stagingExpanded: ref(false),
      flowPanelInheritedHeight: ref<number | null>(320)
    });
    harness.flowPanelPreparedGate.prepared = gate.prepared;
    harness.flowPanelPreparedGate.promise = gate.promise;
    harness.flowPanelPreparedGate.resolve = gate.resolve;
    const bridge = vi.fn(async () => {});

    harness.options.stagingExpanded.value = true;

    await harness.sync.run(bridge);

    expect(harness.state.flowPanelActive).toBe(true);
    expect(harness.flowPanelPreparedGate.prepared).toBe(false);
    expect(harness.flowPanelPreparedGate.promise).toBeNull();
    expect(harness.flowPanelPreparedGate.resolve).toBeNull();
  });
});
