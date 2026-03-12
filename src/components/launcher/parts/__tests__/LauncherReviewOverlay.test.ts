import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import { summarizeCommandForFeedback } from "../../../../composables/execution/useCommandExecution/helpers";
import type { StagedCommand } from "../../../../features/launcher/types";
import type { KeyboardHint, LauncherReviewOverlayProps, LauncherSearchPanelProps } from "../../types";
import LauncherReviewOverlay from "../LauncherReviewOverlay.vue";
import LauncherSearchPanel from "../LauncherSearchPanel.vue";

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
  overrides: Partial<LauncherReviewOverlayProps> = {}
): LauncherReviewOverlayProps {
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
    setStagingPanelRef: () => {},
    setStagingListRef: () => {},
    ...overrides
  };
}

function createSearchPanelProps(
  overrides: Partial<LauncherSearchPanelProps> = {}
): LauncherSearchPanelProps {
  const keyboardHints: KeyboardHint[] = [
    {
      keys: ["Enter"],
      action: "执行"
    }
  ];
  const stagingHints: KeyboardHint[] = [
    {
      keys: ["Esc"],
      action: "返回"
    }
  ];
  return {
    query: "",
    executing: false,
    executionFeedbackMessage: "",
    executionFeedbackTone: "neutral",
    drawerOpen: false,
    drawerViewportHeight: 0,
    drawerFloorViewportHeight: 322,
    drawerFillerHeight: 0,
    keyboardHints,
    filteredResults: [],
    activeIndex: 0,
    stagedFeedbackCommandId: null,
    stagedCommandCount: 0,
    flowOpen: false,
    reviewOpen: true,
    stagingDrawerState: "open",
    stagedCommands: [createStagedCommand()],
    stagingHints,
    stagingListShouldScroll: true,
    stagingListMaxHeight: "200px",
    focusZone: "staging",
    stagingActiveIndex: 0,
    setSearchInputRef: () => {},
    setDrawerRef: () => {},
    setResultButtonRef: () => {},
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

describe("LauncherReviewOverlay 组件级语义回归（Phase 14）", () => {
  it("in-panel 结构约束：review-overlay 位于 search-main 子树内且不覆盖 search capsule", () => {
    const wrapper = mount(LauncherSearchPanel, {
      props: createSearchPanelProps()
    });

    const searchMain = wrapper.get(".search-main");
    expect(searchMain.find(".review-overlay").exists()).toBe(true);
    expect(wrapper.find(".search-capsule .review-overlay").exists()).toBe(false);
  });

  it("根节点/遮罩/面板具备 overlay hit-zone 与 dialog 语义", () => {
    const wrapper = mount(LauncherReviewOverlay, { props: createProps() });

    const overlay = wrapper.get(".review-overlay");
    expect(overlay.classes()).toContain("review-overlay--open");
    expect(overlay.attributes("data-hit-zone")).toBe("overlay");

    const scrim = wrapper.get(".review-overlay__scrim");
    expect(scrim.attributes("data-hit-zone")).toBe("overlay");

    const panel = wrapper.get(".review-panel");
    expect(panel.attributes("data-hit-zone")).toBe("overlay");
    expect(panel.attributes("role")).toBe("dialog");
    expect(panel.attributes("aria-modal")).toBe("true");

    expect(wrapper.find(".review-panel__header").exists()).toBe(true);
    expect(wrapper.find(".review-panel__footer").exists()).toBe(true);

    const list = wrapper.get(".review-list");
    expect(list.classes()).toContain("staging-list--scrollable");
    expect((list.element as HTMLElement).style.maxHeight).toBe("200px");
    expect((list.element as HTMLElement).style.minHeight).toBe("");
  });

  it("长命令默认显示摘要，title 保留完整命令，并支持复制按钮", async () => {
    const longCommand = `echo ${"x".repeat(120)}`;
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: clipboardWriteText }
    });

    const wrapper = mount(LauncherReviewOverlay, {
      props: createProps({
        stagedCommands: [createStagedCommand({ renderedCommand: longCommand })]
      })
    });

    const command = wrapper.get(".review-card__command");
    expect(command.attributes("title")).toBe(longCommand);
    expect(command.text()).toBe(summarizeCommandForFeedback(longCommand));
    expect(command.text().endsWith("...")).toBe(true);

    const actions = wrapper.get(".review-card__actions");
    const buttons = actions.findAll("button");
    expect(buttons.length).toBe(2);

    await buttons[0]!.trigger("click");
    expect(clipboardWriteText).toHaveBeenCalledTimes(1);
    expect(clipboardWriteText).toHaveBeenCalledWith(longCommand);
  });

  it("队列为空时渲染空态且不自动关闭", async () => {
    const wrapper = mount(LauncherReviewOverlay, {
      props: createProps({ stagedCommands: [] })
    });

    expect(wrapper.find(".review-overlay").exists()).toBe(true);
    expect(wrapper.find(".review-panel__empty").exists()).toBe(true);
    expect(wrapper.emitted("toggle-staging")).toBeUndefined();
  });

  it("Flow 打开时禁用执行队列：按钮呈现禁用态，点击只 toast 不执行", async () => {
    const wrapper = mount(LauncherReviewOverlay, {
      props: createProps({
        flowOpen: true,
        stagedCommands: [createStagedCommand()]
      })
    });

    const executeButton = wrapper.get(".review-panel__footer .btn-primary");
    expect(executeButton.attributes("aria-disabled")).toBe("true");

    await executeButton.trigger("click");
    expect(wrapper.emitted("execute-staged")).toBeUndefined();

    const feedback = wrapper.emitted("execution-feedback");
    expect(feedback?.length).toBe(1);
    expect(feedback?.[0]?.[0]).toBe("neutral");
    expect(String(feedback?.[0]?.[1] ?? "")).toContain("完成或取消当前流程");
  });

  it("Review 打开后会把焦点送入 review-panel 内（不滞留背景 Search）", async () => {
    const wrapper = mount(LauncherReviewOverlay, {
      attachTo: document.body,
      props: createProps()
    });

    await nextTick();
    await nextTick();
    const panel = wrapper.get(".review-panel").element as HTMLElement;
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    expect(active).not.toBeNull();
    expect(panel.contains(active!)).toBe(true);
    wrapper.unmount();
  });

  it("plain Tab 在 Review 内循环且不会冒泡到 window", async () => {
    const wrapper = mount(LauncherReviewOverlay, {
      attachTo: document.body,
      props: createProps()
    });

    await nextTick();
    await nextTick();
    const panel = wrapper.get(".review-panel").element as HTMLElement;

    const windowKeydownSpy = vi.fn();
    window.addEventListener("keydown", windowKeydownSpy);

    const closeButton = wrapper.get(".review-panel__header button").element as HTMLButtonElement;
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
