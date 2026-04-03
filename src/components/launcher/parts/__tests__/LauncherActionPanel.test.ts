import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import type { CommandTemplate } from "../../../../features/commands/commandTemplates";
import LauncherActionPanel from "../LauncherActionPanel.vue";

function createCommand(): CommandTemplate {
  return {
    id: "action-cmd",
    title: "示例命令",
    description: "desc",
    preview: "echo hi",
    execution: {
      kind: "exec",
      program: "echo",
      args: ["hi"]
    },
    folder: "test",
    category: "test",
    needsArgs: false
  };
}

describe("LauncherActionPanel", () => {
  it("提供鼠标可点击的返回按钮", async () => {
    const wrapper = mount(LauncherActionPanel, {
      props: {
        command: createCommand()
      }
    });

    await wrapper.get(".launcher-action-panel__back").trigger("click");

    expect(wrapper.emitted("cancel")).toHaveLength(1);
  });

  it("ArrowDown + Enter 会选择下一项动作", async () => {
    const wrapper = mount(LauncherActionPanel, {
      props: {
        command: createCommand()
      }
    });

    await wrapper.trigger("keydown", { key: "ArrowDown" });
    await wrapper.trigger("keydown", { key: "Enter" });

    expect(wrapper.emitted("select-intent")?.[0]).toEqual(["stage"]);
    expect(wrapper.emitted("cancel")).toBeUndefined();
  });

  it("Escape 会本地取消并阻止继续冒泡", async () => {
    const wrapper = mount(LauncherActionPanel, {
      attachTo: document.body,
      props: {
        command: createCommand()
      }
    });
    const bodyKeydownSpy = vi.fn();
    document.body.addEventListener("keydown", bodyKeydownSpy);

    try {
      await wrapper.get(".launcher-action-panel").trigger("keydown", { key: "Escape" });
    } finally {
      document.body.removeEventListener("keydown", bodyKeydownSpy);
    }

    expect(wrapper.emitted("cancel")).toHaveLength(1);
    expect(bodyKeydownSpy).not.toHaveBeenCalled();
  });

  it("动作卡提供明确的 hover 阴影提示，面板根节点不暴露默认焦点白框类", () => {
    const wrapper = mount(LauncherActionPanel, {
      props: {
        command: createCommand()
      }
    });

    const panel = wrapper.get(".launcher-action-panel");
    const action = wrapper.get(".launcher-action-panel__action");

    expect(panel.classes()).toContain("focus-visible:outline-none");
    expect(panel.classes()).toContain("outline-none");
    expect(action.classes()).toContain("hover:shadow-launcher-chip-inset");
    expect(action.classes()).toContain("hover:bg-ui-text/6");
    expect(action.classes()).toContain("focus-visible:ring-ui-brand/24");
  });
});
