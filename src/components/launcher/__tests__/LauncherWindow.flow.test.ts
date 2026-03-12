import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import type { CommandTemplate } from "../../../features/commands/commandTemplates";
import type { LauncherSafetyDialog } from "../types";
import LauncherWindow from "../LauncherWindow.vue";

function createCommandTemplate(id: string): CommandTemplate {
  return {
    id,
    title: `title-${id}`,
    description: `desc-${id}`,
    preview: `cmd ${id}`,
    folder: "folder",
    category: "cat",
    needsArgs: true
  };
}

function createSafetyDialog(): LauncherSafetyDialog {
  return {
    mode: "single",
    title: "高危操作确认",
    description: "该命令具有潜在风险，请确认是否继续。",
    items: [
      {
        title: "示例命令",
        renderedCommand: "rm -rf /",
        reasons: ["危险示例"]
      }
    ]
  };
}

function createBaseProps(overrides: Record<string, unknown> = {}) {
  return {
    query: "",
    executing: false,
    executionFeedbackMessage: "",
    executionFeedbackTone: "neutral" as const,
    searchShellStyle: {} as Record<string, string>,
    stagingExpanded: false,
    drawerOpen: false,
    drawerViewportHeight: 0,
    drawerFloorViewportHeight: 0,
    drawerFillerHeight: 0,
    keyboardHints: [],
    filteredResults: [],
    activeIndex: 0,
    stagedFeedbackCommandId: null,
    stagedCommands: [],
    stagingDrawerState: "closed" as const,
    stagingHints: [],
    stagingListShouldScroll: false,
    stagingListMaxHeight: "0px",
    focusZone: "search" as const,
    stagingActiveIndex: 0,
    pendingCommand: null,
    pendingArgs: [],
    pendingArgValues: {},
    pendingSubmitHint: "",
    pendingSubmitMode: "stage" as const,
    safetyDialog: null,
    setSearchShellRef: () => {},
    setSearchInputRef: () => {},
    setDrawerRef: () => {},
    setStagingPanelRef: () => {},
    setStagingListRef: () => {},
    setResultButtonRef: () => {},
    setParamInputRef: () => {},
    ...overrides
  };
}

describe("LauncherWindow Flow drawer wiring", () => {
  it("Flow 抽屉挂载在 search-main 内容区内（不覆盖 search capsule）", () => {
    const wrapper = mount(LauncherWindow, {
      props: createBaseProps({
        pendingCommand: createCommandTemplate("cmd-1"),
        drawerOpen: true,
        drawerViewportHeight: 322,
        drawerFloorViewportHeight: 322
      }),
      global: {
        stubs: {
          LauncherHighlightText: { template: "<span />" },
          LauncherIcon: { template: "<span />" }
        }
      }
    });

    const searchMain = wrapper.get(".search-main");
    expect(searchMain.find(".flow-overlay").exists()).toBe(true);
    expect(wrapper.find(".search-capsule .flow-overlay").exists()).toBe(false);
  });

  it("pendingCommand 存在时渲染 Flow 抽屉（替代 ParamOverlay）", () => {
    const wrapper = mount(LauncherWindow, {
      props: createBaseProps({
        pendingCommand: createCommandTemplate("cmd-1")
      }),
      global: {
        stubs: {
          LauncherSearchPanel: { template: "<div class='search-panel-stub'><slot name='content-overlays' /></div>" },
          LauncherParamOverlay: { template: "<div class='param-overlay-stub' />" },
          LauncherSafetyOverlay: { template: "<div class='safety-overlay-stub' />" }
        }
      }
    });

    expect(wrapper.find(".flow-overlay").exists()).toBe(true);
  });

  it("pendingCommand 模式下 Flow 事件会向上透传（cancel/submit/update）", async () => {
    const wrapper = mount(LauncherWindow, {
      props: createBaseProps({
        pendingCommand: createCommandTemplate("cmd-1"),
        pendingArgs: [],
        pendingArgValues: {}
      }),
      global: {
        stubs: {
          LauncherSearchPanel: { template: "<div class='search-panel-stub'><slot name='content-overlays' /></div>" }
        }
      }
    });

    await wrapper.get(".flow-param-cancel").trigger("click");
    expect(wrapper.emitted("cancel-param-input")).toHaveLength(1);
  });

  it("safetyDialog 存在时渲染 Flow 抽屉（替代 SafetyOverlay）", () => {
    const wrapper = mount(LauncherWindow, {
      props: createBaseProps({
        safetyDialog: createSafetyDialog()
      }),
      global: {
        stubs: {
          LauncherSearchPanel: { template: "<div class='search-panel-stub'><slot name='content-overlays' /></div>" },
          LauncherParamOverlay: { template: "<div class='param-overlay-stub' />" },
          LauncherSafetyOverlay: { template: "<div class='safety-overlay-stub' />" }
        }
      }
    });

    expect(wrapper.find(".flow-overlay").exists()).toBe(true);
  });

  it("safetyDialog 模式下 Flow 事件会向上透传（cancel/confirm）", async () => {
    const wrapper = mount(LauncherWindow, {
      props: createBaseProps({
        safetyDialog: createSafetyDialog()
      }),
      global: {
        stubs: {
          LauncherSearchPanel: { template: "<div class='search-panel-stub'><slot name='content-overlays' /></div>" }
        }
      }
    });

    await wrapper.get(".flow-safety-cancel").trigger("click");
    await wrapper.get(".flow-safety-confirm").trigger("click");

    expect(wrapper.emitted("cancel-safety-execution")).toHaveLength(1);
    expect(wrapper.emitted("confirm-safety-execution")).toHaveLength(1);
  });
});
