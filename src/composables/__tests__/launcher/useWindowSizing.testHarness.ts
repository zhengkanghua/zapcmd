import { computed, ref, type Ref } from "vue";
import { vi } from "vitest";

import {
  LAUNCHER_FRAME_DESIGN_CAP_PX,
  SEARCH_CAPSULE_HEIGHT_PX,
  WINDOW_SIZING_CONSTANTS
} from "../../launcher/useLauncherLayoutMetrics";
import { createWindowSizingController } from "../../launcher/useWindowSizing/controller";
import type { UseWindowSizingOptions } from "../../launcher/useWindowSizing/model";

export const SEARCH_SHELL_MARGIN_TOP_PX = 8;
export const SEARCH_SHELL_BREATHING_BOTTOM_PX = 8;
export const SEARCH_SHELL_OUTER_CHROME_PX =
  SEARCH_SHELL_MARGIN_TOP_PX + SEARCH_SHELL_BREATHING_BOTTOM_PX;

export type PanelHeightHarnessOverrides = Partial<UseWindowSizingOptions>;

export interface FlowRevealController {
  prepareFlowPanelReveal: () => Promise<void>;
}

export function createWindowSizingHarness(overrides: PanelHeightHarnessOverrides = {}) {
  const {
    commandPanelInheritedHeight = ref<number | null>(null),
    commandPanelLockedHeight = ref<number | null>(null),
    flowPanelInheritedHeight = ref<number | null>(null),
    flowPanelLockedHeight = ref<number | null>(null),
    ...restOverrides
  } = overrides;
  const pendingCommand = ref<unknown>({ id: "pending" });
  const requestAnimateMainWindowSize = vi.fn<UseWindowSizingOptions["requestAnimateMainWindowSize"]>(
    async (_width, _height) => {}
  );
  const requestResizeMainWindowForReveal = vi.fn<
    UseWindowSizingOptions["requestResizeMainWindowForReveal"]
  >(async (_width, _height) => {});

  const baseOptions: UseWindowSizingOptions = {
    constants: WINDOW_SIZING_CONSTANTS,
    isSettingsWindow: ref(false),
    isTauriRuntime: () => true,
    resolveAppWindow: () => null,
    requestSetMainWindowSize: async () => {},
    requestAnimateMainWindowSize,
    requestResizeMainWindowForReveal,
    searchShellRef: ref(null),
    stagingPanelRef: ref(null),
    stagingExpanded: ref(false),
    commandPageOpen: ref(pendingCommand.value !== null),
    pendingCommand,
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
  if (!("commandPageOpen" in overrides)) {
    options.commandPageOpen = computed(() => options.pendingCommand.value !== null);
  }

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
      requestAnimateMainWindowSize,
      requestResizeMainWindowForReveal
    }
  };
}

export function createFlowHarness({ lastFrameHeight = 420 } = {}) {
  const drawerOpen = ref(false);
  const drawerViewportHeight = ref(0);
  const searchPanelEffectiveHeight = ref(lastFrameHeight);
  const pendingCommand = ref<unknown>(null);
  const commandPageOpen = computed(() => pendingCommand.value !== null);
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
    commandPageOpen,
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
      commandPageOpen,
      stagingExpanded
    }
  };
}

export function createCommandHarness({ lastFrameHeight = 520 } = {}) {
  const drawerOpen = ref(false);
  const drawerViewportHeight = ref(0);
  const searchPanelEffectiveHeight = ref(lastFrameHeight);
  const pendingCommand = ref<unknown>(null);
  const commandPageOpen = computed(() => pendingCommand.value !== null);

  const harness = createWindowSizingHarness({
    commandPanelInheritedHeight: ref<number | null>(null),
    commandPanelLockedHeight: ref<number | null>(null),
    flowPanelInheritedHeight: ref<number | null>(null),
    flowPanelLockedHeight: ref<number | null>(null),
    drawerOpen,
    drawerViewportHeight,
    searchPanelEffectiveHeight,
    pendingCommand,
    commandPageOpen
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
      commandPageOpen
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

export function buildCommandPanelShellForLock(input: {
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

  panel.append(header, dividerTop, content, dividerBottom, footer);
  shell.appendChild(panel);
  document.body.appendChild(shell);
  return shell;
}

export function buildFlowPanelShellForLock(input: {
  headerHeight: number;
  footerHeight: number;
  cardHeights?: number[];
  emptyHeight?: number;
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

  if (typeof input.emptyHeight === "number") {
    const empty = document.createElement("div");
    empty.className = "flow-panel__empty";
    mockElementHeight(empty, input.emptyHeight, input.emptyHeight);
    body.appendChild(empty);
  } else {
    const list = document.createElement("ul");
    list.className = "flow-panel__list";
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.rowGap = "8px";
    let currentTop = 0;
    (input.cardHeights ?? []).forEach((height, index) => {
      const item = document.createElement("li");
      item.className = "flow-panel__list-item";
      item.dataset.stagingIndex = String(index);
      const itemHeight = input.itemHeights?.[index] ?? height;
      const itemTop = currentTop;
      Object.defineProperty(item, "offsetHeight", { configurable: true, value: itemHeight });
      Object.defineProperty(item, "clientHeight", { configurable: true, value: itemHeight });
      Object.defineProperty(item, "scrollHeight", { configurable: true, value: itemHeight });
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
    if (typeof input.listClientHeight === "number" || typeof input.listScrollHeight === "number") {
      mockElementHeight(
        list,
        input.listClientHeight ?? input.listScrollHeight ?? 0,
        input.listScrollHeight ?? input.listClientHeight ?? 0
      );
    }
    body.appendChild(list);
  }

  const footer = document.createElement("footer");
  footer.className = "flow-panel__footer";
  mockElementHeight(footer, input.footerHeight);

  panel.append(header, body, footer);
  shell.appendChild(panel);
  document.body.appendChild(shell);
  return panel;
}

export async function seedLegacyLastWindowSizeViaEstimatedFallback(input: {
  drawerOpen: Ref<boolean>;
  drawerViewportHeight: Ref<number>;
  searchPanelEffectiveHeight: Ref<number>;
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

export function createCommandAndFlowHarness() {
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

export function createExitHarness() {
  const drawerOpen = ref(false);
  const drawerViewportHeight = ref(0);
  const pendingCommand = ref<unknown>({ id: "pending" });
  const commandPanelInheritedHeight = ref<number | null>(520);
  const commandPanelLockedHeight = ref<number | null>(null);
  const flowPanelInheritedHeight = ref<number | null>(null);
  const flowPanelLockedHeight = ref<number | null>(null);
  const requestAnimateMainWindowSize = vi.fn<UseWindowSizingOptions["requestAnimateMainWindowSize"]>(
    async (_width, _height) => {}
  );

  const options: UseWindowSizingOptions = {
    constants: WINDOW_SIZING_CONSTANTS,
    isSettingsWindow: ref(false),
    isTauriRuntime: () => true,
    resolveAppWindow: () => null,
    requestSetMainWindowSize: async () => {},
    requestAnimateMainWindowSize,
    requestResizeMainWindowForReveal: requestAnimateMainWindowSize,
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

  return {
    controller: createWindowSizingController(options),
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

export function createDomRect(partial: Partial<DOMRect>): DOMRect {
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

export function resetWindowSizingTestDom(): void {
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.innerHTML = "";
}
