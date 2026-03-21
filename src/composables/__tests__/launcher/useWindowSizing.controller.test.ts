import { ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  LAUNCHER_FRAME_DESIGN_CAP_PX,
  SEARCH_CAPSULE_HEIGHT_PX,
  WINDOW_SIZING_CONSTANTS
} from "../../launcher/useLauncherLayoutMetrics";
import { createWindowSizingController } from "../../launcher/useWindowSizing/controller";
import {
  UI_TOP_ALIGN_OFFSET_PX_FALLBACK,
  type UseWindowSizingOptions
} from "../../launcher/useWindowSizing/model";

const SEARCH_SHELL_MARGIN_TOP_PX = 8;
const SEARCH_SHELL_BREATHING_BOTTOM_PX = 8;
const SEARCH_SHELL_OUTER_CHROME_PX =
  SEARCH_SHELL_MARGIN_TOP_PX + SEARCH_SHELL_BREATHING_BOTTOM_PX;

type PanelHeightHarnessOverrides = Partial<UseWindowSizingOptions>;

function createWindowSizingHarness(overrides: PanelHeightHarnessOverrides = {}) {
  const {
    commandPanelInheritedHeight = ref<number | null>(null),
    commandPanelLockedHeight = ref<number | null>(null),
    flowPanelInheritedHeight = ref<number | null>(null),
    flowPanelLockedHeight = ref<number | null>(null),
    ...restOverrides
  } = overrides;
  const requestAnimateMainWindowSize = vi.fn<UseWindowSizingOptions["requestAnimateMainWindowSize"]>(
    async (_width, _height) => {}
  );

  const baseOptions: UseWindowSizingOptions = {
    constants: WINDOW_SIZING_CONSTANTS,
    isSettingsWindow: ref(false),
    isTauriRuntime: () => true,
    resolveAppWindow: () => null,
    requestSetMainWindowSize: async () => {},
    requestAnimateMainWindowSize,
    searchShellRef: ref(null),
    stagingPanelRef: ref(null),
    stagingExpanded: ref(false),
    pendingCommand: ref<unknown>({ id: "pending" }),
    commandPanelInheritedHeight: ref<number | null>(null),
    commandPanelLockedHeight: ref<number | null>(null),
    flowPanelInheritedHeight: ref<number | null>(null),
    flowPanelLockedHeight: ref<number | null>(null),
    drawerOpen: ref(false),
    drawerViewportHeight: ref(0),
    searchPanelEffectiveHeight: ref(SEARCH_CAPSULE_HEIGHT_PX),
    sharedPanelMaxHeight: ref(LAUNCHER_FRAME_DESIGN_CAP_PX),
    searchMainWidth: ref(680),
    minShellWidth: ref(0),
    windowWidthCap: ref(2000),
    windowHeightCap: ref(2000),
    scheduleSearchInputFocus: () => {},
    loadSettings: () => {}
  };

  const options = {
    ...baseOptions,
    ...restOverrides,
    commandPanelInheritedHeight,
    commandPanelLockedHeight,
    flowPanelInheritedHeight,
    flowPanelLockedHeight
  };

  return {
    controller: createWindowSizingController(options),
    options,
    state: {
      commandPanelInheritedHeight,
      commandPanelLockedHeight,
      flowPanelInheritedHeight,
      flowPanelLockedHeight
    },
    spies: {
      requestAnimateMainWindowSize
    }
  };
}

function createFlowHarness({ lastFrameHeight = 420 } = {}) {
  const drawerOpen = ref(false);
  const drawerViewportHeight = ref(0);
  const searchPanelEffectiveHeight = ref(lastFrameHeight);
  const pendingCommand = ref<unknown>(null);
  const stagingExpanded = ref(false);

  const harness = createWindowSizingHarness({
    commandPanelInheritedHeight: ref<number | null>(null),
    commandPanelLockedHeight: ref<number | null>(null),
    flowPanelInheritedHeight: ref<number | null>(null),
    flowPanelLockedHeight: ref<number | null>(null),
    drawerOpen,
    drawerViewportHeight,
    searchPanelEffectiveHeight,
    pendingCommand,
    stagingExpanded,
    stagingPanelRef: ref(null)
  });
  return {
    ...harness,
    lastFrameHeight,
    state: {
      ...harness.state,
      drawerOpen,
      drawerViewportHeight,
      searchPanelEffectiveHeight,
      pendingCommand,
      stagingExpanded
    }
  };
}

function createCommandHarness({ lastFrameHeight = 520 } = {}) {
  const drawerOpen = ref(false);
  const drawerViewportHeight = ref(0);
  const searchPanelEffectiveHeight = ref(lastFrameHeight);
  const pendingCommand = ref<unknown>(null);

  const harness = createWindowSizingHarness({
    commandPanelInheritedHeight: ref<number | null>(null),
    commandPanelLockedHeight: ref<number | null>(null),
    flowPanelInheritedHeight: ref<number | null>(null),
    flowPanelLockedHeight: ref<number | null>(null),
    drawerOpen,
    drawerViewportHeight,
    searchPanelEffectiveHeight,
    pendingCommand
  });
  return {
    ...harness,
    lastFrameHeight,
    state: {
      ...harness.state,
      drawerOpen,
      drawerViewportHeight,
      searchPanelEffectiveHeight,
      pendingCommand
    }
  };
}

function mockElementHeight(element: HTMLElement, height: number, scrollHeight = height): void {
  Object.defineProperty(element, "offsetHeight", {
    configurable: true,
    value: height
  });
  Object.defineProperty(element, "clientHeight", {
    configurable: true,
    value: height
  });
  Object.defineProperty(element, "scrollHeight", {
    configurable: true,
    value: scrollHeight
  });
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () => createDomRect({ height })
  });
}

function buildCommandPanelShellForLock(input: {
  headerHeight: number;
  contentScrollHeight: number;
  footerHeight: number;
  dividerHeights: [number, number];
}): HTMLElement {
  const shell = document.createElement("div");
  const panel = document.createElement("section");
  panel.className = "command-panel";

  const header = document.createElement("header");
  header.className = "command-panel__header";
  mockElementHeight(header, input.headerHeight);

  const dividerTop = document.createElement("div");
  dividerTop.className = "command-panel__divider";
  mockElementHeight(dividerTop, input.dividerHeights[0]);

  const content = document.createElement("div");
  content.className = "command-panel__content";
  mockElementHeight(content, input.contentScrollHeight, input.contentScrollHeight);

  const dividerBottom = document.createElement("div");
  dividerBottom.className = "command-panel__divider";
  mockElementHeight(dividerBottom, input.dividerHeights[1]);

  const footer = document.createElement("footer");
  footer.className = "command-panel__footer";
  mockElementHeight(footer, input.footerHeight);

  panel.appendChild(header);
  panel.appendChild(dividerTop);
  panel.appendChild(content);
  panel.appendChild(dividerBottom);
  panel.appendChild(footer);
  shell.appendChild(panel);
  document.body.appendChild(shell);

  return shell;
}

function buildFlowPanelShellForLock(input: {
  headerHeight: number;
  footerHeight: number;
  cardHeights: number[];
  itemHeights?: number[];
  listClientHeight?: number;
  listScrollHeight?: number;
}): HTMLElement {
  const shell = document.createElement("div");
  const panel = document.createElement("section");
  panel.className = "flow-panel";

  const header = document.createElement("header");
  header.className = "flow-panel__header";
  mockElementHeight(header, input.headerHeight);

  const body = document.createElement("div");
  body.className = "flow-panel__body";
  body.style.paddingTop = "12px";
  body.style.paddingBottom = "12px";
  body.style.paddingLeft = "16px";
  body.style.paddingRight = "16px";

  const list = document.createElement("ul");
  list.className = "flow-panel__list";
  list.style.display = "flex";
  list.style.flexDirection = "column";
  list.style.rowGap = "8px";
  let currentTop = 0;
  input.cardHeights.forEach((height, index) => {
    const item = document.createElement("li");
    item.className = "flow-panel__list-item";
    item.dataset.stagingIndex = String(index);
    const itemHeight = input.itemHeights?.[index] ?? height;
    const itemTop = currentTop;
    Object.defineProperty(item, "offsetHeight", {
      configurable: true,
      value: itemHeight
    });
    Object.defineProperty(item, "clientHeight", {
      configurable: true,
      value: itemHeight
    });
    Object.defineProperty(item, "scrollHeight", {
      configurable: true,
      value: itemHeight
    });
    Object.defineProperty(item, "getBoundingClientRect", {
      configurable: true,
      value: () => createDomRect({ top: itemTop, bottom: itemTop + itemHeight, height: itemHeight })
    });

    const card = document.createElement("article");
    card.className = "flow-panel__card staging-card";
    mockElementHeight(card, height, height);

    item.appendChild(card);
    list.appendChild(item);
    currentTop += itemHeight + 8;
  });
  if (
    typeof input.listClientHeight === "number" ||
    typeof input.listScrollHeight === "number"
  ) {
    mockElementHeight(
      list,
      input.listClientHeight ?? input.listScrollHeight ?? 0,
      input.listScrollHeight ?? input.listClientHeight ?? 0
    );
  }
  body.appendChild(list);

  const footer = document.createElement("footer");
  footer.className = "flow-panel__footer";
  mockElementHeight(footer, input.footerHeight);

  panel.appendChild(header);
  panel.appendChild(body);
  panel.appendChild(footer);
  shell.appendChild(panel);
  document.body.appendChild(shell);

  return panel;
}

async function seedLegacyLastWindowSizeViaEstimatedFallback(input: {
  drawerOpen: { value: boolean };
  drawerViewportHeight: { value: number };
  searchPanelEffectiveHeight: { value: number };
  syncWindowSize: () => Promise<void>;
  clearAnimateSpy: () => void;
  drawerViewportHeightForSeed?: number;
}): Promise<void> {
  const drawerViewportHeightForSeed = input.drawerViewportHeightForSeed ?? 200;

  input.drawerOpen.value = true;
  input.drawerViewportHeight.value = drawerViewportHeightForSeed;
  // 用 NaN 强制走估算 fallback 路径，复现旧口径把 breathing 带入 lastWindowSize 的污染。
  input.searchPanelEffectiveHeight.value = Number.NaN;
  await input.syncWindowSize();
  input.clearAnimateSpy();
}

function createCommandAndFlowHarness() {
  const commandPanelInheritedHeight = ref<number | null>(560);
  const commandPanelLockedHeight = ref<number | null>(560);
  const flowPanelInheritedHeight = ref<number | null>(420);
  const flowPanelLockedHeight = ref<number | null>(608);
  const stagingExpanded = ref(true);
  const pendingCommand = ref<unknown>({ id: "pending" });
  const harness = createWindowSizingHarness({
    commandPanelInheritedHeight,
    commandPanelLockedHeight,
    flowPanelInheritedHeight,
    flowPanelLockedHeight,
    stagingExpanded,
    pendingCommand
  });
  return {
    ...harness,
    state: {
      ...harness.state,
      stagingExpanded,
      pendingCommand
    }
  };
}

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

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

function createExitHarness() {
  const drawerOpen = ref(false);
  const drawerViewportHeight = ref(0);
  const pendingCommand = ref<unknown>({ id: "pending" });
  const commandPanelInheritedHeight = ref<number | null>(520);
  const commandPanelLockedHeight = ref<number | null>(null);
  const flowPanelInheritedHeight = ref<number | null>(null);
  const flowPanelLockedHeight = ref<number | null>(null);

  const requestAnimateMainWindowSize = vi.fn<
    UseWindowSizingOptions["requestAnimateMainWindowSize"]
  >(async (_width, _height) => {});

  const options: UseWindowSizingOptions = {
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
    commandPanelInheritedHeight,
    commandPanelLockedHeight,
    flowPanelInheritedHeight,
    flowPanelLockedHeight,
    drawerOpen,
    drawerViewportHeight,
    searchPanelEffectiveHeight: ref(WINDOW_SIZING_CONSTANTS.windowBaseHeight),
    sharedPanelMaxHeight: ref(LAUNCHER_FRAME_DESIGN_CAP_PX),
    searchMainWidth: ref(680),
    minShellWidth: ref(0),
    windowWidthCap: ref(2000),
    windowHeightCap: ref(2000),
    scheduleSearchInputFocus: () => {},
    loadSettings: () => {}
  };
  const controller = createWindowSizingController(options);

  return {
    controller,
    options,
    state: {
      drawerOpen,
      drawerViewportHeight,
      pendingCommand,
      commandPanelInheritedHeight,
      commandPanelLockedHeight,
      flowPanelInheritedHeight,
      flowPanelLockedHeight
    },
    spies: {
      requestAnimateMainWindowSize
    }
  };
}

describe("createWindowSizingController（CommandPanel floor 捕获）", () => {
  it("进入 CommandPanel 时若 lastWindowSize 为空：首帧仍继承 searchPanelEffectiveHeight，而不是回退到 paramOverlayMinHeight", async () => {
    const drawerOpen = ref(true);
    const drawerViewportHeight = ref(5_000);
    const pendingCommand = ref<unknown>({ id: "pending" });
    const commandPanelInheritedHeight = ref<number | null>(null);
    const commandPanelLockedHeight = ref<number | null>(null);
    const flowPanelInheritedHeight = ref<number | null>(null);
    const flowPanelLockedHeight = ref<number | null>(null);

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
      commandPanelInheritedHeight,
      commandPanelLockedHeight,
      flowPanelInheritedHeight,
      flowPanelLockedHeight,
      drawerOpen,
      drawerViewportHeight,
      searchPanelEffectiveHeight: ref(SEARCH_CAPSULE_HEIGHT_PX),
      sharedPanelMaxHeight: ref(LAUNCHER_FRAME_DESIGN_CAP_PX),
      searchMainWidth: ref(680),
      minShellWidth: ref(0),
      windowWidthCap: ref(2000),
      windowHeightCap: ref(2000),
      scheduleSearchInputFocus: () => {},
      loadSettings: () => {}
    });

    // 在 nextTick 前切换到“参数面板”布局：Search -> Command 冷启动时应沿用 Search 有效高度。
    queueMicrotask(() => {
      drawerOpen.value = false;
      drawerViewportHeight.value = 0;
    });

    await controller.syncWindowSize();

    expect(requestAnimateMainWindowSize).toHaveBeenCalled();
    const lastCall = requestAnimateMainWindowSize.mock.calls.at(-1);
    expect(commandPanelInheritedHeight.value).toBe(SEARCH_CAPSULE_HEIGHT_PX);
    expect(lastCall?.[1]).toBe(
      SEARCH_CAPSULE_HEIGHT_PX +
        UI_TOP_ALIGN_OFFSET_PX_FALLBACK +
        SEARCH_SHELL_OUTER_CHROME_PX
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
      commandPanelInheritedHeight: ref<number | null>(null),
      commandPanelLockedHeight: ref<number | null>(null),
      flowPanelInheritedHeight: ref<number | null>(null),
      flowPanelLockedHeight: ref<number | null>(null),
      drawerOpen: ref(false),
      drawerViewportHeight: ref(0),
      searchPanelEffectiveHeight: ref(WINDOW_SIZING_CONSTANTS.windowBaseHeight),
      sharedPanelMaxHeight: ref(LAUNCHER_FRAME_DESIGN_CAP_PX),
      searchMainWidth: ref(680),
      minShellWidth: ref(0),
      windowWidthCap: ref(2000),
      windowHeightCap: ref(2000),
      scheduleSearchInputFocus: () => {},
      loadSettings: () => {}
    });

    await controller.syncWindowSize();

    expect(requestAnimateMainWindowSize).toHaveBeenCalled();
    expect(shell.style.getPropertyValue("--launcher-frame-height")).toBe("296px");

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
      WINDOW_SIZING_CONSTANTS.windowBaseHeight +
        UI_TOP_ALIGN_OFFSET_PX_FALLBACK +
        SEARCH_SHELL_OUTER_CHROME_PX
    );

    harness.controller.notifySearchPageSettled();
    await harness.controller.syncWindowSize();

    expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenLastCalledWith(
      expect.any(Number),
      WINDOW_SIZING_CONSTANTS.windowBaseHeight +
        UI_TOP_ALIGN_OFFSET_PX_FALLBACK +
        SEARCH_SHELL_OUTER_CHROME_PX
    );
    expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenCalledTimes(1);
  });

  it("requestCommandPanelExit 的恢复链路完成前保留 Command session，完成后再清理", async () => {
    const harness = createExitHarness();

    await harness.controller.syncWindowSize();
    harness.controller.requestCommandPanelExit();
    harness.state.pendingCommand.value = null;

    await harness.controller.syncWindowSize();
    expect(harness.state.commandPanelInheritedHeight.value).toBe(520);
    expect(harness.state.commandPanelLockedHeight.value).toBeNull();

    harness.controller.notifySearchPageSettled();
    await harness.controller.syncWindowSize();

    expect(harness.state.commandPanelInheritedHeight.value).toBeNull();
    expect(harness.state.commandPanelLockedHeight.value).toBeNull();
  });

  it("重复 requestCommandPanelExit 不会产生额外回落动画（幂等）", async () => {
    const harness = createExitHarness();

    await harness.controller.syncWindowSize();
    harness.spies.requestAnimateMainWindowSize.mockClear();

    harness.controller.requestCommandPanelExit();
    harness.controller.requestCommandPanelExit();
    harness.state.pendingCommand.value = null;
    harness.state.drawerOpen.value = false;
    harness.state.drawerViewportHeight.value = 0;

    await harness.controller.syncWindowSize();
    expect(harness.spies.requestAnimateMainWindowSize).not.toHaveBeenCalledWith(
      expect.any(Number),
      WINDOW_SIZING_CONSTANTS.windowBaseHeight +
        UI_TOP_ALIGN_OFFSET_PX_FALLBACK +
        SEARCH_SHELL_OUTER_CHROME_PX
    );

    harness.controller.notifySearchPageSettled();
    await harness.controller.syncWindowSize();
    harness.controller.notifySearchPageSettled();
    await harness.controller.syncWindowSize();

    expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenLastCalledWith(
      expect.any(Number),
      WINDOW_SIZING_CONSTANTS.windowBaseHeight +
        UI_TOP_ALIGN_OFFSET_PX_FALLBACK +
        SEARCH_SHELL_OUTER_CHROME_PX
    );
    expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenCalledTimes(1);
  });

  it("search-settling 恢复目标不会读取旧 shell 实测高度", async () => {
    const root = document.createElement("main");
    const shell = document.createElement("div");
    const dragStrip = document.createElement("div");
    dragStrip.className = "shell-drag-strip";
    shell.appendChild(dragStrip);
    root.appendChild(shell);
    document.body.appendChild(root);

    vi.spyOn(root, "getBoundingClientRect").mockReturnValue(
      createDomRect({ top: 0, bottom: 1_000, height: 1_000 })
    );
    vi.spyOn(shell, "getBoundingClientRect").mockReturnValue(
      createDomRect({ top: 0, bottom: 430, height: 430 })
    );
    vi.spyOn(dragStrip, "getBoundingClientRect").mockReturnValue(
      createDomRect({ top: 0, bottom: UI_TOP_ALIGN_OFFSET_PX_FALLBACK, height: UI_TOP_ALIGN_OFFSET_PX_FALLBACK })
    );

    const harness = createExitHarness();
    harness.options.searchShellRef.value = shell;

    await harness.controller.syncWindowSize();
    harness.spies.requestAnimateMainWindowSize.mockClear();

    harness.controller.requestCommandPanelExit();
    harness.state.pendingCommand.value = null;
    harness.state.drawerOpen.value = false;
    harness.state.drawerViewportHeight.value = 0;

    await harness.controller.syncWindowSize();
    harness.controller.notifySearchPageSettled();
    await harness.controller.syncWindowSize();

    expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenLastCalledWith(
      expect.any(Number),
      WINDOW_SIZING_CONSTANTS.windowBaseHeight +
        UI_TOP_ALIGN_OFFSET_PX_FALLBACK +
        SEARCH_SHELL_OUTER_CHROME_PX
    );
  });

  it("Command 上打开 Flow 并补高时，launcher-frame height 不应回写旧 DOM 高度", async () => {
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

    const rootHeight = 360 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK + SEARCH_SHELL_OUTER_CHROME_PX;
    vi.spyOn(root, "getBoundingClientRect").mockImplementation(() =>
      createDomRect({ top: 0, height: rootHeight })
    );
    vi.spyOn(frame, "getBoundingClientRect").mockReturnValue(
      createDomRect({ top: 26 })
    );
    vi.spyOn(dragStrip, "getBoundingClientRect").mockReturnValue(
      createDomRect({ height: UI_TOP_ALIGN_OFFSET_PX_FALLBACK })
    );

    const harness = createWindowSizingHarness({
      searchShellRef: ref(shell),
      pendingCommand: ref<unknown>({ id: "pending" }),
      commandPanelInheritedHeight: ref<number | null>(360),
      commandPanelLockedHeight: ref<number | null>(360),
      flowPanelInheritedHeight: ref<number | null>(null),
      flowPanelLockedHeight: ref<number | null>(null),
      stagingExpanded: ref(false),
      searchPanelEffectiveHeight: ref(280)
    });

    await harness.controller.syncWindowSize();
    harness.spies.requestAnimateMainWindowSize.mockClear();

    harness.options.stagingExpanded.value = true;
    await harness.controller.syncWindowSize();
    harness.controller.notifyFlowPanelSettled();
    await harness.controller.syncWindowSize();

    expect(harness.state.flowPanelLockedHeight.value).toBe(406);
    expect(shell.style.getPropertyValue("--launcher-frame-height")).toBe("406px");
  });

  it("Flow 从 Command 关闭回落时，launcher-frame height 不应滞留在旧的 Flow 高度", async () => {
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

    const rootHeight = 406 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK + SEARCH_SHELL_OUTER_CHROME_PX;
    vi.spyOn(root, "getBoundingClientRect").mockImplementation(() =>
      createDomRect({ top: 0, height: rootHeight })
    );
    vi.spyOn(frame, "getBoundingClientRect").mockReturnValue(
      createDomRect({ top: 26 })
    );
    vi.spyOn(dragStrip, "getBoundingClientRect").mockReturnValue(
      createDomRect({ height: UI_TOP_ALIGN_OFFSET_PX_FALLBACK })
    );

    const harness = createWindowSizingHarness({
      searchShellRef: ref(shell),
      pendingCommand: ref<unknown>({ id: "pending" }),
      commandPanelInheritedHeight: ref<number | null>(360),
      commandPanelLockedHeight: ref<number | null>(360),
      flowPanelInheritedHeight: ref<number | null>(360),
      flowPanelLockedHeight: ref<number | null>(406),
      stagingExpanded: ref(true),
      searchPanelEffectiveHeight: ref(280)
    });

    await harness.controller.syncWindowSize();
    harness.spies.requestAnimateMainWindowSize.mockClear();

    harness.options.stagingExpanded.value = false;
    await harness.controller.syncWindowSize();

    expect(shell.style.getPropertyValue("--launcher-frame-height")).toBe("360px");
  });
});

describe("createWindowSizingController（Flow 会话）", () => {
  it("Search -> Flow 继续跟随当前 Search 有效高度，不携带 breathing", async () => {
    const harness = createFlowHarness({ lastFrameHeight: 0 });

    await seedLegacyLastWindowSizeViaEstimatedFallback({
      drawerOpen: harness.state.drawerOpen,
      drawerViewportHeight: harness.state.drawerViewportHeight,
      searchPanelEffectiveHeight: harness.state.searchPanelEffectiveHeight,
      syncWindowSize: () => harness.controller.syncWindowSize(),
      clearAnimateSpy: () => harness.spies.requestAnimateMainWindowSize.mockClear()
    });

    // 新口径：Search 有效高度不含 breathing。
    harness.state.searchPanelEffectiveHeight.value = 280;
    harness.state.drawerOpen.value = false;
    harness.state.drawerViewportHeight.value = 0;
    harness.state.stagingExpanded.value = true;
    await harness.controller.syncWindowSize();

    expect(harness.state.flowPanelInheritedHeight.value).toBe(280);
    expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenCalledTimes(1);
    const firstResizeCall = harness.spies.requestAnimateMainWindowSize.mock.calls[0];
    expect(firstResizeCall?.[1]).toBe(
      280 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK + SEARCH_SHELL_OUTER_CHROME_PX
    );
  });

  it("搜索 -> Flow：先继承搜索当前高度，settled 后仅在不足时补高一次", async () => {
    const harness = createFlowHarness({ lastFrameHeight: SEARCH_CAPSULE_HEIGHT_PX });
    const expectedFlowMinHeight =
      WINDOW_SIZING_CONSTANTS.stagingChromeHeight +
      WINDOW_SIZING_CONSTANTS.stagingCardEstHeight * 2 +
      WINDOW_SIZING_CONSTANTS.stagingListGap;

    harness.state.stagingExpanded.value = true;
    await harness.controller.syncWindowSize();

    expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenLastCalledWith(
      expect.any(Number),
      SEARCH_CAPSULE_HEIGHT_PX +
        UI_TOP_ALIGN_OFFSET_PX_FALLBACK +
        SEARCH_SHELL_OUTER_CHROME_PX
    );

    harness.controller.notifyFlowPanelSettled();
    await harness.controller.syncWindowSize();

    expect(harness.state.flowPanelLockedHeight.value).toBe(expectedFlowMinHeight);
    expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenLastCalledWith(
      expect.any(Number),
      expectedFlowMinHeight +
        UI_TOP_ALIGN_OFFSET_PX_FALLBACK +
        SEARCH_SHELL_OUTER_CHROME_PX
    );
  });

  it("搜索 -> Flow settled 后若已有真实卡片实测，则按 header + 前两张卡片 + footer 精准锁高", async () => {
    const harness = createFlowHarness({ lastFrameHeight: SEARCH_CAPSULE_HEIGHT_PX });
    harness.options.stagingPanelRef.value = buildFlowPanelShellForLock({
      headerHeight: 52,
      footerHeight: 60,
      cardHeights: [96, 124, 180]
    });

    harness.state.stagingExpanded.value = true;
    await harness.controller.syncWindowSize();
    harness.controller.notifyFlowPanelSettled();
    await harness.controller.syncWindowSize();

    expect(harness.state.flowPanelLockedHeight.value).toBe(364);
    expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenLastCalledWith(
      expect.any(Number),
      364 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK + SEARCH_SHELL_OUTER_CHROME_PX
    );
  });

  it("搜索 -> Flow settled 后若 list-item 外层高于内层 card，则按前两项真实排版跨度锁高", async () => {
    const harness = createFlowHarness({ lastFrameHeight: SEARCH_CAPSULE_HEIGHT_PX });
    harness.options.stagingPanelRef.value = buildFlowPanelShellForLock({
      headerHeight: 52,
      footerHeight: 60,
      cardHeights: [168, 220, 180],
      itemHeights: [170, 222, 180]
    });

    harness.state.stagingExpanded.value = true;
    await harness.controller.syncWindowSize();
    harness.controller.notifyFlowPanelSettled();
    await harness.controller.syncWindowSize();

    expect(harness.state.flowPanelLockedHeight.value).toBe(536);
    expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenLastCalledWith(
      expect.any(Number),
      536 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK + SEARCH_SHELL_OUTER_CHROME_PX
    );
  });

  it("搜索 -> Flow settled 后应把 flow-panel 外框上下 border 计入最终锁高", async () => {
    const harness = createFlowHarness({ lastFrameHeight: SEARCH_CAPSULE_HEIGHT_PX });
    const flowPanel = buildFlowPanelShellForLock({
      headerHeight: 52,
      footerHeight: 60,
      cardHeights: [168, 220, 180]
    });
    flowPanel.style.borderTop = "1px solid rgba(255, 255, 255, 0.14)";
    flowPanel.style.borderBottom = "1px solid rgba(255, 255, 255, 0.14)";
    harness.options.stagingPanelRef.value = flowPanel;

    harness.state.stagingExpanded.value = true;
    await harness.controller.syncWindowSize();
    harness.controller.notifyFlowPanelSettled();
    await harness.controller.syncWindowSize();

    expect(harness.state.flowPanelLockedHeight.value).toBe(534);
    expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenLastCalledWith(
      expect.any(Number),
      534 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK + SEARCH_SHELL_OUTER_CHROME_PX
    );
  });

  it("搜索 -> Flow settled 后若 list 仅残留 1px 滚动余量，应继续向上补这 1px", async () => {
    const harness = createFlowHarness({ lastFrameHeight: SEARCH_CAPSULE_HEIGHT_PX });
    const flowPanel = buildFlowPanelShellForLock({
      headerHeight: 52,
      footerHeight: 60,
      cardHeights: [168, 220, 180],
      listClientHeight: 395,
      listScrollHeight: 396
    });
    flowPanel.style.borderTop = "1px solid rgba(255, 255, 255, 0.14)";
    flowPanel.style.borderBottom = "1px solid rgba(255, 255, 255, 0.14)";
    harness.options.stagingPanelRef.value = flowPanel;

    harness.state.stagingExpanded.value = true;
    await harness.controller.syncWindowSize();
    harness.controller.notifyFlowPanelSettled();
    await harness.controller.syncWindowSize();

    expect(harness.state.flowPanelLockedHeight.value).toBe(535);
    expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenLastCalledWith(
      expect.any(Number),
      535 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK + SEARCH_SHELL_OUTER_CHROME_PX
    );
  });

  it("Search -> Flow 补高后，search-shell 必须同步 launcher-frame height", async () => {
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

    vi.spyOn(root, "getBoundingClientRect").mockImplementation(() =>
      createDomRect({
        top: 0,
        height:
          SEARCH_CAPSULE_HEIGHT_PX +
          UI_TOP_ALIGN_OFFSET_PX_FALLBACK +
          SEARCH_SHELL_OUTER_CHROME_PX
      })
    );
    vi.spyOn(frame, "getBoundingClientRect").mockReturnValue(
      createDomRect({ top: 26, height: SEARCH_CAPSULE_HEIGHT_PX })
    );
    vi.spyOn(dragStrip, "getBoundingClientRect").mockReturnValue(
      createDomRect({ height: UI_TOP_ALIGN_OFFSET_PX_FALLBACK })
    );

    const harness = createFlowHarness({ lastFrameHeight: SEARCH_CAPSULE_HEIGHT_PX });
    harness.options.searchShellRef.value = shell;
    const expectedFlowMinHeight =
      WINDOW_SIZING_CONSTANTS.stagingChromeHeight +
      WINDOW_SIZING_CONSTANTS.stagingCardEstHeight * 2 +
      WINDOW_SIZING_CONSTANTS.stagingListGap;

    harness.state.stagingExpanded.value = true;
    await harness.controller.syncWindowSize();
    harness.controller.notifyFlowPanelSettled();
    await harness.controller.syncWindowSize();

    expect(shell.style.getPropertyValue("--launcher-frame-height")).toBe(
      `${expectedFlowMinHeight}px`
    );
  });

  it("搜索 -> Flow 因最小高度被补高后，关闭 Flow 会恢复到打开前的 Search 高度", async () => {
    const harness = createFlowHarness({ lastFrameHeight: 280 });
    const expectedFlowMinHeight =
      WINDOW_SIZING_CONSTANTS.stagingChromeHeight +
      WINDOW_SIZING_CONSTANTS.stagingCardEstHeight * 2 +
      WINDOW_SIZING_CONSTANTS.stagingListGap;

    await harness.controller.syncWindowSize();
    harness.spies.requestAnimateMainWindowSize.mockClear();

    harness.state.stagingExpanded.value = true;
    await harness.controller.syncWindowSize();
    harness.controller.notifyFlowPanelSettled();
    await harness.controller.syncWindowSize();

    expect(harness.state.flowPanelLockedHeight.value).toBe(expectedFlowMinHeight);
    expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenLastCalledWith(
      expect.any(Number),
      expectedFlowMinHeight +
        UI_TOP_ALIGN_OFFSET_PX_FALLBACK +
        SEARCH_SHELL_OUTER_CHROME_PX
    );

    harness.state.stagingExpanded.value = false;
    await harness.controller.syncWindowSize();

    expect(harness.state.flowPanelInheritedHeight.value).toBeNull();
    expect(harness.state.flowPanelLockedHeight.value).toBeNull();
    expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenLastCalledWith(
      expect.any(Number),
      280 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK + SEARCH_SHELL_OUTER_CHROME_PX
    );
  });

  it("Flow 打开时继承当前 frame height，未 settled 前不读旧列表估算", async () => {
    const harness = createFlowHarness({ lastFrameHeight: 420 });

    // 先用搜索页口径 seed 上一帧高度（420），确保前置条件来自公开 sizing 输入
    await harness.controller.syncWindowSize();
    expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenLastCalledWith(
      expect.any(Number),
      harness.lastFrameHeight +
        UI_TOP_ALIGN_OFFSET_PX_FALLBACK +
        SEARCH_SHELL_OUTER_CHROME_PX
    );
    harness.spies.requestAnimateMainWindowSize.mockClear();

    // 切换到 Command + Flow，预期仍先沿用当前 frame height，直到各自 settled。
    harness.state.pendingCommand.value = { id: "pending" };
    harness.state.drawerOpen.value = false;
    harness.state.drawerViewportHeight.value = 0;
    harness.state.stagingExpanded.value = true;
    await harness.controller.syncWindowSize();

    expect(harness.spies.requestAnimateMainWindowSize).not.toHaveBeenCalled();
    expect(harness.state.flowPanelInheritedHeight.value).toBe(harness.lastFrameHeight);
    expect(harness.state.flowPanelLockedHeight.value).toBeNull();
  });

  it("notifyFlowPanelSettled 首次写入 flowPanelLockedHeight，再次通知不覆写已锁高度", async () => {
    const harness = createFlowHarness({ lastFrameHeight: 420 });

    await harness.controller.syncWindowSize();
    harness.state.drawerOpen.value = false;
    harness.state.drawerViewportHeight.value = 0;
    harness.state.stagingExpanded.value = true;

    await harness.controller.syncWindowSize();
    expect(harness.state.flowPanelLockedHeight.value).toBeNull();

    harness.controller.notifyFlowPanelSettled();
    await harness.controller.syncWindowSize();

    expect(harness.state.flowPanelLockedHeight.value).toBe(harness.lastFrameHeight);

    harness.state.flowPanelInheritedHeight.value = 640;
    harness.controller.notifyFlowPanelSettled();
    await harness.controller.syncWindowSize();

    expect(harness.state.flowPanelLockedHeight.value).toBe(harness.lastFrameHeight);
  });

  it("Flow settled 后在短时观察窗口内允许按最新实测继续补高，稳定后冻结", async () => {
    vi.useFakeTimers();

    const harness = createFlowHarness({ lastFrameHeight: SEARCH_CAPSULE_HEIGHT_PX });
    harness.options.stagingPanelRef.value = buildFlowPanelShellForLock({
      headerHeight: 52,
      footerHeight: 60,
      cardHeights: [96, 124, 180]
    });

    harness.state.stagingExpanded.value = true;
    await harness.controller.syncWindowSize();
    harness.controller.notifyFlowPanelSettled();
    await harness.controller.syncWindowSize();

    expect(harness.state.flowPanelLockedHeight.value).toBe(364);

    harness.options.stagingPanelRef.value = buildFlowPanelShellForLock({
      headerHeight: 52,
      footerHeight: 60,
      cardHeights: [96, 160, 180]
    });
    harness.controller.notifyFlowPanelHeightChange();
    await harness.controller.syncWindowSize();

    expect(harness.state.flowPanelLockedHeight.value).toBe(400);

    vi.runOnlyPendingTimers();

    harness.options.stagingPanelRef.value = buildFlowPanelShellForLock({
      headerHeight: 52,
      footerHeight: 60,
      cardHeights: [96, 200, 180]
    });
    harness.controller.notifyFlowPanelHeightChange();
    await harness.controller.syncWindowSize();

    expect(harness.state.flowPanelLockedHeight.value).toBe(400);
    harness.controller.clearResizeTimer();
  });

  it("Flow 关闭时只清 Flow 状态，不污染 command 锁高", async () => {
    const harness = createCommandAndFlowHarness();

    harness.options.stagingExpanded.value = false;
    await harness.controller.syncWindowSize();

    expect(harness.state.commandPanelLockedHeight.value).toBe(560);
    expect(harness.state.flowPanelInheritedHeight.value).toBeNull();
    expect(harness.state.flowPanelLockedHeight.value).toBeNull();
  });

  it("Command -> Flow -> 关闭 Flow：恢复 commandPanelLockedHeight 语义", async () => {
    const harness = createCommandAndFlowHarness();

    harness.state.stagingExpanded.value = true;
    await harness.controller.syncWindowSize();
    harness.controller.notifyFlowPanelSettled();
    await harness.controller.syncWindowSize();

    expect(harness.state.commandPanelLockedHeight.value).toBe(560);
    expect(harness.state.flowPanelLockedHeight.value).not.toBeNull();

    harness.state.stagingExpanded.value = false;
    await harness.controller.syncWindowSize();

    expect(harness.state.commandPanelLockedHeight.value).toBe(560);
    expect(harness.state.flowPanelInheritedHeight.value).toBeNull();
    expect(harness.state.flowPanelLockedHeight.value).toBeNull();
    expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenLastCalledWith(
      expect.any(Number),
      LAUNCHER_FRAME_DESIGN_CAP_PX +
        UI_TOP_ALIGN_OFFSET_PX_FALLBACK +
        SEARCH_SHELL_OUTER_CHROME_PX
    );
  });

  it("Command -> Flow 因最小高度被补高后，关闭 Flow 会恢复到打开前的 Command 高度", async () => {
    const commandPanelInheritedHeight = ref<number | null>(360);
    const commandPanelLockedHeight = ref<number | null>(360);
    const flowPanelInheritedHeight = ref<number | null>(null);
    const flowPanelLockedHeight = ref<number | null>(null);
    const stagingExpanded = ref(false);
    const pendingCommand = ref<unknown>({ id: "pending" });
    const expectedFlowMinHeight =
      WINDOW_SIZING_CONSTANTS.stagingChromeHeight +
      WINDOW_SIZING_CONSTANTS.stagingCardEstHeight * 2 +
      WINDOW_SIZING_CONSTANTS.stagingListGap;

    const harness = createWindowSizingHarness({
      commandPanelInheritedHeight,
      commandPanelLockedHeight,
      flowPanelInheritedHeight,
      flowPanelLockedHeight,
      stagingExpanded,
      pendingCommand,
      searchPanelEffectiveHeight: ref(280)
    });

    await harness.controller.syncWindowSize();
    harness.spies.requestAnimateMainWindowSize.mockClear();

    stagingExpanded.value = true;
    await harness.controller.syncWindowSize();
    harness.controller.notifyFlowPanelSettled();
    await harness.controller.syncWindowSize();

    expect(flowPanelLockedHeight.value).toBe(expectedFlowMinHeight);
    expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenLastCalledWith(
      expect.any(Number),
      expectedFlowMinHeight +
        UI_TOP_ALIGN_OFFSET_PX_FALLBACK +
        SEARCH_SHELL_OUTER_CHROME_PX
    );

    stagingExpanded.value = false;
    await harness.controller.syncWindowSize();

    expect(commandPanelLockedHeight.value).toBe(360);
    expect(flowPanelInheritedHeight.value).toBeNull();
    expect(flowPanelLockedHeight.value).toBeNull();
    expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenLastCalledWith(
      expect.any(Number),
      360 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK + SEARCH_SHELL_OUTER_CHROME_PX
    );
  });
});

describe("createWindowSizingController（Command settled 锁高）", () => {
  it("搜索页底部呼吸留白不进入 commandPanelInheritedHeight", async () => {
    const harness = createCommandHarness({ lastFrameHeight: 0 });

    await seedLegacyLastWindowSizeViaEstimatedFallback({
      drawerOpen: harness.state.drawerOpen,
      drawerViewportHeight: harness.state.drawerViewportHeight,
      searchPanelEffectiveHeight: harness.state.searchPanelEffectiveHeight,
      syncWindowSize: () => harness.controller.syncWindowSize(),
      clearAnimateSpy: () => harness.spies.requestAnimateMainWindowSize.mockClear()
    });

    // 新口径：Search 有效高度不含 breathing。
    harness.state.searchPanelEffectiveHeight.value = 300;
    harness.state.pendingCommand.value = { id: "pending" };
    harness.state.drawerOpen.value = false;
    harness.state.drawerViewportHeight.value = 0;
    await harness.controller.syncWindowSize();

    expect(harness.state.commandPanelInheritedHeight.value).toBe(300);
    expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenCalledTimes(1);
    const firstResizeCall = harness.spies.requestAnimateMainWindowSize.mock.calls[0];
    expect(firstResizeCall?.[1]).toBe(
      300 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK + SEARCH_SHELL_OUTER_CHROME_PX
    );
  });

  it("Search -> Command 首帧先继承 searchPanelEffectiveHeight，不够完整盒子时才补高", async () => {
    const harness = createCommandHarness({ lastFrameHeight: 0 });

    await seedLegacyLastWindowSizeViaEstimatedFallback({
      drawerOpen: harness.state.drawerOpen,
      drawerViewportHeight: harness.state.drawerViewportHeight,
      searchPanelEffectiveHeight: harness.state.searchPanelEffectiveHeight,
      syncWindowSize: () => harness.controller.syncWindowSize(),
      clearAnimateSpy: () => harness.spies.requestAnimateMainWindowSize.mockClear()
    });

    // Search -> Command 首帧：必须先继承 Search 有效高度。
    harness.state.searchPanelEffectiveHeight.value = 300;
    harness.state.pendingCommand.value = { id: "pending" };
    harness.state.drawerOpen.value = false;
    harness.state.drawerViewportHeight.value = 0;
    await harness.controller.syncWindowSize();

    expect(harness.state.commandPanelInheritedHeight.value).toBe(300);
    expect(harness.state.commandPanelLockedHeight.value).toBeNull();
    expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenCalledTimes(1);
    const firstResizeCall = harness.spies.requestAnimateMainWindowSize.mock.calls[0];
    expect(firstResizeCall?.[1]).toBe(
      300 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK + SEARCH_SHELL_OUTER_CHROME_PX
    );

    const commandShell = buildCommandPanelShellForLock({
      headerHeight: 52,
      contentScrollHeight: 240,
      footerHeight: 60,
      dividerHeights: [1, 1]
    });
    harness.options.searchShellRef.value = commandShell;

    // settled 后：只在完整盒子更高时补高（52 + 240 + 60 + 1 + 1 = 354）。
    harness.controller.notifyCommandPageSettled();
    await harness.controller.syncWindowSize();

    expect(harness.state.commandPanelLockedHeight.value).toBe(354);
    expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenCalledTimes(2);
    const secondResizeCall = harness.spies.requestAnimateMainWindowSize.mock.calls[1];
    expect(secondResizeCall?.[1]).toBe(
      354 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK + SEARCH_SHELL_OUTER_CHROME_PX
    );
  });

  it("notifyCommandPageSettled 首次写入 commandPanelLockedHeight，再次通知不覆写已锁高度", async () => {
    const harness = createCommandHarness({ lastFrameHeight: 520 });

    await harness.controller.syncWindowSize();
    harness.state.pendingCommand.value = { id: "pending" };
    harness.state.drawerOpen.value = false;
    harness.state.drawerViewportHeight.value = 0;

    await harness.controller.syncWindowSize();
    expect(harness.state.commandPanelLockedHeight.value).toBeNull();

    harness.controller.notifyCommandPageSettled();
    await harness.controller.syncWindowSize();

    expect(harness.state.commandPanelLockedHeight.value).toBe(harness.lastFrameHeight);

    harness.state.commandPanelInheritedHeight.value = 680;
    harness.controller.notifyCommandPageSettled();
    await harness.controller.syncWindowSize();

    expect(harness.state.commandPanelLockedHeight.value).toBe(harness.lastFrameHeight);
  });
});
