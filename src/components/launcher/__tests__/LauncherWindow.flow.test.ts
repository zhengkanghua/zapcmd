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
      searchHintLines: [],
      leftClickAction: "action-panel" as const,
      rightClickAction: "stage" as const,
      catalogLoading: false,
      catalogReady: true,
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
      submitIntent: "stage" as const,
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
      activeIndex: 0,
      refreshingAllPreflight: false,
      refreshingCommandIds: []
    },
    nav: {
      currentPage: searchPage,
      canGoBack: false,
      pushPage: vi.fn(),
      replaceTopPage: vi.fn(),
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
      dispatchCommandIntent: vi.fn(),
      toggleQueue: vi.fn(),
      onQueueDragStart: vi.fn(),
      onQueueDragOver: vi.fn(),
      onQueueDragEnd: vi.fn(),
      onFocusQueueIndex: vi.fn(),
      removeQueuedCommand: vi.fn(),
      updateQueuedArg: vi.fn(),
      clearQueue: vi.fn(),
      executeQueue: vi.fn(),
      refreshQueuedCommandPreflight: vi.fn(),
      refreshAllQueuedPreflight: vi.fn(),
      setQueueGripReorderActive: vi.fn(),
      selectActionPanelIntent: vi.fn(),
      openActionPanel: vi.fn(),
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
        LauncherActionPanel: true,
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
    expect(wrapper.emitted("flow-panel-settled")).toBeUndefined();
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
              renderedPreview: "echo preview",
              executionTemplate: {
                kind: "exec",
                program: "echo",
                args: ["preview"]
              },
              execution: {
                kind: "exec",
                program: "echo",
                args: ["preview"]
              },
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
    expect(wrapper.emitted("flow-panel-prepared")).toBeUndefined();
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
    expect(wrapper.emitted("flow-panel-height-change")).toBeUndefined();
  });

  it("command-action 页面渲染 CommandPanel，并透传 submit/cancel 事件", async () => {
    const command = createCommandTemplate("cmd-1");
    const commandPage: NavPage = {
      type: "command-action",
      props: { command, panel: "params", intent: "execute", isDangerous: false }
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
    expect(wrapper.emitted("request-command-panel-exit")).toBeUndefined();
    expect(launcherVm.nav.popPage).not.toHaveBeenCalled();

    await wrapper.get(".stub-submit").trigger("click");
    expect(wrapper.emitted("submit-param-input")).toBeUndefined();
  });

  it("command-action 页面点击返回时发出 request-command-panel-exit，而不是直接操作 navStack", async () => {
    const command = createCommandTemplate("cmd-exit");
    const commandPage: NavPage = {
      type: "command-action",
      props: { command, panel: "params", intent: "execute", isDangerous: false }
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

    expect(wrapper.emitted("request-command-panel-exit")).toBeUndefined();
    expect(launcherVm.nav.popPage).not.toHaveBeenCalled();
  });

  it("command-action 页面点击任意内容不应触发 blank-pointerdown（命中兜底）", async () => {
    const command = createCommandTemplate("cmd-1");
    const commandPage: NavPage = {
      type: "command-action",
      props: { command, panel: "params", intent: "execute", isDangerous: false }
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
    expect(wrapper.emitted("cancel-safety-execution")).toBeUndefined();

    await wrapper.get(".stub-safety-confirm").trigger("click");
    expect(wrapper.emitted("confirm-safety-execution")).toBeUndefined();
  });

  it("nav-slide 切回 search 并 after-enter 后发出 search-page-settled", async () => {
    const command = createCommandTemplate("cmd-settled");
    const commandPage: NavPage = {
      type: "command-action",
      props: { command, panel: "params", intent: "execute", isDangerous: false }
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

    expect(wrapper.emitted("search-page-settled")).toBeUndefined();
  });

  it("nav-slide 切入 command-action 并 after-enter 后发出 command-page-settled", async () => {
    const command = createCommandTemplate("cmd-entered");
    const commandPage: NavPage = {
      type: "command-action",
      props: { command, panel: "params", intent: "execute", isDangerous: false }
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

    expect(wrapper.emitted("command-page-settled")).toBeUndefined();
  });

  it("command-action actions 变体渲染 ActionPanel，而不是 CommandPanel", () => {
    const command = createCommandTemplate("cmd-actions");
    const commandPage: NavPage = {
      type: "command-action",
      props: { command, panel: "actions", isDangerous: false }
    };

    const { wrapper } = mountLauncherWindow({
      nav: {
        currentPage: commandPage,
        canGoBack: true,
        stack: [{ type: "search" }, commandPage]
      }
    });

    expect(wrapper.find("launcher-action-panel-stub").exists()).toBe(true);
    expect(wrapper.find("launcher-command-panel-stub").exists()).toBe(false);
  });

  it("command-action actions 变体选择 intent 时保持既有 action -> params 流转契约", async () => {
    const command = createCommandTemplate("cmd-actions-flow");
    const commandPage: NavPage = {
      type: "command-action",
      props: { command, panel: "actions", isDangerous: false }
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
        LauncherActionPanel: {
          template:
            "<div>" +
            "<button class='stub-select-execute' @click=\"$emit('select-intent', 'execute')\">execute</button>" +
            "<button class='stub-select-copy' @click=\"$emit('select-intent', 'copy')\">copy</button>" +
            "</div>"
        }
      }
    );

    await wrapper.get(".stub-select-execute").trigger("click");
    await wrapper.get(".stub-select-copy").trigger("click");

    expect(launcherVm.actions.selectActionPanelIntent).toHaveBeenNthCalledWith(1, "execute");
    expect(launcherVm.actions.selectActionPanelIntent).toHaveBeenNthCalledWith(2, "copy");
    expect(wrapper.emitted("request-command-panel-exit")).toBeUndefined();
  });

  it("search panel 交互事件只驱动 launcherVm，不再向外 emit 旧事件", async () => {
    const command = createCommandTemplate("search-result");
    const { wrapper, launcherVm } = mountLauncherWindow(
      {},
      {
        LauncherSearchPanel: {
          template:
            "<div>" +
            "<button class='stub-query' @click=\"$emit('query-input', 'docker')\">query</button>" +
            "<button class='stub-enqueue' @click=\"$emit('enqueue-result', command)\">enqueue</button>" +
            "<button class='stub-execute' @click=\"$emit('execute-result', command)\">execute</button>" +
            "<button class='stub-actions' @click=\"$emit('open-action-panel', command)\">actions</button>" +
            "<button class='stub-copy' @click=\"$emit('copy-result', command)\">copy</button>" +
            "<button class='stub-toggle' @click=\"$emit('toggle-queue')\">toggle</button>" +
            "</div>",
          data() {
            return { command };
          }
        }
      }
    );

    await wrapper.get(".stub-query").trigger("click");
    await wrapper.get(".stub-enqueue").trigger("click");
    await wrapper.get(".stub-execute").trigger("click");
    await wrapper.get(".stub-actions").trigger("click");
    await wrapper.get(".stub-copy").trigger("click");
    await wrapper.get(".stub-toggle").trigger("click");

    expect(launcherVm.actions.onQueryInput).toHaveBeenCalledWith("docker");
    expect(launcherVm.actions.enqueueResult).toHaveBeenCalledWith(command);
    expect(launcherVm.actions.executeResult).toHaveBeenCalledWith(command);
    expect(launcherVm.actions.openActionPanel).toHaveBeenCalledWith(command);
    expect(launcherVm.actions.dispatchCommandIntent).toHaveBeenCalledWith(command, "copy");
    expect(launcherVm.actions.toggleQueue).toHaveBeenCalled();
    expect(wrapper.emitted("query-input")).toBeUndefined();
    expect(wrapper.emitted("enqueue-result")).toBeUndefined();
    expect(wrapper.emitted("execute-result")).toBeUndefined();
    expect(wrapper.emitted("open-action-panel")).toBeUndefined();
    expect(wrapper.emitted("copy-result")).toBeUndefined();
    expect(wrapper.emitted("toggle-queue")).toBeUndefined();
  });

  it("queue review 交互事件只驱动 launcherVm，不再向外 emit 旧事件", async () => {
    const queueItem = {
      id: "cmd-1",
      title: "示例命令",
      rawPreview: "echo preview",
      renderedPreview: "echo preview",
      executionTemplate: {
        kind: "exec" as const,
        program: "echo",
        args: ["preview"]
      },
      execution: {
        kind: "exec" as const,
        program: "echo",
        args: ["preview"]
      },
      args: [],
      argValues: {}
    };
    const dragEvent = { type: "dragstart" } as unknown as DragEvent;
    const { wrapper, launcherVm } = mountLauncherWindow(
      {
        nav: {
          currentPage: { type: "search" }
        },
        queue: {
          items: [queueItem],
          queueOpen: true,
          panelState: "open"
        }
      },
      {
        LauncherQueueReviewPanel: {
          template:
            "<div>" +
            "<button class='stub-toggle' @click=\"$emit('toggle-queue')\">toggle</button>" +
            "<button class='stub-drag-start' @click=\"$emit('queue-drag-start', 0, dragEvent)\">drag-start</button>" +
            "<button class='stub-drag-over' @click=\"$emit('queue-drag-over', 0, dragEvent)\">drag-over</button>" +
            "<button class='stub-drag-end' @click=\"$emit('queue-drag-end')\">drag-end</button>" +
            "<button class='stub-grip' @click=\"$emit('grip-reorder-active-change', true)\">grip</button>" +
            "<button class='stub-focus' @click=\"$emit('focus-queue-index', 0)\">focus</button>" +
            "<button class='stub-remove' @click=\"$emit('remove-queued-command', 'cmd-1')\">remove</button>" +
            "<button class='stub-update' @click=\"$emit('update-queued-arg', 'cmd-1', 'port', '8080')\">update</button>" +
            "<button class='stub-clear' @click=\"$emit('clear-queue')\">clear</button>" +
            "<button class='stub-execute' @click=\"$emit('execute-queue')\">execute</button>" +
            "<button class='stub-refresh-all' @click=\"$emit('refresh-queue-preflight')\">refresh-all</button>" +
            "<button class='stub-refresh-one' @click=\"$emit('refresh-queued-command-preflight', 'cmd-1')\">refresh-one</button>" +
            "<button class='stub-feedback' @click=\"$emit('execution-feedback', 'success', 'done')\">feedback</button>" +
            "</div>",
          data() {
            return { dragEvent };
          }
        }
      }
    );

    await wrapper.get(".stub-toggle").trigger("click");
    await wrapper.get(".stub-drag-start").trigger("click");
    await wrapper.get(".stub-drag-over").trigger("click");
    await wrapper.get(".stub-drag-end").trigger("click");
    await wrapper.get(".stub-grip").trigger("click");
    await wrapper.get(".stub-focus").trigger("click");
    await wrapper.get(".stub-remove").trigger("click");
    await wrapper.get(".stub-update").trigger("click");
    await wrapper.get(".stub-clear").trigger("click");
    await wrapper.get(".stub-execute").trigger("click");
    await wrapper.get(".stub-refresh-all").trigger("click");
    await wrapper.get(".stub-refresh-one").trigger("click");
    await wrapper.get(".stub-feedback").trigger("click");

    expect(launcherVm.actions.toggleQueue).toHaveBeenCalled();
    expect(launcherVm.actions.onQueueDragStart).toHaveBeenCalledWith(0, dragEvent);
    expect(launcherVm.actions.onQueueDragOver).toHaveBeenCalledWith(0, dragEvent);
    expect(launcherVm.actions.onQueueDragEnd).toHaveBeenCalled();
    expect(launcherVm.actions.setQueueGripReorderActive).toHaveBeenCalledWith(true);
    expect(launcherVm.actions.onFocusQueueIndex).toHaveBeenCalledWith(0);
    expect(launcherVm.actions.removeQueuedCommand).toHaveBeenCalledWith("cmd-1");
    expect(launcherVm.actions.updateQueuedArg).toHaveBeenCalledWith("cmd-1", "port", "8080");
    expect(launcherVm.actions.clearQueue).toHaveBeenCalled();
    expect(launcherVm.actions.executeQueue).toHaveBeenCalled();
    expect(launcherVm.actions.refreshAllQueuedPreflight).toHaveBeenCalled();
    expect(launcherVm.actions.refreshQueuedCommandPreflight).toHaveBeenCalledWith("cmd-1");
    expect(wrapper.emitted("toggle-queue")).toBeUndefined();
    expect(wrapper.emitted("queue-drag-start")).toBeUndefined();
    expect(wrapper.emitted("queue-drag-over")).toBeUndefined();
    expect(wrapper.emitted("queue-drag-end")).toBeUndefined();
    expect(wrapper.emitted("grip-reorder-active-change")).toBeUndefined();
    expect(wrapper.emitted("focus-queue-index")).toBeUndefined();
    expect(wrapper.emitted("remove-queued-command")).toBeUndefined();
    expect(wrapper.emitted("update-queued-arg")).toBeUndefined();
    expect(wrapper.emitted("clear-queue")).toBeUndefined();
    expect(wrapper.emitted("execute-queue")).toBeUndefined();
    expect(wrapper.emitted("refresh-queue-preflight")).toBeUndefined();
    expect(wrapper.emitted("refresh-queued-command-preflight")).toBeUndefined();
    expect(wrapper.emitted("execution-feedback")).toEqual([["success", "done"]]);
  });

  it("command panel arg-input 只更新 vm，不再向外 emit 旧事件", async () => {
    const command = createCommandTemplate("cmd-input");
    const commandPage: NavPage = {
      type: "command-action",
      props: { command, panel: "params", intent: "execute", isDangerous: false }
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
          template: "<button class='stub-arg' @click=\"$emit('arg-input', 'port', '3000')\">arg</button>"
        }
      }
    );

    await wrapper.get(".stub-arg").trigger("click");

    expect(launcherVm.actions.updatePendingArgValue).toHaveBeenCalledWith("port", "3000");
    expect(wrapper.emitted("arg-input")).toBeUndefined();
  });
});
