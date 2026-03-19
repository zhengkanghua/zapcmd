import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { describe, expect, it, vi } from "vitest";

import type { CommandTemplate } from "../../../features/commands/commandTemplates";
import type { LauncherSafetyDialog } from "../types";
import type { NavPage } from "../../../composables/launcher/useLauncherNavStack";
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
  const searchPage: NavPage = { type: "search" };
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
    navCurrentPage: searchPage,
    navCanGoBack: false,
    navPushPage: vi.fn(),
    navPopPage: vi.fn(),
    navResetToSearch: vi.fn(),
    navStack: [searchPage],
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

describe("LauncherWindow CommandPanel wiring", () => {
  it("search 页面渲染 SearchPanel（不渲染 CommandPanel）", () => {
    const wrapper = mount(LauncherWindow, {
      props: createBaseProps(),
      global: {
        stubs: {
          LauncherSearchPanel: true,
          LauncherFlowPanel: true,
          LauncherCommandPanel: true,
          LauncherSafetyOverlay: true
        }
      }
    });

    expect(wrapper.find("launcher-search-panel-stub").exists()).toBe(true);
    expect(wrapper.find("launcher-command-panel-stub").exists()).toBe(false);
  });

  it("Search 页面 stagingExpanded=true 时 FlowPanel 由 LauncherWindow 挂载（SearchPanel 即使被 stub 也仍存在）", () => {
    const wrapper = mount(LauncherWindow, {
      props: createBaseProps({
        navCurrentPage: { type: "search" },
        stagingExpanded: true,
        stagingDrawerState: "open"
      }),
      global: {
        stubs: {
          LauncherSearchPanel: true,
          LauncherCommandPanel: true,
          LauncherSafetyOverlay: true,
          LauncherFlowPanel: true
        }
      }
    });

    expect(wrapper.find("launcher-flow-panel-stub").exists()).toBe(true);
  });

  it("command-action 页面渲染 CommandPanel，并透传 submit/cancel 事件", async () => {
    const command = createCommandTemplate("cmd-1");
    const commandPage: NavPage = {
      type: "command-action",
      props: { command, mode: "execute", isDangerous: false }
    };

    const wrapper = mount(LauncherWindow, {
      props: createBaseProps({
        navCurrentPage: commandPage,
        navCanGoBack: true,
        navStack: [{ type: "search" }, commandPage]
      }),
      global: {
        stubs: {
          LauncherSearchPanel: true,
          LauncherFlowPanel: true,
          LauncherSafetyOverlay: true,
          LauncherCommandPanel: {
            template:
              "<div><button class='stub-cancel' @click=\"$emit('cancel')\" />" +
              "<button class='stub-submit' @click=\"$emit('submit', { value: 'x' }, false)\" /></div>"
          }
        }
      }
    });

    expect(wrapper.find("launcher-search-panel-stub").exists()).toBe(false);
    expect(wrapper.find(".stub-cancel").exists()).toBe(true);

    await wrapper.get(".stub-cancel").trigger("click");
    expect(wrapper.emitted("request-command-panel-exit")).toHaveLength(1);
    expect((wrapper.props("navPopPage") as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();

    await wrapper.get(".stub-submit").trigger("click");
    expect(wrapper.emitted("submit-param-input")).toHaveLength(1);
  });

  it("command-action 页面点击返回时发出 request-command-panel-exit，而不是直接操作 navStack", async () => {
    const command = createCommandTemplate("cmd-exit");
    const commandPage: NavPage = {
      type: "command-action",
      props: { command, mode: "execute", isDangerous: false }
    };

    const wrapper = mount(LauncherWindow, {
      props: createBaseProps({
        navCurrentPage: commandPage,
        navCanGoBack: true,
        navStack: [{ type: "search" }, commandPage]
      }),
      global: {
        stubs: {
          LauncherSearchPanel: true,
          LauncherFlowPanel: true,
          LauncherSafetyOverlay: true,
          LauncherCommandPanel: {
            template: "<button class='stub-cancel' @click=\"$emit('cancel')\">cancel</button>"
          }
        }
      }
    });

    await wrapper.get(".stub-cancel").trigger("click");

    expect(wrapper.emitted("request-command-panel-exit")).toHaveLength(1);
    expect((wrapper.props("navPopPage") as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it("command-action 页面点击任意内容不应触发 blank-pointerdown（命中兜底）", async () => {
    const command = createCommandTemplate("cmd-1");
    const commandPage: NavPage = {
      type: "command-action",
      props: { command, mode: "execute", isDangerous: false }
    };

    const wrapper = mount(LauncherWindow, {
      props: createBaseProps({
        navCurrentPage: commandPage,
        navStack: [{ type: "search" }, commandPage]
      }),
      global: {
        stubs: {
          LauncherSearchPanel: true,
          LauncherFlowPanel: true,
          LauncherSafetyOverlay: true,
          LauncherCommandPanel: {
            template: "<button class='inside-command-panel'>inside</button>"
          }
        }
      }
    });

    await wrapper.get(".inside-command-panel").trigger("pointerdown");
    expect(wrapper.emitted("blank-pointerdown")).toBeUndefined();
  });

  it("safetyDialog 存在时渲染 SafetyOverlay，并透传 cancel/confirm", async () => {
    const wrapper = mount(LauncherWindow, {
      props: createBaseProps({
        safetyDialog: createSafetyDialog(),
        navCurrentPage: { type: "search" }
      }),
      global: {
        stubs: {
          LauncherSearchPanel: true,
          LauncherFlowPanel: true,
          LauncherCommandPanel: true,
          LauncherSafetyOverlay: {
            template:
              "<div><button class='stub-safety-cancel' @click=\"$emit('cancel-safety-execution')\" />" +
              "<button class='stub-safety-confirm' @click=\"$emit('confirm-safety-execution')\" /></div>"
          }
        }
      }
    });

    await wrapper.get(".stub-safety-cancel").trigger("click");
    expect(wrapper.emitted("cancel-safety-execution")).toHaveLength(1);

    await wrapper.get(".stub-safety-confirm").trigger("click");
    expect(wrapper.emitted("confirm-safety-execution")).toHaveLength(1);
  });

  it("nav-slide 切回 search 并 after-enter 后发出 search-page-settled", async () => {
    const command = createCommandTemplate("cmd-settled");
    const commandPage: NavPage = {
      type: "command-action",
      props: { command, mode: "execute", isDangerous: false }
    };

    const wrapper = mount(LauncherWindow, {
      props: createBaseProps({
        navCurrentPage: commandPage,
        navCanGoBack: true,
        navStack: [{ type: "search" }, commandPage]
      }),
      global: {
        stubs: {
          LauncherSearchPanel: true,
          LauncherFlowPanel: true,
          LauncherSafetyOverlay: true,
          LauncherCommandPanel: true
        }
      }
    });

    await wrapper.setProps({
      navCurrentPage: { type: "search" },
      navCanGoBack: false,
      navStack: [{ type: "search" }]
    });
    (wrapper.vm as unknown as { onNavAfterEnter: () => void }).onNavAfterEnter();
    await nextTick();

    expect(wrapper.emitted("search-page-settled")).toHaveLength(1);
  });
});
