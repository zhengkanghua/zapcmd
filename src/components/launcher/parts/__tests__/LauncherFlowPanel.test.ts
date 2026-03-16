import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { StagedCommand } from "../../../../features/launcher/types";
import type { KeyboardHint, LauncherFlowPanelProps } from "../../types";
import LauncherFlowPanel from "../LauncherFlowPanel.vue";

function createStagedCommand(overrides: Partial<StagedCommand> = {}): StagedCommand {
  return {
    id: "cmd-1",
    title: "示例命令",
    rawPreview: "echo preview",
    renderedCommand: "echo preview",
    args: [],
    argValues: {},
    ...overrides
  };
}

function createProps(
  overrides: Partial<LauncherFlowPanelProps> = {}
): LauncherFlowPanelProps {
  const stagingHints: KeyboardHint[] = [
    {
      keys: ["Esc"],
      action: "返回"
    }
  ];
  return {
    stagingDrawerState: "open",
    stagingExpanded: true,
    stagedCommands: [createStagedCommand()],
    stagingHints,
    stagingListShouldScroll: true,
    stagingListMaxHeight: "200px",
    drawerFloorViewportHeight: 322,
    focusZone: "staging",
    stagingActiveIndex: 0,
    flowOpen: false,
    executing: false,
    executionFeedbackMessage: "",
    executionFeedbackTone: "neutral",
    setStagingPanelRef: () => {},
    setStagingListRef: () => {},
    ...overrides
  };
}

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");

afterEach(() => {
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, "clipboard", originalClipboardDescriptor);
  } else {
    // @ts-expect-error - clipboard 在 jsdom 中可能不存在
    delete navigator.clipboard;
  }
});

describe("LauncherFlowPanel 组件级语义回归（Phase 14）", () => {
  it("根节点/遮罩/面板具备 overlay hit-zone 与 dialog 语义", () => {
    const wrapper = mount(LauncherFlowPanel, { props: createProps() });

    const overlay = wrapper.get(".flow-panel-overlay");
    expect(overlay.classes()).toContain("state-open");
    expect(overlay.attributes("data-hit-zone")).toBe("overlay");

    const scrim = wrapper.get(".flow-panel-overlay__scrim");
    expect(scrim.attributes("data-hit-zone")).toBe("overlay");

    const panel = wrapper.get(".flow-panel");
    expect(panel.attributes("data-hit-zone")).toBe("overlay");
    expect(panel.attributes("role")).toBe("dialog");
    expect(panel.attributes("aria-modal")).toBe("true");

    const header = wrapper.get(".flow-panel__header");
    expect(header.attributes("data-tauri-drag-region")).toBeDefined();
    expect(wrapper.get(".flow-panel__title-group").attributes("data-tauri-drag-region")).toBeDefined();
    expect(wrapper.get(".flow-panel__heading").attributes("data-tauri-drag-region")).toBeDefined();
    expect(wrapper.find(".flow-panel__footer").exists()).toBe(true);

    const list = wrapper.get(".flow-panel__list");
    expect(list.classes()).toContain("staging-list--scrollable");
    expect((list.element as HTMLElement).style.maxHeight).toBe("200px");
    expect((list.element as HTMLElement).style.minHeight).toBe("");
  });

  it("命令预览显示完整命令（带 > 前缀），并支持复制按钮", async () => {
    const longCommand = `echo ${"x".repeat(120)}`;
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: clipboardWriteText }
    });

    const wrapper = mount(LauncherFlowPanel, {
      props: createProps({
        stagedCommands: [createStagedCommand({ renderedCommand: longCommand })]
      })
    });

    const command = wrapper.get(".flow-card__command");
    // 新行为：显示 "> " + 完整命令，CSS 负责 text-overflow: ellipsis
    expect(command.text()).toContain(longCommand);
    expect(command.text()).toContain(">");

    const actions = wrapper.get(".flow-panel__card-actions");
    const buttons = actions.findAll("button");
    expect(buttons.length).toBe(2);

    await buttons[0]!.trigger("click");
    expect(clipboardWriteText).toHaveBeenCalledTimes(1);
    expect(clipboardWriteText).toHaveBeenCalledWith(longCommand);
  });

  it("队列为空时渲染空态且不自动关闭", async () => {
    const wrapper = mount(LauncherFlowPanel, {
      props: createProps({ stagedCommands: [] })
    });

    expect(wrapper.find(".flow-panel-overlay").exists()).toBe(true);
    expect(wrapper.find(".flow-panel__empty").exists()).toBe(true);
    expect(wrapper.emitted("toggle-staging")).toBeUndefined();
  });

  it("Flow 打开时禁用执行队列：按钮呈现禁用态，点击只 toast 不执行", async () => {
    const wrapper = mount(LauncherFlowPanel, {
      props: createProps({
        flowOpen: true,
        stagedCommands: [createStagedCommand()]
      })
    });

    const executeButton = wrapper.get(".flow-panel__footer .flow-panel__execute-btn");
    expect(executeButton.attributes("aria-disabled")).toBe("true");

    await executeButton.trigger("click");
    expect(wrapper.emitted("execute-staged")).toBeUndefined();

    const feedback = wrapper.emitted("execution-feedback");
    expect(feedback?.length).toBe(1);
    expect(feedback?.[0]?.[0]).toBe("neutral");
    expect(String(feedback?.[0]?.[1] ?? "")).toContain("完成或取消当前流程");
  });

  it("Review 打开后会把焦点送入 flow-panel 内（不滞留背景 Search）", async () => {
    const wrapper = mount(LauncherFlowPanel, {
      attachTo: document.body,
      props: createProps()
    });

    await nextTick();
    await nextTick();
    const panel = wrapper.get(".flow-panel").element as HTMLElement;
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    expect(active).not.toBeNull();
    expect(panel.contains(active!)).toBe(true);
    wrapper.unmount();
  });

  it("plain Tab 在 Review 内循环且不会冒泡到 window", async () => {
    const wrapper = mount(LauncherFlowPanel, {
      attachTo: document.body,
      props: createProps()
    });

    await nextTick();
    await nextTick();
    const panel = wrapper.get(".flow-panel").element as HTMLElement;

    const windowKeydownSpy = vi.fn();
    window.addEventListener("keydown", windowKeydownSpy);

    const closeButton = wrapper.get(".flow-panel__header button").element as HTMLButtonElement;
    closeButton.focus();

    const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    closeButton.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    expect(active).not.toBeNull();
    expect(panel.contains(active!)).toBe(true);
    expect(windowKeydownSpy).not.toHaveBeenCalled();

    window.removeEventListener("keydown", windowKeydownSpy);
    wrapper.unmount();
  });
});

// --- 新功能测试（Phase 14 补充） ---

function createArgCommand(overrides: Partial<StagedCommand> = {}): StagedCommand {
  return createStagedCommand({
    args: [
      { key: "port", label: "端口", token: "{{port}}" },
      { key: "host", label: "主机", token: "{{host}}" }
    ],
    argValues: { port: "3000", host: "localhost" },
    ...overrides
  });
}

describe("LauncherFlowPanel 紧凑参数标签", () => {
  it("有参数卡片渲染 key: value 紧凑标签", () => {
    const wrapper = mount(LauncherFlowPanel, {
      props: createProps({
        stagedCommands: [createArgCommand()]
      })
    });

    const params = wrapper.find(".flow-card__params");
    expect(params.exists()).toBe(true);

    const paramItems = wrapper.findAll(".flow-card__param");
    expect(paramItems.length).toBe(2);

    // 第一个参数：端口: 3000
    const firstKey = paramItems[0]!.get(".flow-card__param-key");
    expect(firstKey.text()).toBe("端口:");

    const firstValue = paramItems[0]!.get(".flow-card__param-value");
    expect(firstValue.text()).toBe("3000");

    // 第二个参数：主机: localhost
    const secondKey = paramItems[1]!.get(".flow-card__param-key");
    expect(secondKey.text()).toBe("主机:");

    const secondValue = paramItems[1]!.get(".flow-card__param-value");
    expect(secondValue.text()).toBe("localhost");
  });

  it("无参数卡片不渲染参数标签区域", () => {
    const wrapper = mount(LauncherFlowPanel, {
      props: createProps({
        stagedCommands: [createStagedCommand({ args: [], argValues: {} })]
      })
    });

    expect(wrapper.find(".flow-card__params").exists()).toBe(false);
  });
});

describe("LauncherFlowPanel 内联编辑", () => {
  it("点击 value 进入编辑态，显示输入框", async () => {
    const wrapper = mount(LauncherFlowPanel, {
      props: createProps({
        stagedCommands: [createArgCommand()]
      })
    });

    // 初始状态：显示值标签，无输入框
    expect(wrapper.find(".flow-card__param-input").exists()).toBe(false);
    const valueSpan = wrapper.get(".flow-card__param-value");
    expect(valueSpan.text()).toBe("3000");

    // 点击值标签
    await valueSpan.trigger("click");
    await nextTick();

    // 进入编辑态：出现输入框
    const input = wrapper.find(".flow-card__param-input");
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).value).toBe("3000");
  });

  it("Enter 确认编辑并 emit update-staged-arg", async () => {
    const wrapper = mount(LauncherFlowPanel, {
      props: createProps({
        stagedCommands: [createArgCommand()]
      })
    });

    // 进入编辑态
    const valueSpan = wrapper.get(".flow-card__param-value");
    await valueSpan.trigger("click");
    await nextTick();

    const input = wrapper.get(".flow-card__param-input");

    // 修改输入值
    await input.setValue("8080");

    // Enter 确认
    await input.trigger("keydown.enter");
    await nextTick();

    // 应该 emit update-staged-arg
    const events = wrapper.emitted("update-staged-arg");
    expect(events).toBeDefined();
    // 至少在确认时 emit 一次，参数为 [cmdId, argKey, value]
    const lastEvent = events![events!.length - 1];
    expect(lastEvent).toEqual(["cmd-1", "port", "8080"]);

    // 输入框应消失（退出编辑态）
    expect(wrapper.find(".flow-card__param-input").exists()).toBe(false);
  });

  it("Esc 取消编辑并恢复原值", async () => {
    const wrapper = mount(LauncherFlowPanel, {
      props: createProps({
        stagedCommands: [createArgCommand()]
      })
    });

    // 进入编辑态
    const valueSpan = wrapper.get(".flow-card__param-value");
    await valueSpan.trigger("click");
    await nextTick();

    const input = wrapper.get(".flow-card__param-input");

    // 修改输入值
    await input.setValue("9999");

    // Esc 取消
    await input.trigger("keydown.escape");
    await nextTick();

    // 应退出编辑态
    expect(wrapper.find(".flow-card__param-input").exists()).toBe(false);

    // Esc 时应 emit 恢复原值（cancelParamEdit emit 了 originalValue）
    const events = wrapper.emitted("update-staged-arg");
    expect(events).toBeDefined();
    const lastEvent = events![events!.length - 1];
    expect(lastEvent).toEqual(["cmd-1", "port", "3000"]);
  });

  it("blur 自动确认编辑", async () => {
    const wrapper = mount(LauncherFlowPanel, {
      attachTo: document.body,
      props: createProps({
        stagedCommands: [createArgCommand()]
      })
    });

    // 进入编辑态
    const valueSpan = wrapper.get(".flow-card__param-value");
    await valueSpan.trigger("click");
    await nextTick();

    const input = wrapper.get(".flow-card__param-input");
    await input.setValue("4000");

    // 触发 blur
    await input.trigger("blur");
    await nextTick();

    // 应退出编辑态
    expect(wrapper.find(".flow-card__param-input").exists()).toBe(false);

    // blur 走 commitParamEdit，应 emit 新值
    const events = wrapper.emitted("update-staged-arg");
    expect(events).toBeDefined();
    const lastEvent = events![events!.length - 1];
    expect(lastEvent).toEqual(["cmd-1", "port", "4000"]);

    wrapper.unmount();
  });
});

describe("LauncherFlowPanel 拖拽冲突", () => {
  it("dragstart 时取消正在进行的参数编辑", async () => {
    const wrapper = mount(LauncherFlowPanel, {
      props: createProps({
        stagedCommands: [createArgCommand()]
      })
    });

    // 先进入编辑态
    const valueSpan = wrapper.get(".flow-card__param-value");
    await valueSpan.trigger("click");
    await nextTick();

    // 确认进入了编辑态
    expect(wrapper.find(".flow-card__param-input").exists()).toBe(true);

    // 模拟 dragstart — 这会触发 onDragStartWithEditGuard
    const card = wrapper.get(".staging-card");
    await card.trigger("dragstart");
    await nextTick();

    // 编辑态应被取消
    expect(wrapper.find(".flow-card__param-input").exists()).toBe(false);

    // 恢复原值的 emit 应存在
    const events = wrapper.emitted("update-staged-arg");
    expect(events).toBeDefined();
    const lastEvent = events![events!.length - 1];
    expect(lastEvent).toEqual(["cmd-1", "port", "3000"]);
  });
});

describe("LauncherFlowPanel Toast 渲染", () => {
  it("FlowPanel 打开时在面板内渲染 toast", () => {
    const wrapper = mount(LauncherFlowPanel, {
      props: createProps({
        executionFeedbackMessage: "已复制到剪贴板",
        executionFeedbackTone: "success"
      })
    });

    const toast = wrapper.find(".execution-feedback.execution-toast");
    expect(toast.exists()).toBe(true);
    expect(toast.text()).toBe("已复制到剪贴板");
    expect(toast.classes()).toContain("execution-feedback--success");
  });

  it("无反馈消息时不渲染 toast", () => {
    const wrapper = mount(LauncherFlowPanel, {
      props: createProps({
        executionFeedbackMessage: "",
        executionFeedbackTone: "neutral"
      })
    });

    expect(wrapper.find(".execution-feedback.execution-toast").exists()).toBe(false);
  });

  it("toast 渲染不同 tone 对应不同 CSS 类", () => {
    const tones = ["neutral", "success", "error"] as const;
    for (const tone of tones) {
      const wrapper = mount(LauncherFlowPanel, {
        props: createProps({
          executionFeedbackMessage: "测试消息",
          executionFeedbackTone: tone
        })
      });

      const toast = wrapper.get(".execution-feedback.execution-toast");
      expect(toast.classes()).toContain(`execution-feedback--${tone}`);
    }
  });
});
