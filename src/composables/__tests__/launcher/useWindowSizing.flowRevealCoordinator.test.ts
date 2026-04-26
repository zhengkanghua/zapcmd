import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import { createCommandPanelExitCoordinator } from "../../launcher/useWindowSizing/commandPanelExit";
import { createFlowRevealCoordinator } from "../../launcher/useWindowSizing/flowRevealCoordinator";
import {
  createWindowSizingState,
  type FlowPanelPreparedGate
} from "../../launcher/useWindowSizing/controllerState";
import { WINDOW_SIZING_CONSTANTS } from "../../launcher/useLauncherLayoutMetrics";
import {
  UI_TOP_ALIGN_OFFSET_PX_FALLBACK,
  type UseWindowSizingOptions
} from "../../launcher/useWindowSizing/model";
import {
  SEARCH_SHELL_OUTER_CHROME_PX,
  buildFlowPanelShellForLock
} from "./useWindowSizing.testHarness";

function createRevealHarness(overrides: Partial<UseWindowSizingOptions> = {}) {
  const options: UseWindowSizingOptions = {
    constants: WINDOW_SIZING_CONSTANTS,
    isSettingsWindow: ref(false),
    isTauriRuntime: () => true,
    resolveAppWindow: () => null,
    requestSetMainWindowSize: vi.fn(async () => {}),
    requestAnimateMainWindowSize: vi.fn(async () => {}),
    requestResizeMainWindowForReveal: vi.fn(async () => {}),
    searchShellRef: ref(null),
    stagingPanelRef: ref(null),
    stagingExpanded: ref(true),
    pendingCommand: ref(null),
    commandPageOpen: ref(false),
    commandPanelInheritedHeight: ref<number | null>(null),
    commandPanelLockedHeight: ref<number | null>(null),
    flowPanelInheritedHeight: ref<number | null>(280),
    flowPanelLockedHeight: ref<number | null>(null),
    drawerOpen: ref(false),
    drawerViewportHeight: ref(0),
    searchPanelEffectiveHeight: ref(280),
    sharedPanelMaxHeight: ref(700),
    searchMainWidth: ref(680),
    minShellWidth: ref(0),
    windowWidthCap: ref(1600),
    windowHeightCap: ref(1600),
    scheduleSearchInputFocus: vi.fn(),
    reloadSettings: vi.fn(),
    ...overrides
  };
  const state = createWindowSizingState(options);
  state.flowPanelActive = true;
  const commandPanelExit = createCommandPanelExitCoordinator();
  const flowPanelPreparedGate: FlowPanelPreparedGate = {
    prepared: false,
    promise: null,
    resolve: null,
    reject: null,
    version: 0
  };

  return {
    options,
    state,
    commandPanelExit,
    flowPanelPreparedGate,
    reveal: createFlowRevealCoordinator({
      options,
      state,
      flowPanelPreparedGate,
      commandPanelExit
    })
  };
}

describe("createFlowRevealCoordinator", () => {
  it("prepare 会等待 prepared gate，再按实测高度执行 reveal resize", async () => {
    const panel = buildFlowPanelShellForLock({
      headerHeight: 52,
      footerHeight: 60,
      cardHeights: [96, 124]
    });
    const harness = createRevealHarness({
      stagingPanelRef: ref<HTMLElement | null>(null)
    });

    const task = harness.reveal.prepare();
    expect(harness.options.requestResizeMainWindowForReveal).not.toHaveBeenCalled();

    harness.options.stagingPanelRef.value = panel;
    harness.reveal.notifyPrepared();
    await task;

    expect(harness.options.flowPanelLockedHeight.value).toBe(364);
    expect(harness.options.requestResizeMainWindowForReveal).toHaveBeenCalledWith(
      expect.any(Number),
      364 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK + SEARCH_SHELL_OUTER_CHROME_PX
    );
  });

  it("staging 未展开时 prepare 直接返回，不触发 reveal resize", async () => {
    const harness = createRevealHarness({
      stagingExpanded: ref(false)
    });

    await harness.reveal.prepare();

    expect(harness.options.requestResizeMainWindowForReveal).not.toHaveBeenCalled();
  });

  it("测量多次仍拿不到有效高度时，不写 lockedHeight 也不触发 resize", async () => {
    const panel = document.createElement("section");
    panel.className = "flow-panel";
    panel.appendChild(document.createElement("header")).className = "flow-panel__header";
    panel.appendChild(document.createElement("div")).className = "flow-panel__body";
    panel.appendChild(document.createElement("footer")).className = "flow-panel__footer";
    const harness = createRevealHarness({
      stagingPanelRef: ref(panel)
    });

    harness.reveal.notifyPrepared();
    await harness.reveal.prepare();

    expect(harness.options.flowPanelLockedHeight.value).toBeNull();
    expect(harness.options.requestResizeMainWindowForReveal).not.toHaveBeenCalled();
  });

  it("已有 stagingPanelRef 时，prepare 无需等待 notifyPrepared 也能继续", async () => {
    const panel = buildFlowPanelShellForLock({
      headerHeight: 52,
      footerHeight: 60,
      emptyHeight: 96
    });
    const harness = createRevealHarness({
      stagingPanelRef: ref(panel)
    });

    await harness.reveal.prepare();

    expect(harness.options.flowPanelLockedHeight.value).toBe(280);
    expect(harness.options.requestResizeMainWindowForReveal).toHaveBeenCalledTimes(1);
  });

  it("prepared gate 在失效后，旧 prepare 不应继续推进 reveal", async () => {
    const panel = buildFlowPanelShellForLock({
      headerHeight: 52,
      footerHeight: 60,
      cardHeights: [96, 124]
    });
    const harness = createRevealHarness({
      stagingPanelRef: ref<HTMLElement | null>(null)
    });

    let settled = false;
    const task = harness.reveal.prepare().finally(() => {
      settled = true;
    });
    harness.flowPanelPreparedGate.version += 1;
    harness.flowPanelPreparedGate.reject?.();
    harness.options.stagingExpanded.value = false;
    harness.options.stagingPanelRef.value = panel;
    harness.reveal.notifyPrepared();
    await task;

    expect(settled).toBe(true);
    expect(harness.options.flowPanelLockedHeight.value).toBeNull();
    expect(harness.options.requestResizeMainWindowForReveal).not.toHaveBeenCalled();
  });
});
