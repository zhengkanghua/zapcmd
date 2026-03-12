import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import type { CommandTemplate } from "../../../../features/commands/commandTemplates";
import type { CommandArg } from "../../../../features/commands/types";
import type { LauncherSafetyDialog, ParamSubmitMode } from "../../types";
import LauncherFlowDrawer from "../LauncherFlowDrawer.vue";

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

function createArg(): CommandArg {
  return {
    key: "value",
    label: "端口",
    token: "{{value}}",
    placeholder: "3000"
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
    pendingCommand: null,
    pendingArgs: [],
    pendingArgValues: {},
    pendingSubmitHint: "",
    pendingSubmitMode: "stage" as ParamSubmitMode,
    setParamInputRef: () => {},
    safetyDialog: null,
    reviewOpen: false,
    executing: false,
    ...overrides
  };
}

describe("LauncherFlowDrawer", () => {
  it("pendingCommand 存在时渲染 Param 页", () => {
    const wrapper = mount(LauncherFlowDrawer, {
      props: {
        ...createBaseProps({
          pendingCommand: createCommandTemplate("cmd-1")
        })
      }
    });

    expect(wrapper.find(".flow-overlay").exists()).toBe(true);
    expect(wrapper.find(".flow-page--param").exists()).toBe(true);
    expect(wrapper.find(".flow-page--safety").exists()).toBe(false);
  });

  it("safetyDialog 存在时渲染 Safety 页（即使 pendingCommand 为空）", () => {
    const wrapper = mount(LauncherFlowDrawer, {
      props: {
        ...createBaseProps({
          safetyDialog: createSafetyDialog()
        })
      }
    });

    expect(wrapper.find(".flow-overlay").exists()).toBe(true);
    expect(wrapper.find(".flow-page--safety").exists()).toBe(true);
    expect(wrapper.find(".flow-page--param").exists()).toBe(false);
  });

  it("Review 未打开时渲染 scrim，点击会触发对应 cancel", async () => {
    const wrapper = mount(LauncherFlowDrawer, {
      props: createBaseProps({
        pendingCommand: createCommandTemplate("cmd-1"),
        reviewOpen: false
      })
    });

    expect(wrapper.find(".flow-overlay__scrim").exists()).toBe(true);
    await wrapper.get(".flow-overlay__scrim").trigger("click");
    expect(wrapper.emitted("cancel-param-input")).toHaveLength(1);
  });

  it("Review 打开时不渲染 scrim，避免遮罩覆盖右侧抽屉", () => {
    const wrapper = mount(LauncherFlowDrawer, {
      props: createBaseProps({
        pendingCommand: createCommandTemplate("cmd-1"),
        reviewOpen: true
      })
    });

    expect(wrapper.find(".flow-overlay__scrim").exists()).toBe(false);
  });

  it("Param 页：点击关闭按钮会 emit cancel-param-input", async () => {
    const wrapper = mount(LauncherFlowDrawer, {
      props: createBaseProps({
        pendingCommand: createCommandTemplate("cmd-1")
      })
    });

    await wrapper.get(".flow-close-button").trigger("click");
    expect(wrapper.emitted("cancel-param-input")).toHaveLength(1);
  });

  it("Safety 页：点击关闭按钮会 emit cancel-safety-execution", async () => {
    const wrapper = mount(LauncherFlowDrawer, {
      props: createBaseProps({
        safetyDialog: createSafetyDialog()
      })
    });

    await wrapper.get(".flow-close-button").trigger("click");
    expect(wrapper.emitted("cancel-safety-execution")).toHaveLength(1);
  });

  it("Param 页：点击取消会 emit cancel-param-input", async () => {
    const wrapper = mount(LauncherFlowDrawer, {
      props: createBaseProps({
        pendingCommand: createCommandTemplate("cmd-1"),
        pendingArgs: [createArg()],
        pendingArgValues: { value: "3000" }
      })
    });

    await wrapper.get(".flow-param-cancel").trigger("click");
    expect(wrapper.emitted("cancel-param-input")).toHaveLength(1);
  });

  it("Param 页：输入会 emit update-pending-arg", async () => {
    const wrapper = mount(LauncherFlowDrawer, {
      props: createBaseProps({
        pendingCommand: createCommandTemplate("cmd-1"),
        pendingArgs: [createArg()],
        pendingArgValues: { value: "3000" }
      })
    });

    await wrapper.get("#param-input-value").setValue("8088");
    expect(wrapper.emitted("update-pending-arg")).toEqual([["value", "8088"]]);
  });

  it("Param 页：提交会 emit submit-param-input", async () => {
    const wrapper = mount(LauncherFlowDrawer, {
      props: createBaseProps({
        pendingCommand: createCommandTemplate("cmd-1"),
        pendingArgs: [createArg()],
        pendingArgValues: { value: "3000" }
      })
    });

    await wrapper.get("form").trigger("submit");
    expect(wrapper.emitted("submit-param-input")).toHaveLength(1);
  });

  it("Safety 页：取消/确认分别 emit cancel/confirm-safety-execution", async () => {
    const wrapper = mount(LauncherFlowDrawer, {
      props: createBaseProps({
        safetyDialog: createSafetyDialog()
      })
    });

    await wrapper.get(".flow-safety-cancel").trigger("click");
    await wrapper.get(".flow-safety-confirm").trigger("click");

    expect(wrapper.emitted("cancel-safety-execution")).toHaveLength(1);
    expect(wrapper.emitted("confirm-safety-execution")).toHaveLength(1);
  });
});
