import { ref } from "vue";
import { afterEach, describe, it, vi } from "vitest";

import { WINDOW_SIZING_CONSTANTS } from "../../launcher/useLauncherLayoutMetrics";
import { resolveWindowSize } from "../../launcher/useWindowSizing/calculation";
import { UI_TOP_ALIGN_OFFSET_PX_FALLBACK } from "../../launcher/useWindowSizing/model";
import type { UseWindowSizingOptions } from "../../launcher/useWindowSizing/model";

function mockRect(
  element: Element,
  rect: {
    top: number;
    bottom: number;
    left?: number;
    right?: number;
    width?: number;
    height?: number;
  }
): void {
  const top = rect.top;
  const bottom = rect.bottom;
  const left = rect.left ?? 0;
  const right = rect.right ?? 0;
  const width = rect.width ?? Math.max(0, right - left);
  const height = rect.height ?? Math.max(0, bottom - top);

  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    top,
    bottom,
    left,
    right,
    width,
    height,
    x: left,
    y: top,
    toJSON: () => ({})
  } as DOMRect);
}

function createBaseOptions(
  overrides: Partial<UseWindowSizingOptions> = {}
): UseWindowSizingOptions {
  return {
    constants: WINDOW_SIZING_CONSTANTS,
    isSettingsWindow: ref(false),
    isTauriRuntime: () => false,
    resolveAppWindow: () => null,
    requestSetMainWindowSize: async () => {},
    searchShellRef: ref(null),
    stagingPanelRef: ref(null),
    stagingExpanded: ref(false),
    pendingCommand: ref<unknown>(null),
    drawerOpen: ref(false),
    drawerViewportHeight: ref(0),
    stagingVisibleRows: ref(0),
    searchMainWidth: ref(680),
    minShellWidth: ref(0),
    windowWidthCap: ref(2000),
    windowHeightCap: ref(2000),
    scheduleSearchInputFocus: () => {},
    loadSettings: () => {},
    ...overrides
  };
}

function assertHeight(
  label: string,
  actual: number,
  expected: number,
  context: Record<string, unknown>
): void {
  if (actual !== expected) {
    throw new Error(
      `${label}: expected height=${expected}, got height=${actual}. context=${JSON.stringify(context)}`
    );
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("resolveWindowSize（drag strip 与 cap 口径）", () => {
  it("measured 与 estimated 口径一致：不把 drag strip 计入 content height", () => {
    const windowHeightCap = ref(1000);
    const drawerViewportHeight = ref(610);

    const estimatedOptions = createBaseOptions({
      searchShellRef: ref(null),
      windowHeightCap,
      drawerOpen: ref(true),
      drawerViewportHeight
    });
    const estimated = resolveWindowSize(estimatedOptions);

    const root = document.createElement("div");
    const shell = document.createElement("div");
    const dragStrip = document.createElement("div");
    dragStrip.className = "shell-drag-strip";
    shell.appendChild(dragStrip);
    root.appendChild(shell);
    document.body.appendChild(root);

    mockRect(root, { top: 0, bottom: 1000 });
    mockRect(shell, { top: 0, bottom: 732 });
    mockRect(dragStrip, { top: 0, bottom: UI_TOP_ALIGN_OFFSET_PX_FALLBACK, height: UI_TOP_ALIGN_OFFSET_PX_FALLBACK });

    const measuredOptions = createBaseOptions({
      searchShellRef: ref(shell),
      windowHeightCap,
      drawerOpen: ref(true),
      drawerViewportHeight
    });
    const measured = resolveWindowSize(measuredOptions);

    const expectedContentHeight =
      WINDOW_SIZING_CONSTANTS.windowBaseHeight + drawerViewportHeight.value + 10;
    const expectedWindowHeight = expectedContentHeight + UI_TOP_ALIGN_OFFSET_PX_FALLBACK;

    assertHeight("estimated", estimated.height, expectedWindowHeight, {
      dragStripHeight: UI_TOP_ALIGN_OFFSET_PX_FALLBACK,
      expectedContentHeight,
      windowHeightCap: windowHeightCap.value
    });
    assertHeight("measured", measured.height, expectedWindowHeight, {
      dragStripHeight: UI_TOP_ALIGN_OFFSET_PX_FALLBACK,
      expectedContentHeight,
      windowHeightCap: windowHeightCap.value
    });
  });

  it("measured/estimated 同时可用时取较大值，避免时序导致的偶发裁切", () => {
    const windowHeightCap = ref(1000);
    const drawerViewportHeight = ref(610);

    const root = document.createElement("div");
    const shell = document.createElement("div");
    const dragStrip = document.createElement("div");
    dragStrip.className = "shell-drag-strip";
    shell.appendChild(dragStrip);
    root.appendChild(shell);
    document.body.appendChild(root);

    mockRect(root, { top: 0, bottom: 1000 });
    mockRect(shell, { top: 0, bottom: 100 });
    mockRect(dragStrip, { top: 0, bottom: UI_TOP_ALIGN_OFFSET_PX_FALLBACK, height: UI_TOP_ALIGN_OFFSET_PX_FALLBACK });

    const options = createBaseOptions({
      searchShellRef: ref(shell),
      windowHeightCap,
      drawerOpen: ref(true),
      drawerViewportHeight
    });
    const size = resolveWindowSize(options);

    const expectedContentHeight =
      WINDOW_SIZING_CONSTANTS.windowBaseHeight + drawerViewportHeight.value + 10;
    const expectedWindowHeight = expectedContentHeight + UI_TOP_ALIGN_OFFSET_PX_FALLBACK;

    assertHeight("max(measured, estimated)", size.height, expectedWindowHeight, {
      dragStripHeight: UI_TOP_ALIGN_OFFSET_PX_FALLBACK,
      expectedContentHeight,
      windowHeightCap: windowHeightCap.value
    });
  });

  it("cap 触顶：以“内容高度 cap（不含 drag strip）”为基准 clamp，再加回 drag strip", () => {
    const windowHeightCap = ref(400);
    const drawerViewportHeight = ref(610);

    const options = createBaseOptions({
      searchShellRef: ref(null),
      windowHeightCap,
      drawerOpen: ref(true),
      drawerViewportHeight
    });
    const size = resolveWindowSize(options);

    assertHeight("cap clamp", size.height, windowHeightCap.value, {
      dragStripHeight: UI_TOP_ALIGN_OFFSET_PX_FALLBACK,
      windowHeightCap: windowHeightCap.value,
      drawerViewportHeight: drawerViewportHeight.value
    });
  });
});

