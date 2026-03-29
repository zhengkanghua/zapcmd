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

function createLauncherVmStub(overrides: Record<string, unknown> = {}) {
  const searchPage: NavPage = { type: "search" };
  const base = {
    search: {
      query: "",
      keyboardHints: [],
      filteredResults: [],
      activeIndex: 0,
      searchShellStyle: {} as Record<string, string>,
      drawerOpen: false,
      drawerViewportHeight: 0,
      queuedFeedbackCommandId: null
    },
    command: {
      pendingCommand: null,
      pendingArgs: [],
      pendingArgValues: {},
      submitHint: "",
      submitMode: "stage" as const,
      safetyDialog: null,
      executing: false,
      executionFeedbackMessage: "",
      executionFeedbackTone: "neutral" as const
    },
    queue: {
      items: [],
      queueOpen: false,
      panelState: "closed" as const,
      hints: [],
      focusZone: "search" as const,
      activeIndex: 0
    },
    nav: {
      currentPage: searchPage,
      canGoBack: false,
      pushPage: vi.fn(),
      popPage: vi.fn(),
      resetToSearch: vi.fn(),
      stack: [searchPage]
    },
    dom: {
      setSearchShellRef: () => {},
      setSearchInputRef: () => {},
      setDrawerRef: () => {},
      setQueuePanelRef: () => {},
      setQueueListRef: () => {},
      setResultButtonRef: () => {},
      setParamInputRef: () => {}
    },
    actions: {
      onQueryInput: vi.fn(),
      enqueueResult: vi.fn(),
      executeResult: vi.fn(),
      toggleQueue: vi.fn(),
      onQueueDragStart: vi.fn(),
      onQueueDragOver: vi.fn(),
      onQueueDragEnd: vi.fn(),
      onFocusQueueIndex: vi.fn(),
      removeQueuedCommand: vi.fn(),
      updateQueuedArg: vi.fn(),
      clearQueue: vi.fn(),
      executeQueue: vi.fn(),
      setQueueGripReorderActive: vi.fn(),
      submitParamInput: vi.fn(),
      requestCommandPanelExit: vi.fn(),
      notifyCommandPageSettled: vi.fn(),
      notifyFlowPanelPrepared: vi.fn(),
      notifyFlowPanelHeightChange: vi.fn(),
      notifyFlowPanelSettled: vi.fn(),
      notifySearchPageSettled: vi.fn(),
      updatePendingArgValue: vi.fn(),
      confirmSafetyExecution: vi.fn(),
      cancelSafetyExecution: vi.fn()
    }
  };

  return {
    ...base,
    ...overrides,
    search: { ...base.search, ...(overrides.search as Record<string, unknown> | undefined) },
    command: { ...base.command, ...(overrides.command as Record<string, unknown> | undefined) },
    queue: { ...base.queue, ...(overrides.queue as Record<string, unknown> | undefined) },
    nav: { ...base.nav, ...(overrides.nav as Record<string, unknown> | undefined) },
    dom: { ...base.dom, ...(overrides.dom as Record<string, unknown> | undefined) },
    actions: { ...base.actions, ...(overrides.actions as Record<string, unknown> | undefined) }
  };
}

function mountLauncherWindow(
  launcherVmOverrides: Record<string, unknown> = {},
  stubs: Record<string, unknown> = {}
) {
  const launcherVm = createLauncherVmStub(launcherVmOverrides);
  const wrapper = mount(LauncherWindow, {
    props: {
      launcherVm
    },
    global: {
      stubs: {
        LauncherSearchPanel: true,
        LauncherQueueReviewPanel: true,
        LauncherCommandPanel: true,
        LauncherSafetyOverlay: true,
        ...stubs
      }
    }
  });

  return { wrapper, launcherVm };
}

describe("LauncherWindow CommandPanel wiring", () => {
  it("挂载 LauncherWindow 时不会产生 Transition handler warning", async () => {
    const warnHost = globalThis as typeof globalThis & {
      __ZAPCMD_CONSOLE_WARN_SINK?: (...args: unknown[]) => void;
    };
    const originalWarnSink = warnHost.__ZAPCMD_CONSOLE_WARN_SINK;
    const warnSpy = vi.fn((..._args: unknown[]) => {});
    warnHost.__ZAPCMD_CONSOLE_WARN_SINK = warnSpy;

    try {
      mountLauncherWindow();
      await nextTick();
    } finally {
      warnHost.__ZAPCMD_CONSOLE_WARN_SINK = originalWarnSink;
    }

    const transitionWarnings = warnSpy.mock.calls.filter((call) =>
      String(call[0]).includes("Wrong type passed as event handler to onAfterEnter")
    );
    expect(transitionWarnings).toHaveLength(0);
  });

  it("search 页面渲染 SearchPanel（不渲染 CommandPanel）", () => {
    const { wrapper } = mountLauncherWindow();

    expect(wrapper.find("launcher-search-panel-stub").exists()).toBe(true);
    expect(wrapper.find("launcher-command-panel-stub").exists()).toBe(false);
  });

  it("launcher shell 不再使用 role=application", () => {
    const { wrapper } = mountLauncherWindow();

    expect(wrapper.get(".search-shell").attributes("role")).toBeUndefined();
  });

  it("Search 页面 queueOpen=true 时 QueueReviewPanel 由 LauncherWindow 挂载（SearchPanel 即使被 stub 也仍存在）", () => {
    const { wrapper } = mountLauncherWindow({
      nav: {
        currentPage: { type: "search" }
      },
      queue: {
        queueOpen: true,
        panelState: "open"
      }
    });

    expect(wrapper.find("launcher-queue-review-panel-stub").exists()).toBe(true);
  });

  it("QueueReviewPanel 发出 flow-panel-settled 时，LauncherWindow 向上透传同名事件", async () => {
    const { wrapper } = mountLauncherWindow(
      {
        nav: {
          currentPage: { type: "search" }
        },
        queue: {
          queueOpen: true,
          panelState: "open"
        }
      },
      {
        LauncherQueueReviewPanel: {
          template:
            "<button class='stub-flow-settled' @click=\"$emit('flow-panel-settled')\">flow settled</button>"
        }
      }
    );

    await wrapper.get(".stub-flow-settled").trigger("click");
    expect(wrapper.emitted("flow-panel-settled")).toHaveLength(1);
  });

  it("queue panelState=preparing 时 QueueReviewPanel 仍由 LauncherWindow 挂载", () => {
    const { wrapper } = mountLauncherWindow(
      {
        nav: {
          currentPage: { type: "search" }
        },
        queue: {
          items: [
            {
              id: "cmd-1",
              title: "示例命令",
              rawPreview: "echo preview",
              renderedCommand: "echo preview",
              args: [],
              argValues: {}
            }
          ],
          queueOpen: true,
          panelState: "preparing"
        }
      },
      {
        LauncherQueueReviewPanel: {
          template: "<aside class='queue-review-panel invisible'>queue review</aside>"
        }
      }
    );

    expect(wrapper.find(".queue-review-panel").exists()).toBe(true);
    expect(wrapper.get(".queue-review-panel").classes()).toContain("invisible");
  });

  it("QueueReviewPanel 发出 flow-panel-prepared 时，LauncherWindow 向上透传同名事件", async () => {
    const { wrapper } = mountLauncherWindow(
      {
        nav: {
          currentPage: { type: "search" }
        },
        queue: {
          queueOpen: true,
          panelState: "preparing"
        }
      },
      {
        LauncherQueueReviewPanel: {
          template:
            "<button class='stub-flow-prepared' @click=\"$emit('flow-panel-prepared')\">flow prepared</button>"
        }
      }
    );

    await wrapper.get(".stub-flow-prepared").trigger("click");
    expect(wrapper.emitted("flow-panel-prepared")).toHaveLength(1);
  });

  it("QueueReviewPanel 发出 flow-panel-height-change 时，LauncherWindow 向上透传同名事件", async () => {
    const { wrapper } = mountLauncherWindow(
      {
        nav: {
          currentPage: { type: "search" }
        },
        queue: {
          queueOpen: true,
          panelState: "open"
        }
      },
      {
        LauncherQueueReviewPanel: {
          template:
            "<button class='stub-flow-height-change' @click=\"$emit('flow-panel-height-change')\">flow height change</button>"
        }
      }
    );

    await wrapper.get(".stub-flow-height-change").trigger("click");
    expect(wrapper.emitted("flow-panel-height-change")).toHaveLength(1);
  });

  it("command-action 页面渲染 CommandPanel，并透传 submit/cancel 事件", async () => {
    const command = createCommandTemplate("cmd-1");
    const commandPage: NavPage = {
      type: "command-action",
      props: { command, mode: "execute", isDangerous: false }
    };

    const { wrapper, launcherVm } = mountLauncherWindow(
      {
        nav: {
          currentPage: commandPage,
          canGoBack: true,
          stack: [{ type: "search" }, commandPage]
        }
      },
      {
        LauncherCommandPanel: {
          template:
            "<div><button class='stub-cancel' @click=\"$emit('cancel')\" />" +
            "<button class='stub-submit' @click=\"$emit('submit', { value: 'x' }, false)\" /></div>"
        }
      }
    );

    expect(wrapper.find("launcher-search-panel-stub").exists()).toBe(false);
    expect(wrapper.find(".stub-cancel").exists()).toBe(true);

    await wrapper.get(".stub-cancel").trigger("click");
    expect(wrapper.emitted("request-command-panel-exit")).toHaveLength(1);
    expect(launcherVm.nav.popPage).not.toHaveBeenCalled();

    await wrapper.get(".stub-submit").trigger("click");
    expect(wrapper.emitted("submit-param-input")).toHaveLength(1);
  });

  it("command-action 页面点击返回时发出 request-command-panel-exit，而不是直接操作 navStack", async () => {
    const command = createCommandTemplate("cmd-exit");
    const commandPage: NavPage = {
      type: "command-action",
      props: { command, mode: "execute", isDangerous: false }
    };

    const { wrapper, launcherVm } = mountLauncherWindow(
      {
        nav: {
          currentPage: commandPage,
          canGoBack: true,
          stack: [{ type: "search" }, commandPage]
        }
      },
      {
        LauncherCommandPanel: {
          template: "<button class='stub-cancel' @click=\"$emit('cancel')\">cancel</button>"
        }
      }
    );

    await wrapper.get(".stub-cancel").trigger("click");

    expect(wrapper.emitted("request-command-panel-exit")).toHaveLength(1);
    expect(launcherVm.nav.popPage).not.toHaveBeenCalled();
  });

  it("command-action 页面点击任意内容不应触发 blank-pointerdown（命中兜底）", async () => {
    const command = createCommandTemplate("cmd-1");
    const commandPage: NavPage = {
      type: "command-action",
      props: { command, mode: "execute", isDangerous: false }
    };

    const { wrapper } = mountLauncherWindow(
      {
        nav: {
          currentPage: commandPage,
          stack: [{ type: "search" }, commandPage]
        }
      },
      {
        LauncherCommandPanel: {
          template: "<button class='inside-command-panel'>inside</button>"
        }
      }
    );

    await wrapper.get(".inside-command-panel").trigger("pointerdown");
    expect(wrapper.emitted("blank-pointerdown")).toBeUndefined();
  });

  it("safetyDialog 存在时渲染 SafetyOverlay，并透传 cancel/confirm", async () => {
    const { wrapper } = mountLauncherWindow(
      {
        command: {
          safetyDialog: createSafetyDialog()
        },
        nav: {
          currentPage: { type: "search" }
        }
      },
      {
        LauncherSafetyOverlay: {
          template:
            "<div><button class='stub-safety-cancel' @click=\"$emit('cancel-safety-execution')\" />" +
            "<button class='stub-safety-confirm' @click=\"$emit('confirm-safety-execution')\" /></div>"
        }
      }
    );

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

    const { wrapper } = mountLauncherWindow({
      nav: {
        currentPage: commandPage,
        canGoBack: true,
        stack: [{ type: "search" }, commandPage]
      }
    });

    await wrapper.setProps({
      launcherVm: createLauncherVmStub({
        nav: {
          currentPage: { type: "search" },
          canGoBack: false,
          stack: [{ type: "search" }]
        }
      })
    });
    (wrapper.vm as unknown as { onNavAfterEnter: () => void }).onNavAfterEnter();
    await nextTick();

    expect(wrapper.emitted("search-page-settled")).toHaveLength(1);
  });

  it("nav-slide 切入 command-action 并 after-enter 后发出 command-page-settled", async () => {
    const command = createCommandTemplate("cmd-entered");
    const commandPage: NavPage = {
      type: "command-action",
      props: { command, mode: "execute", isDangerous: false }
    };

    const { wrapper } = mountLauncherWindow({
      nav: {
        currentPage: { type: "search" },
        canGoBack: false,
        stack: [{ type: "search" }]
      }
    });

    await wrapper.setProps({
      launcherVm: createLauncherVmStub({
        nav: {
          currentPage: commandPage,
          canGoBack: true,
          stack: [{ type: "search" }, commandPage]
        }
      })
    });
    (wrapper.vm as unknown as { onNavAfterEnter: () => void }).onNavAfterEnter();
    await nextTick();

    expect(wrapper.emitted("command-page-settled")).toHaveLength(1);
  });
});
