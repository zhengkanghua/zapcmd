import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { ref, computed } from "vue";
import LauncherCommandPanel from "../LauncherCommandPanel.vue";
import { LAUNCHER_NAV_STACK_KEY } from "../../../../composables/launcher/useLauncherNavStack";
import type { CommandTemplate } from "../../../../features/commands/commandTemplates";

function createCommand(overrides: Partial<CommandTemplate> = {}): CommandTemplate {
  return {
    id: "test-cmd",
    title: "测试命令",
    description: "描述",
    preview: "echo {{value}}",
    folder: "test",
    category: "system",
    needsArgs: true,
    args: [
      {
        key: "value",
        label: "VALUE",
        token: "{{value}}",
        placeholder: "输入值",
        required: true
      }
    ],
    ...overrides
  };
}

function createNavStackMock() {
  return {
    stack: ref([{ type: "search" as const }]),
    currentPage: computed(() => ({ type: "command-action" as const })),
    canGoBack: computed(() => true),
    pushPage: vi.fn(),
    popPage: vi.fn(),
    resetToSearch: vi.fn()
  };
}

function mountPanel(
  props: Partial<{
    command: CommandTemplate;
    mode: "execute" | "stage";
    isDangerous: boolean;
    pendingArgValues: Record<string, string>;
  }> = {}
) {
  const navStack = createNavStackMock();
  return mount(LauncherCommandPanel, {
    props: {
      command: createCommand(),
      mode: "execute",
      isDangerous: false,
      pendingArgValues: {},
      executionFeedbackMessage: "",
      executionFeedbackTone: "neutral",
      ...props
    },
    global: {
      provide: { [LAUNCHER_NAV_STACK_KEY as unknown as symbol]: navStack },
      stubs: { LauncherIcon: true }
    }
  });
}

describe("LauncherCommandPanel", () => {
  describe("场景 1：有参数 + 非高危", () => {
    it("显示参数输入徽标", () => {
      const wrapper = mountPanel({
        command: createCommand({ dangerous: false }),
        mode: "execute",
        isDangerous: false
      });
      expect(wrapper.text()).toContain("参数输入");
    });

    it("execute 模式显示直接执行按钮", () => {
      const wrapper = mountPanel({
        command: createCommand({ dangerous: false }),
        mode: "execute",
        isDangerous: false
      });
      const btn = wrapper.find("[data-testid='confirm-btn']");
      expect(btn.text()).toContain("直接执行");
    });

    it("stage 模式显示加入执行流按钮", () => {
      const wrapper = mountPanel({
        command: createCommand({ dangerous: false }),
        mode: "stage",
        isDangerous: false
      });
      const btn = wrapper.find("[data-testid='confirm-btn']");
      expect(btn.text()).toContain("加入执行流");
    });

    it("不显示高危横幅", () => {
      const wrapper = mountPanel({
        command: createCommand({ dangerous: false }),
        mode: "execute",
        isDangerous: false
      });
      expect(wrapper.find("[data-testid='danger-banner']").exists()).toBe(false);
    });
  });

  describe("场景 2：无参数 + 高危", () => {
    it("显示高危操作确认徽标", () => {
      const wrapper = mountPanel({
        command: createCommand({ needsArgs: false, args: [], dangerous: true }),
        mode: "execute",
        isDangerous: true
      });
      expect(wrapper.text()).toContain("高危操作确认");
    });

    it("显示高危横幅和 24h 复选框", () => {
      const wrapper = mountPanel({
        command: createCommand({ needsArgs: false, args: [], dangerous: true }),
        mode: "execute",
        isDangerous: true
      });
      expect(wrapper.find("[data-testid='danger-banner']").exists()).toBe(true);
      expect(wrapper.find("[data-testid='dismiss-checkbox']").exists()).toBe(true);
    });

    it("execute 模式显示红色确定执行按钮", () => {
      const wrapper = mountPanel({
        command: createCommand({ needsArgs: false, args: [], dangerous: true }),
        mode: "execute",
        isDangerous: true
      });
      const btn = wrapper.find("[data-testid='confirm-btn']");
      expect(btn.text()).toContain("确定执行");
      expect(btn.classes()).toContain("command-panel__btn--danger");
    });
  });

  describe("场景 3：有参数 + 高危", () => {
    it("显示高危拦截与配置徽标", () => {
      const wrapper = mountPanel({
        command: createCommand({ dangerous: true }),
        mode: "stage",
        isDangerous: true
      });
      expect(wrapper.text()).toContain("高危拦截与配置");
    });

    it("同时显示高危横幅和参数表单", () => {
      const wrapper = mountPanel({
        command: createCommand({ dangerous: true }),
        mode: "stage",
        isDangerous: true
      });
      expect(wrapper.find("[data-testid='danger-banner']").exists()).toBe(true);
      expect(wrapper.find("[data-testid='param-form']").exists()).toBe(true);
    });
  });

  describe("命令预览", () => {
    it("使用文本插值渲染命令预览", () => {
      const wrapper = mountPanel({
        command: createCommand(),
        mode: "execute",
        isDangerous: false,
        pendingArgValues: { value: "hello" }
      });
      const preview = wrapper.find("[data-testid='command-preview']");
      expect(preview.exists()).toBe(true);
      expect(preview.text()).toContain("hello");
    });
  });

  describe("事件触发", () => {
    it("确认按钮触发 submit emit 并携带 pendingArgValues 和 dismissChecked", async () => {
      const wrapper = mountPanel({
        command: createCommand({ dangerous: true }),
        mode: "execute",
        isDangerous: true,
        pendingArgValues: { value: "test" }
      });
      const checkbox = wrapper.find("[data-testid='dismiss-checkbox'] input");
      await checkbox.setValue(true);
      const btn = wrapper.find("[data-testid='confirm-btn']");
      await btn.trigger("click");
      const submitEvents = wrapper.emitted("submit");
      expect(submitEvents).toHaveLength(1);
      expect(submitEvents![0][0]).toEqual({ value: "test" });
      expect(submitEvents![0][1]).toBe(true);
    });

    it("取消按钮触发 cancel emit 和 popPage", async () => {
      const navStack = createNavStackMock();
      const wrapper = mount(LauncherCommandPanel, {
        props: {
          command: createCommand(),
          mode: "execute",
          isDangerous: false,
          pendingArgValues: {},
          executionFeedbackMessage: "",
          executionFeedbackTone: "neutral"
        },
        global: {
          provide: { [LAUNCHER_NAV_STACK_KEY as unknown as symbol]: navStack },
          stubs: { LauncherIcon: true }
        }
      });
      const cancelBtn = wrapper.find(".command-panel__btn--cancel");
      await cancelBtn.trigger("click");
      expect(wrapper.emitted("cancel")).toHaveLength(1);
      expect(navStack.popPage).toHaveBeenCalled();
    });

    it("参数输入触发 arg-input emit", async () => {
      const wrapper = mountPanel({
        command: createCommand(),
        mode: "execute",
        isDangerous: false,
        pendingArgValues: { value: "" }
      });
      const input = wrapper.find(".command-panel__input");
      await input.setValue("new-value");
      const argInputEvents = wrapper.emitted("arg-input");
      expect(argInputEvents).toBeTruthy();
      expect(argInputEvents![0]).toEqual(["value", "new-value"]);
    });
  });
});
