import { computed, ref, type Ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  LAUNCHER_FRAME_DESIGN_CAP_PX,
  SEARCH_CAPSULE_HEIGHT_PX,
  WINDOW_SIZING_CONSTANTS
} from "../../launcher/useLauncherLayoutMetrics";
import { resolveWindowSize } from "../../launcher/useWindowSizing/calculation";
import {
  UI_TOP_ALIGN_OFFSET_PX_FALLBACK,
  type UseWindowSizingOptions
} from "../../launcher/useWindowSizing/model";

const SEARCH_SHELL_MARGIN_TOP_PX = 8;
const SEARCH_SHELL_BREATHING_BOTTOM_PX = 8;
const SEARCH_SHELL_OUTER_CHROME_PX =
  SEARCH_SHELL_MARGIN_TOP_PX + SEARCH_SHELL_BREATHING_BOTTOM_PX;

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
  const pendingCommand = ref<unknown>(null);
  const baseOptions: UseWindowSizingOptions = {
    constants: WINDOW_SIZING_CONSTANTS,
    isSettingsWindow: ref(false),
    isTauriRuntime: () => false,
    resolveAppWindow: () => null,
    requestSetMainWindowSize: async () => {},
    requestAnimateMainWindowSize: async () => {},
    requestResizeMainWindowForReveal: async () => {},
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
    sharedPanelMaxHeight: ref(LAUNCHER_FRAME_DESIGN_CAP_PX),
    searchMainWidth: ref(680),
    minShellWidth: ref(0),
    windowWidthCap: ref(2000),
    windowHeightCap: ref(2000),
    scheduleSearchInputFocus: () => {},
    loadSettings: () => {}
  };
  const resolved = {
    ...baseOptions,
    ...overrides
  };
  if (!("commandPageOpen" in overrides)) {
    resolved.commandPageOpen = computed(() => resolved.pendingCommand.value !== null);
  }
  if (!("searchPanelEffectiveHeight" in overrides)) {
    resolved.searchPanelEffectiveHeight = computed(() => {
      if (!resolved.drawerOpen.value || resolved.drawerViewportHeight.value <= 0) {
        return SEARCH_CAPSULE_HEIGHT_PX;
      }
      return SEARCH_CAPSULE_HEIGHT_PX + resolved.drawerViewportHeight.value;
    });
  }
  if (!("sharedPanelMaxHeight" in overrides)) {
    resolved.sharedPanelMaxHeight = ref(LAUNCHER_FRAME_DESIGN_CAP_PX);
  }
  return resolved;
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
  type FutureSearchPanelFields = {
    searchPanelEffectiveHeight: Ref<number>;
    sharedPanelMaxHeight: Ref<number>;
  };

  it("搜索页窗口高度会补回 search-shell 外围 chrome，但 searchPanelEffectiveHeight 仍不含这些留白", () => {
    const root = document.createElement("div");
    const shell = document.createElement("div");
    const dragStrip = document.createElement("div");
    dragStrip.className = "shell-drag-strip";
    shell.appendChild(dragStrip);
    root.appendChild(shell);
    document.body.appendChild(root);

    mockRect(root, { top: 0, bottom: 1_000 });
    mockRect(shell, { top: 0, bottom: 460 });
    mockRect(dragStrip, {
      top: 0,
      bottom: UI_TOP_ALIGN_OFFSET_PX_FALLBACK,
      height: UI_TOP_ALIGN_OFFSET_PX_FALLBACK
    });

    const options = {
      ...createBaseOptions({
        searchShellRef: ref(shell),
        pendingCommand: ref(null),
        drawerOpen: ref(false),
        drawerViewportHeight: ref(0)
      }),
      searchPanelEffectiveHeight: ref(SEARCH_CAPSULE_HEIGHT_PX),
      sharedPanelMaxHeight: ref(524)
    } as UseWindowSizingOptions & FutureSearchPanelFields;
    const size = resolveWindowSize(options);

    expect(size.height).toBe(
      SEARCH_CAPSULE_HEIGHT_PX +
        UI_TOP_ALIGN_OFFSET_PX_FALLBACK +
        SEARCH_SHELL_OUTER_CHROME_PX
    );
  });

  it("searchPanelEffectiveHeight 超过 sharedPanelMaxHeight 时只 clamp 到 sharedPanelMaxHeight", () => {
    const options = {
      ...createBaseOptions({
        searchShellRef: ref(null),
        pendingCommand: ref(null),
        drawerOpen: ref(false),
        drawerViewportHeight: ref(0),
        windowHeightCap: ref(10_000)
      }),
      searchPanelEffectiveHeight: ref(700),
      sharedPanelMaxHeight: ref(524)
    } as UseWindowSizingOptions & FutureSearchPanelFields;
    const size = resolveWindowSize(options);

    expect(size.height).toBe(
      524 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK + SEARCH_SHELL_OUTER_CHROME_PX
    );
  });

  it("commandPageOpen 时即使 pendingCommand 为空，也走 commandPageMinHeight", () => {
    const size = resolveWindowSize(
      createBaseOptions({
        commandPageOpen: ref(true),
        pendingCommand: ref(null)
      })
    );

    expect(size.height).toBeGreaterThan(WINDOW_SIZING_CONSTANTS.windowBaseHeight);
  });

  it("measured 与 estimated 口径一致：不把 drag strip 计入 content height", () => {
    const windowHeightCap = ref(1000);
    const drawerViewportHeight = ref(400);

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
    mockRect(shell, { top: 0, bottom: 522 });
    mockRect(dragStrip, { top: 0, bottom: UI_TOP_ALIGN_OFFSET_PX_FALLBACK, height: UI_TOP_ALIGN_OFFSET_PX_FALLBACK });

    const measuredOptions = createBaseOptions({
      searchShellRef: ref(shell),
      windowHeightCap,
      drawerOpen: ref(true),
      drawerViewportHeight
    });
    const measured = resolveWindowSize(measuredOptions);

    const expectedContentHeight = SEARCH_CAPSULE_HEIGHT_PX + drawerViewportHeight.value;
    const expectedWindowHeight =
      expectedContentHeight +
      UI_TOP_ALIGN_OFFSET_PX_FALLBACK +
      SEARCH_SHELL_OUTER_CHROME_PX;

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
    const drawerViewportHeight = ref(400);

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

    const expectedContentHeight = SEARCH_CAPSULE_HEIGHT_PX + drawerViewportHeight.value;
    const expectedWindowHeight =
      expectedContentHeight +
      UI_TOP_ALIGN_OFFSET_PX_FALLBACK +
      SEARCH_SHELL_OUTER_CHROME_PX;

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

  it("frameMaxHeight 受 designCap 限制（即使 screen cap 很大也不超过搜索最大高度）", () => {
    const windowHeightCap = ref(10_000);
    const drawerViewportHeight = ref(5_000);

    const size = resolveWindowSize(
      createBaseOptions({
        searchShellRef: ref(null),
        windowHeightCap,
        drawerOpen: ref(true),
        drawerViewportHeight
      })
    );

    expect(size.height).toBe(
      LAUNCHER_FRAME_DESIGN_CAP_PX +
        UI_TOP_ALIGN_OFFSET_PX_FALLBACK +
        SEARCH_SHELL_OUTER_CHROME_PX
    );
  });
});

describe("resolveWindowSize（Phase 17 宽度不扩展）", () => {
  it("stagingExpanded=true 时 width 不叠加 reviewWidth（窗口宽度保持稳定）", () => {
    const baseWidth = 680;
    const baseMinShellWidth = baseWidth + WINDOW_SIZING_CONSTANTS.windowSideSafePad * 2;

    const collapsed = resolveWindowSize(
      createBaseOptions({
        searchMainWidth: ref(baseWidth),
        minShellWidth: ref(baseMinShellWidth),
        windowWidthCap: ref(2000),
        stagingExpanded: ref(false)
      })
    );
    const expanded = resolveWindowSize(
      createBaseOptions({
        searchMainWidth: ref(baseWidth),
        minShellWidth: ref(baseMinShellWidth),
        windowWidthCap: ref(2000),
        stagingExpanded: ref(true)
      })
    );

    expect(expanded.width).toBe(collapsed.width);
    expect(expanded.width).toBe(baseMinShellWidth);
  });
});

describe("resolveWindowSize（CommandPanel 内容驱动高度）", () => {
  it("pendingCommand 时若 .command-panel 尚未挂载，不回退到旧 search shell 高度", () => {
    const root = document.createElement("div");
    const shell = document.createElement("div");
    const dragStrip = document.createElement("div");
    dragStrip.className = "shell-drag-strip";
    shell.appendChild(dragStrip);
    root.appendChild(shell);
    document.body.appendChild(root);

    mockRect(root, { top: 0, bottom: 1_000 });
    mockRect(shell, { top: 0, bottom: 430 });
    mockRect(dragStrip, {
      top: 0,
      bottom: UI_TOP_ALIGN_OFFSET_PX_FALLBACK,
      height: UI_TOP_ALIGN_OFFSET_PX_FALLBACK
    });

    const size = resolveWindowSize(
      createBaseOptions({
        searchShellRef: ref(shell),
        pendingCommand: ref({ id: "pending" })
      })
    );

    expect(size.height).toBe(
      WINDOW_SIZING_CONSTANTS.commandPageMinHeight +
        UI_TOP_ALIGN_OFFSET_PX_FALLBACK +
        SEARCH_SHELL_OUTER_CHROME_PX
    );
  });

  it("pendingCommand 未采集 session 高度时回退到参数页最小高度", () => {
    const size = resolveWindowSize(
      createBaseOptions({
        pendingCommand: ref({ id: "pending" })
      })
    );

    expect(size.height).toBe(
      WINDOW_SIZING_CONSTANTS.commandPageMinHeight +
        UI_TOP_ALIGN_OFFSET_PX_FALLBACK +
        SEARCH_SHELL_OUTER_CHROME_PX
    );
  });

  it("pendingCommand 时即使 .command-panel 已挂载，也只消费 session 高度", () => {
    const root = document.createElement("div");
    const shell = document.createElement("div");
    const dragStrip = document.createElement("div");
    const commandPanel = document.createElement("section");
    commandPanel.className = "command-panel";
    dragStrip.className = "shell-drag-strip";
    shell.appendChild(dragStrip);
    shell.appendChild(commandPanel);
    root.appendChild(shell);
    document.body.appendChild(root);

    mockRect(root, { top: 0, bottom: 1000 });
    mockRect(shell, { top: 0, bottom: 430 });
    mockRect(commandPanel, { top: UI_TOP_ALIGN_OFFSET_PX_FALLBACK, bottom: 430 });
    mockRect(dragStrip, {
      top: 0,
      bottom: UI_TOP_ALIGN_OFFSET_PX_FALLBACK,
      height: UI_TOP_ALIGN_OFFSET_PX_FALLBACK
    });

    const size = resolveWindowSize(
      createBaseOptions({
        searchShellRef: ref(shell),
        pendingCommand: ref({ id: "pending" }),
        commandPanelInheritedHeight: ref<number | null>(520)
      })
    );

    expect(size.height).toBe(
      520 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK + SEARCH_SHELL_OUTER_CHROME_PX
    );
  });

  it("退出锁存在时，即使 pendingCommand 已清空也保持当前锁高", () => {
    const size = resolveWindowSize(
      createBaseOptions({ pendingCommand: ref(null) }),
      { commandPanelExitFrameHeightLock: 520 }
    );

    expect(size.height).toBe(
      520 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK + SEARCH_SHELL_OUTER_CHROME_PX
    );
  });

  it("ignoreCommandPanelExitLock=true 时返回最终搜索页高度，用于 restore target 采样", () => {
    const size = resolveWindowSize(
      createBaseOptions({
        pendingCommand: ref(null),
        drawerOpen: ref(false),
        drawerViewportHeight: ref(0)
      }),
      {
        commandPanelExitFrameHeightLock: 520,
        ignoreCommandPanelExitLock: true
      }
    );

    expect(size.height).toBe(
      SEARCH_CAPSULE_HEIGHT_PX +
        UI_TOP_ALIGN_OFFSET_PX_FALLBACK +
        SEARCH_SHELL_OUTER_CHROME_PX
    );
  });

  it("search-settling 恢复目标采样可显式跳过旧 shell 实测高度", () => {
    const root = document.createElement("div");
    const shell = document.createElement("div");
    const dragStrip = document.createElement("div");
    dragStrip.className = "shell-drag-strip";
    shell.appendChild(dragStrip);
    root.appendChild(shell);
    document.body.appendChild(root);

    mockRect(root, { top: 0, bottom: 1_000 });
    mockRect(shell, { top: 0, bottom: 430 });
    mockRect(dragStrip, {
      top: 0,
      bottom: UI_TOP_ALIGN_OFFSET_PX_FALLBACK,
      height: UI_TOP_ALIGN_OFFSET_PX_FALLBACK
    });

    const size = resolveWindowSize(
      createBaseOptions({
        searchShellRef: ref(shell),
        pendingCommand: ref(null),
        drawerOpen: ref(false),
        drawerViewportHeight: ref(0)
      }),
      {
        commandPanelExitFrameHeightLock: 520,
        ignoreCommandPanelExitLock: true,
        ignoreMeasuredSearchPanelHeight: true
      }
    );

    expect(size.height).toBe(
      SEARCH_CAPSULE_HEIGHT_PX +
        UI_TOP_ALIGN_OFFSET_PX_FALLBACK +
        SEARCH_SHELL_OUTER_CHROME_PX
    );
  });

  it("CommandPanel 不读取 .command-panel 实测高度，避免 shell fill 污染会话", () => {
    const root = document.createElement("div");
    const shell = document.createElement("div");
    const dragStrip = document.createElement("div");
    const commandPanel = document.createElement("section");
    commandPanel.className = "command-panel";
    dragStrip.className = "shell-drag-strip";
    shell.appendChild(dragStrip);
    shell.appendChild(commandPanel);
    root.appendChild(shell);
    document.body.appendChild(root);

    mockRect(root, { top: 0, bottom: 5_000 });
    mockRect(shell, { top: 0, bottom: 5_000 });
    mockRect(commandPanel, { top: UI_TOP_ALIGN_OFFSET_PX_FALLBACK, bottom: 360 });
    mockRect(dragStrip, {
      top: 0,
      bottom: UI_TOP_ALIGN_OFFSET_PX_FALLBACK,
      height: UI_TOP_ALIGN_OFFSET_PX_FALLBACK
    });

    const size = resolveWindowSize(
      createBaseOptions({
        searchShellRef: ref(shell),
        pendingCommand: ref({ id: "pending" }),
        commandPanelInheritedHeight: ref<number | null>(520),
        windowHeightCap: ref(10_000)
      })
    );

    expect(size.height).toBe(
      520 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK + SEARCH_SHELL_OUTER_CHROME_PX
    );
  });

  it("stagingExpanded 不会在缺少 Flow session 时自动抬高搜索高度", () => {
    const size = resolveWindowSize(
      createBaseOptions({
        searchShellRef: ref(null),
        drawerOpen: ref(false),
        drawerViewportHeight: ref(0),
        stagingExpanded: ref(true),
        stagingPanelRef: ref(null),
        pendingCommand: ref({ id: "pending" })
      })
    );

    expect(size.height).toBe(
      WINDOW_SIZING_CONSTANTS.commandPageMinHeight +
        UI_TOP_ALIGN_OFFSET_PX_FALLBACK +
        SEARCH_SHELL_OUTER_CHROME_PX
    );
  });

  it("pendingCommand 未锁高时沿用 commandPanelInheritedHeight", () => {
    const inheritedHeight = 520;
    const commandPanelInheritedHeight = ref<number | null>(inheritedHeight);
    const size = resolveWindowSize(
      createBaseOptions({
        pendingCommand: ref({ id: "pending" }),
        commandPanelInheritedHeight,
        commandPanelLockedHeight: ref<number | null>(null)
      })
    );

    expect(size.height).toBe(
      inheritedHeight + UI_TOP_ALIGN_OFFSET_PX_FALLBACK + SEARCH_SHELL_OUTER_CHROME_PX
    );
  });

  it("stagingExpanded 且 Flow 已锁高时优先使用 flowPanelLockedHeight", () => {
    const lockedHeight = 608;
    const flowPanelLockedHeight = ref<number | null>(lockedHeight);
    const size = resolveWindowSize(
      createBaseOptions({
        stagingExpanded: ref(true),
        stagingPanelRef: ref(null),
        flowPanelInheritedHeight: ref<number | null>(420),
        flowPanelLockedHeight
      })
    );

    expect(size.height).toBe(
      Math.min(lockedHeight, LAUNCHER_FRAME_DESIGN_CAP_PX) +
        UI_TOP_ALIGN_OFFSET_PX_FALLBACK +
        SEARCH_SHELL_OUTER_CHROME_PX
    );
  });
});
