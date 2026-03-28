import { readFileSync } from "node:fs";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { StagedCommand } from "../../../../features/launcher/types";
import type { KeyboardHint, LauncherFlowPanelProps } from "../../types";
import LauncherFlowPanel from "../LauncherFlowPanel.vue";

class ResizeObserverMock {
  static instances: ResizeObserverMock[] = [];

  static reset(): void {
    ResizeObserverMock.instances = [];
  }

  readonly observe = vi.fn((element: Element) => {
    this.targets.add(element);
  });

  readonly unobserve = vi.fn((element: Element) => {
    this.targets.delete(element);
  });

  readonly disconnect = vi.fn(() => {
    this.targets.clear();
  });

  private readonly targets = new Set<Element>();

  constructor(private readonly callback: ResizeObserverCallback) {
    ResizeObserverMock.instances.push(this);
  }

  trigger(): void {
    const entries = Array.from(this.targets).map((target) => {
      const rect =
        target instanceof HTMLElement
          ? target.getBoundingClientRect()
          : ({ width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0, x: 0, y: 0 } as DOMRect);
      return {
        target,
        contentRect: rect
      } as ResizeObserverEntry;
    });
    this.callback(entries, this as unknown as ResizeObserver);
  }
}

const originalResizeObserver = globalThis.ResizeObserver;

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

function mockScrollable(
  element: HTMLElement,
  options: {
    clientHeight: number;
    scrollHeight: number;
    scrollTop?: number;
  }
): void {
  Object.defineProperty(element, "clientHeight", {
    configurable: true,
    value: options.clientHeight
  });
  Object.defineProperty(element, "scrollHeight", {
    configurable: true,
    value: options.scrollHeight
  });

  let scrollTop = options.scrollTop ?? 0;
  Object.defineProperty(element, "scrollTop", {
    configurable: true,
    get: () => scrollTop,
    set: (value: number) => {
      scrollTop = value;
    }
  });
}

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");

afterEach(() => {
  vi.useRealTimers();
  ResizeObserverMock.reset();
  if (originalResizeObserver) {
    globalThis.ResizeObserver = originalResizeObserver;
  } else {
    // @ts-expect-error - 测试环境可能原本没有 ResizeObserver
    delete globalThis.ResizeObserver;
  }
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, "clipboard", originalClipboardDescriptor);
  } else {
    // @ts-expect-error - clipboard 在 jsdom 中可能不存在
    delete navigator.clipboard;
  }
});

describe("LauncherFlowPanel 三段式结构与 settled contract", () => {
  it("delegates height observation, grip reorder and inline args state out of the main file", () => {
    const source = readFileSync("src/components/launcher/parts/LauncherFlowPanel.vue", "utf8");

    expect(source).toContain("useFlowPanelHeightObservation");
    expect(source).toContain("useFlowPanelGripReorder");
    expect(source).toContain("useFlowPanelInlineArgs");
    expect(source).not.toContain("let gripReorderCleanup");
    expect(source).not.toContain("let flowPanelHeightObserver");
    expect(source).not.toContain("const editingParam = ref");
  });

  it("keeps settled, grip drag-end and inline arg update emits stable", async () => {
    const wrapper = mount(LauncherFlowPanel, {
      attachTo: document.body,
      props: createProps({
        stagedCommands: [
          createArgCommand(),
          createStagedCommand({ id: "cmd-2", title: "命令 2" })
        ]
      })
    });

    await nextTick();
    await nextTick();
    expect(wrapper.emitted("flow-panel-settled")).toHaveLength(1);

    await wrapper.find(".flow-card__grip").trigger("mousedown", {
      button: 0,
      buttons: 1,
      clientX: 80,
      clientY: 120
    });
    window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0 }));
    await nextTick();
    expect(wrapper.emitted("staging-drag-end")).toBeTruthy();

    await wrapper.get(".flow-card__param-value").trigger("click");
    await nextTick();
    const input = wrapper.get(".flow-card__param-input");
    await input.setValue("8080");
    await input.trigger("keydown.enter");
    await nextTick();
    expect(wrapper.emitted("update-staged-arg")).toBeTruthy();

    wrapper.unmount();
  });

  it("FlowPanel 采用 header + body + footer 三段式，空态与列表态都挂在 body 内", () => {
    const emptyWrapper = mount(LauncherFlowPanel, {
      props: createProps({ stagedCommands: [] })
    });
    expect(emptyWrapper.find(".flow-panel__header").exists()).toBe(true);
    expect(emptyWrapper.find(".flow-panel__body").exists()).toBe(true);
    expect(emptyWrapper.find(".flow-panel__footer").exists()).toBe(true);
    expect(emptyWrapper.find(".flow-panel__body .flow-panel__empty").exists()).toBe(true);
    expect(emptyWrapper.find(".flow-panel__body .flow-panel__list").exists()).toBe(false);
    emptyWrapper.unmount();

    const listWrapper = mount(LauncherFlowPanel, {
      props: createProps({
        stagedCommands: [createStagedCommand(), createStagedCommand({ id: "cmd-2" })]
      })
    });
    expect(listWrapper.find(".flow-panel__header").exists()).toBe(true);
    expect(listWrapper.find(".flow-panel__body").exists()).toBe(true);
    expect(listWrapper.find(".flow-panel__footer").exists()).toBe(true);
    expect(listWrapper.find(".flow-panel__body .flow-panel__list").exists()).toBe(true);
    expect(listWrapper.find(".flow-panel__body .flow-panel__empty").exists()).toBe(false);
    listWrapper.unmount();
  });

  it("execution feedback uses a polite live region", () => {
    const wrapper = mount(LauncherFlowPanel, {
      props: createProps({
        executionFeedbackMessage: "已复制命令",
        executionFeedbackTone: "success"
      })
    });

    const feedback = wrapper.get(".execution-feedback");
    expect(feedback.attributes("role")).toBe("status");
    expect(feedback.attributes("aria-live")).toBe("polite");
    wrapper.unmount();
  });

  it("does not keep width transitions on the flow panel shell", () => {
    const wrapper = mount(LauncherFlowPanel, {
      props: createProps()
    });

    expect(wrapper.get(".flow-panel").classes()).not.toContain("transition-launcher-width");
    wrapper.unmount();
  });

  it("keeps review header icon actions at a 36px hit target floor", () => {
    const wrapper = mount(LauncherFlowPanel, {
      props: createProps()
    });

    const closeButton = wrapper.get(".flow-panel__close");
    expect(closeButton.classes()).toContain("min-w-[36px]");
    expect(closeButton.classes()).toContain("min-h-[36px]");
    wrapper.unmount();
  });

  it("stagingDrawerState 从 opening -> open 时发出一次 flow-panel-settled", async () => {
    const wrapper = mount(LauncherFlowPanel, {
      props: createProps({ stagingDrawerState: "opening" })
    });
    expect(wrapper.emitted("flow-panel-settled")).toBeUndefined();

    await wrapper.setProps({ stagingDrawerState: "open" });
    await nextTick();

    expect(wrapper.emitted("flow-panel-settled")).toHaveLength(1);
    wrapper.unmount();
  });

  it("组件首帧即 open 时，mounted 后补发一次 flow-panel-settled", async () => {
    const wrapper = mount(LauncherFlowPanel, {
      props: createProps({ stagingDrawerState: "open" })
    });

    // 首帧 mount 同步阶段不应立即发出，必须在 mounted/nextTick 后补发。
    expect(wrapper.emitted("flow-panel-settled")).toBeUndefined();

    await nextTick();

    expect(wrapper.emitted("flow-panel-settled") ?? []).toHaveLength(1);
    wrapper.unmount();
  });

  it("同一轮 open 生命周期不会重复发出 flow-panel-settled", async () => {
    const wrapper = mount(LauncherFlowPanel, {
      props: createProps({ stagingDrawerState: "opening" })
    });

    await wrapper.setProps({ stagingDrawerState: "open" });
    await nextTick();
    expect(wrapper.emitted("flow-panel-settled")).toHaveLength(1);

    await wrapper.setProps({
      stagingDrawerState: "open",
      stagingActiveIndex: 1
    });
    await nextTick();

    expect(wrapper.emitted("flow-panel-settled")).toHaveLength(1);
    wrapper.unmount();
  });

  it("open 后短时观察前两张卡片尺寸变化，发出 flow-panel-height-change；稳定后停止观察", async () => {
    vi.useFakeTimers();
    globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

    const wrapper = mount(LauncherFlowPanel, {
      props: createProps({
        stagedCommands: [createStagedCommand(), createStagedCommand({ id: "cmd-2" })]
      })
    });

    await nextTick();
    await nextTick();

    expect(wrapper.emitted("flow-panel-settled") ?? []).toHaveLength(1);
    expect(ResizeObserverMock.instances).toHaveLength(1);

    ResizeObserverMock.instances[0]!.trigger();
    await Promise.resolve();

    expect(wrapper.emitted("flow-panel-height-change") ?? []).toHaveLength(1);

    vi.runOnlyPendingTimers();
    ResizeObserverMock.instances[0]!.trigger();
    await Promise.resolve();

    expect(wrapper.emitted("flow-panel-height-change") ?? []).toHaveLength(1);
    wrapper.unmount();
  });

  it("body/list 保持单一滚动宿主：空态滚 body，列表态滚 list", async () => {
    const emptyWrapper = mount(LauncherFlowPanel, {
      props: createProps({ stagedCommands: [] })
    });
    const emptyScrim = emptyWrapper.get(".flow-panel-overlay__scrim");
    const emptyBody = emptyWrapper.get(".flow-panel__body").element as HTMLElement;
    mockScrollable(emptyBody, { clientHeight: 180, scrollHeight: 420, scrollTop: 40 });

    emptyScrim.element.dispatchEvent(
      new WheelEvent("wheel", { deltaY: 30, bubbles: true, cancelable: true })
    );
    expect(emptyBody.scrollTop).toBe(70);
    emptyWrapper.unmount();

    const listWrapper = mount(LauncherFlowPanel, {
      props: createProps({
        stagedCommands: [createStagedCommand(), createStagedCommand({ id: "cmd-2" })]
      })
    });
    const listScrim = listWrapper.get(".flow-panel-overlay__scrim");
    const listBody = listWrapper.get(".flow-panel__body").element as HTMLElement;
    const list = listWrapper.get(".flow-panel__list").element as HTMLElement;
    mockScrollable(listBody, { clientHeight: 200, scrollHeight: 200, scrollTop: 0 });
    mockScrollable(list, { clientHeight: 160, scrollHeight: 360, scrollTop: 20 });

    listScrim.element.dispatchEvent(
      new WheelEvent("wheel", { deltaY: 40, bubbles: true, cancelable: true })
    );
    expect(list.scrollTop).toBe(60);
    expect(listBody.scrollTop).toBe(0);
    listWrapper.unmount();
  });

  it("列表态挂载 flow-panel--has-list，空态不挂载该 modifier", () => {
    const listWrapper = mount(LauncherFlowPanel, {
      props: createProps({
        stagedCommands: [createStagedCommand()]
      })
    });
    expect(listWrapper.get(".flow-panel").classes()).toContain("flow-panel--has-list");
    listWrapper.unmount();

    const emptyWrapper = mount(LauncherFlowPanel, {
      props: createProps({
        stagedCommands: []
      })
    });
    expect(emptyWrapper.get(".flow-panel").classes()).not.toContain("flow-panel--has-list");
    emptyWrapper.unmount();
  });
});

describe("LauncherFlowPanel 组件级语义回归（Phase 14）", () => {
  it("open/opening 态的 overlay 不应残留 pointer-events-none，closing 态必须禁交互", async () => {
    const wrapper = mount(LauncherFlowPanel, {
      props: createProps({ stagingDrawerState: "open" })
    });

    expect(wrapper.get(".flow-panel-overlay").classes()).toContain("pointer-events-auto");
    expect(wrapper.get(".flow-panel-overlay").classes()).not.toContain("pointer-events-none");

    await wrapper.setProps({ stagingDrawerState: "opening" });
    expect(wrapper.get(".flow-panel-overlay").classes()).toContain("pointer-events-auto");
    expect(wrapper.get(".flow-panel-overlay").classes()).not.toContain("pointer-events-none");

    await wrapper.setProps({ stagingDrawerState: "closing" });
    expect(wrapper.get(".flow-panel-overlay").classes()).toContain("pointer-events-none");
    wrapper.unmount();
  });

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
    expect(list.classes()).not.toContain("staging-list--scrollable");
    expect((list.element as HTMLElement).style.maxHeight).toBe("");
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

describe("LauncherFlowPanel 抓手重排跟手性", () => {
  it("通过 window mousemove 跟踪鼠标，而不是依赖列表项本身的 mousemove", async () => {
    const wrapper = mount(LauncherFlowPanel, {
      attachTo: document.body,
      props: createProps({
        stagedCommands: [
          createStagedCommand({ id: "cmd-1", title: "命令 1" }),
          createStagedCommand({ id: "cmd-2", title: "命令 2" })
        ]
      })
    });

    const items = wrapper.findAll(".flow-panel__list-item");
    expect(items).toHaveLength(2);

    vi.spyOn(items[1]!.element, "getBoundingClientRect").mockReturnValue({
      top: 100,
      bottom: 200,
      left: 0,
      right: 200,
      width: 200,
      height: 100,
      x: 0,
      y: 100,
      toJSON: () => ({})
    } as DOMRect);

    if (typeof document.elementFromPoint !== "function") {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: vi.fn()
      });
    }

    const elementFromPointSpy = vi.spyOn(document, "elementFromPoint").mockReturnValue(items[1]!.element as Element);

    await wrapper.findAll(".flow-card__grip")[0]!.trigger("mousedown", {
      button: 0,
      buttons: 1,
      clientX: 80,
      clientY: 120
    });

    window.dispatchEvent(
      new MouseEvent("mousemove", {
        bubbles: true,
        buttons: 1,
        clientX: 80,
        clientY: 180
      })
    );
    await nextTick();

    const dragOverEvents = wrapper.emitted("staging-drag-over");
    expect(dragOverEvents).toBeDefined();
    expect(dragOverEvents?.[0]?.[0]).toBe(1);
    expect(elementFromPointSpy).toHaveBeenCalledWith(80, 180);

    window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0 }));
    await nextTick();
    wrapper.unmount();
  });

  it("抓手重排开始后会拦截原生 dragstart，避免与自定义重排竞争", async () => {
    const wrapper = mount(LauncherFlowPanel, {
      attachTo: document.body,
      props: createProps({
        stagedCommands: [createStagedCommand({ id: "cmd-1", title: "命令 1" })]
      })
    });

    await wrapper.find(".flow-card__grip").trigger("mousedown", {
      button: 0,
      buttons: 1,
      clientX: 80,
      clientY: 120
    });

    expect(wrapper.emitted("staging-drag-start")).toHaveLength(1);

    const nativeDragStartEvent = new Event("dragstart", {
      bubbles: true,
      cancelable: true
    });
    wrapper.get(".flow-panel__list-item").element.dispatchEvent(nativeDragStartEvent);
    await nextTick();

    expect(nativeDragStartEvent.defaultPrevented).toBe(true);
    expect(wrapper.emitted("staging-drag-start")).toHaveLength(1);

    window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0 }));
    await nextTick();
    wrapper.unmount();
  });
});
