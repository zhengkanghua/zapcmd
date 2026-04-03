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
});
