import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import { summarizeCommandForFeedback } from "../../../../composables/execution/useCommandExecution/helpers";
import type { StagedCommand } from "../../../../features/launcher/types";
import type { LauncherReviewOverlayProps } from "../../types";
import LauncherReviewOverlay from "../LauncherReviewOverlay.vue";

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
  return {
    stagingDrawerState: "open",
    stagingExpanded: true,
    stagedCommands: [createStagedCommand()],
    stagingHintText: "hint",
    stagingListShouldScroll: true,
    stagingListMaxHeight: "200px",
    drawerFloorViewportHeight: 322,
    focusZone: "staging",
    stagingActiveIndex: 0,
    executing: false,
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
    expect((list.element as HTMLElement).style.minHeight).toBe("322px");
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
    expect(wrapper.get(".review-panel__empty").exists()).toBe(true);
    expect(wrapper.emitted("toggle-staging")).toBeUndefined();
  });
});

