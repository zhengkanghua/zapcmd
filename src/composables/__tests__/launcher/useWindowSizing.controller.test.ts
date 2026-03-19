import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import { WINDOW_SIZING_CONSTANTS } from "../../launcher/useLauncherLayoutMetrics";
import { createWindowSizingController } from "../../launcher/useWindowSizing/controller";
import {
  UI_TOP_ALIGN_OFFSET_PX_FALLBACK,
  type UseWindowSizingOptions
} from "../../launcher/useWindowSizing/model";

function createDomRect(partial: Partial<DOMRect>): DOMRect {
  return {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    toJSON: () => ({}),
    ...partial
  } as DOMRect;
}

function createExitHarness() {
  const drawerOpen = ref(false);
  const drawerViewportHeight = ref(0);
  const pendingCommand = ref<unknown>({ id: "pending" });
  const commandPanelFrameHeightFloor = ref<number | null>(520);

  const requestAnimateMainWindowSize = vi.fn<
    UseWindowSizingOptions["requestAnimateMainWindowSize"]
  >(async (_width, _height) => {});

  const controller = createWindowSizingController({
    constants: WINDOW_SIZING_CONSTANTS,
    isSettingsWindow: ref(false),
    isTauriRuntime: () => true,
    resolveAppWindow: () => null,
    requestSetMainWindowSize: async () => {},
    requestAnimateMainWindowSize,
    searchShellRef: ref(null),
    stagingPanelRef: ref(null),
    stagingExpanded: ref(false),
    pendingCommand,
    commandPanelFrameHeightFloor,
    drawerOpen,
    drawerViewportHeight,
    stagingVisibleRows: ref(0),
    searchMainWidth: ref(680),
    minShellWidth: ref(0),
    windowWidthCap: ref(2000),
    windowHeightCap: ref(2000),
    scheduleSearchInputFocus: () => {},
    loadSettings: () => {}
  });

  return {
    controller,
    state: {
      drawerOpen,
      drawerViewportHeight,
      pendingCommand,
      commandPanelFrameHeightFloor
    },
    spies: {
      requestAnimateMainWindowSize
    }
  };
}

describe("createWindowSizingController（CommandPanel floor 捕获）", () => {
  it("进入 CommandPanel 时若 lastWindowSize 为空：不应把窗口直接拉到 designCap（fallback 为 baseHeight）", async () => {
    const drawerOpen = ref(true);
    const drawerViewportHeight = ref(5_000);
    const pendingCommand = ref<unknown>({ id: "pending" });
    const commandPanelFrameHeightFloor = ref<number | null>(null);

    const requestAnimateMainWindowSize = vi.fn<
      UseWindowSizingOptions["requestAnimateMainWindowSize"]
    >(async (_width, _height) => {});

    const controller = createWindowSizingController({
      constants: WINDOW_SIZING_CONSTANTS,
      isSettingsWindow: ref(false),
      isTauriRuntime: () => true,
      resolveAppWindow: () => null,
      requestSetMainWindowSize: async () => {},
      requestAnimateMainWindowSize,
      searchShellRef: ref(null),
      stagingPanelRef: ref(null),
      stagingExpanded: ref(false),
      pendingCommand,
      commandPanelFrameHeightFloor,
      drawerOpen,
      drawerViewportHeight,
      stagingVisibleRows: ref(0),
      searchMainWidth: ref(680),
      minShellWidth: ref(0),
      windowWidthCap: ref(2000),
      windowHeightCap: ref(2000),
      scheduleSearchInputFocus: () => {},
      loadSettings: () => {}
    });

    // 在 nextTick 前切换到“参数面板”布局：抽走 drawer（高度应被 floor 挡住）
    queueMicrotask(() => {
      drawerOpen.value = false;
      drawerViewportHeight.value = 0;
    });

    await controller.syncWindowSize();

    expect(requestAnimateMainWindowSize).toHaveBeenCalled();
    const lastCall = requestAnimateMainWindowSize.mock.calls.at(-1);
    expect(lastCall?.[1]).toBe(
      WINDOW_SIZING_CONSTANTS.paramOverlayMinHeight + UI_TOP_ALIGN_OFFSET_PX_FALLBACK
    );
  });
});

describe("createWindowSizingController（CommandPanel 样式同步）", () => {
  it("pendingCommand 时应基于 DOM 视口高度同步 launcher-frame，避免 overshoot 裁切圆角", async () => {
    const root = document.createElement("main");
    const shell = document.createElement("div");
    shell.className = "search-shell";
    root.appendChild(shell);

    const dragStrip = document.createElement("div");
    dragStrip.className = "shell-drag-strip";
    shell.appendChild(dragStrip);

    const frame = document.createElement("div");
    frame.className = "launcher-frame";
    shell.appendChild(frame);

    document.body.appendChild(root);

    vi.spyOn(root, "getBoundingClientRect").mockReturnValue(
      createDomRect({ top: 0, height: 330 })
    );
    vi.spyOn(frame, "getBoundingClientRect").mockReturnValue(
      createDomRect({ top: 26 })
    );
    vi.spyOn(dragStrip, "getBoundingClientRect").mockReturnValue(
      createDomRect({ height: UI_TOP_ALIGN_OFFSET_PX_FALLBACK })
    );

    const requestAnimateMainWindowSize = vi.fn<
      UseWindowSizingOptions["requestAnimateMainWindowSize"]
    >(async (_width, _height) => {});

    const controller = createWindowSizingController({
      constants: WINDOW_SIZING_CONSTANTS,
      isSettingsWindow: ref(false),
      isTauriRuntime: () => true,
      resolveAppWindow: () => null,
      requestSetMainWindowSize: async () => {},
      requestAnimateMainWindowSize,
      searchShellRef: ref(shell),
      stagingPanelRef: ref(null),
      stagingExpanded: ref(false),
      pendingCommand: ref<unknown>({ id: "pending" }),
      commandPanelFrameHeightFloor: ref<number | null>(null),
      drawerOpen: ref(false),
      drawerViewportHeight: ref(0),
      stagingVisibleRows: ref(0),
      searchMainWidth: ref(680),
      minShellWidth: ref(0),
      windowWidthCap: ref(2000),
      windowHeightCap: ref(2000),
      scheduleSearchInputFocus: () => {},
      loadSettings: () => {}
    });

    await controller.syncWindowSize();

    expect(requestAnimateMainWindowSize).toHaveBeenCalled();
    expect(shell.style.getPropertyValue("--launcher-frame-height")).toBe("304px");

    root.remove();
  });

  it("requestCommandPanelExit 后，搜索页稳定前不会被临时小高度拉低；稳定后只动画回落一次", async () => {
    const harness = createExitHarness();

    await harness.controller.syncWindowSize();
    harness.spies.requestAnimateMainWindowSize.mockClear();

    harness.controller.requestCommandPanelExit();
    harness.state.pendingCommand.value = null;
    harness.state.drawerOpen.value = false;
    harness.state.drawerViewportHeight.value = 0;

    await harness.controller.syncWindowSize();
    expect(harness.spies.requestAnimateMainWindowSize).not.toHaveBeenCalledWith(
      expect.any(Number),
      WINDOW_SIZING_CONSTANTS.windowBaseHeight + UI_TOP_ALIGN_OFFSET_PX_FALLBACK
    );

    harness.controller.notifySearchPageSettled();
    await harness.controller.syncWindowSize();

    expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenLastCalledWith(
      expect.any(Number),
      WINDOW_SIZING_CONSTANTS.windowBaseHeight + UI_TOP_ALIGN_OFFSET_PX_FALLBACK
    );
    expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenCalledTimes(1);
  });
});
