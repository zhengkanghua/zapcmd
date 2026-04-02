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
    execution: {
      kind: "exec",
      program: "echo",
      args: ["{{value}}"]
    },
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

function createValidatedNumberCommand(): CommandTemplate {
  return createCommand({
    preview: "sudo ufw allow {{port}}/tcp",
    execution: {
      kind: "exec",
      program: "sudo",
      args: ["ufw", "allow", "{{port}}/tcp"]
    },
    args: [
      {
        key: "port",
        label: "端口",
        token: "{{port}}",
        placeholder: "3000",
        required: true,
        argType: "number",
        min: 1,
        max: 65535
      }
    ]
  });
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
    queuedCommandCount: number;
  }> = {}
) {
  const navStack = createNavStackMock();
  return mount(LauncherCommandPanel, {
    props: {
      command: createCommand(),
      mode: "execute",
      isDangerous: false,
      pendingArgValues: {},
      queuedCommandCount: 0,
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
  describe("结构 contract", () => {
    it("保留 header + 2 个 divider + content + footer 完整骨架", () => {
      const wrapper = mountPanel();

      const panel = wrapper.get(".command-panel");
      const directChildren = panel.element.children;

      expect(directChildren).toHaveLength(3);
      expect(directChildren[0]?.classList.contains("command-panel__header")).toBe(true);
      expect(directChildren[1]?.classList.contains("command-panel__content")).toBe(true);
      expect(directChildren[2]?.classList.contains("command-panel__footer")).toBe(true);

      expect(wrapper.find(".command-panel__divider--header").exists()).toBe(true);
      expect(wrapper.find(".command-panel__divider--footer").exists()).toBe(true);
      expect(wrapper.findAll(".command-panel__divider")).toHaveLength(2);
      expect(wrapper.find(".command-panel__footer .command-panel__btn--cancel").exists()).toBe(true);
      expect(wrapper.find(".command-panel__footer [data-testid='confirm-btn']").exists()).toBe(true);
    });
  });

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

    it("stage 模式显示加入队列按钮", () => {
      const wrapper = mountPanel({
        command: createCommand({ dangerous: false }),
        mode: "stage",
        isDangerous: false
      });
      const btn = wrapper.find("[data-testid='confirm-btn']");
      expect(btn.text()).toContain("加入队列");
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

    it("stage 模式在高危时确认按钮也为红色", () => {
      const wrapper = mountPanel({
        command: createCommand({ dangerous: true }),
        mode: "stage",
        isDangerous: true
      });
      const btn = wrapper.find("[data-testid='confirm-btn']");
      expect(btn.text()).toContain("加入队列");
      expect(btn.classes()).toContain("command-panel__btn--danger");
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

    it("从结构化 execution 派生预览，而不是直接信任旧 preview 模板", () => {
      const wrapper = mountPanel({
        command: createCommand({
          preview: "stale preview {{value}}",
          execution: {
            kind: "exec",
            program: "echo",
            args: ["--json", "{{value}}"]
          }
        }),
        mode: "execute",
        isDangerous: false,
        pendingArgValues: { value: "hello" }
      });

      const preview = wrapper.get("[data-testid='command-preview']");
      expect(preview.text()).toContain("echo --json hello");
      expect(preview.text()).not.toContain("stale preview");
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

    it("取消按钮只触发 cancel emit，不再直接操作 navStack", async () => {
      const navStack = createNavStackMock();
      const wrapper = mount(LauncherCommandPanel, {
        props: {
          command: createCommand(),
          mode: "execute",
          isDangerous: false,
          pendingArgValues: {},
          queuedCommandCount: 0,
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
      expect(navStack.popPage).not.toHaveBeenCalled();
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

  describe("可访问性", () => {
    it("为输入与下拉参数生成稳定 id，并让 label for 正确绑定控件", () => {
      const wrapper = mountPanel({
        command: createCommand({
          args: [
            {
              key: "container",
              label: "容器名",
              token: "{{container}}",
              placeholder: "nginx",
              required: true
            },
            {
              key: "tail",
              label: "日志行数",
              token: "{{tail}}",
              argType: "select",
              options: ["50", "100"],
              required: false
            }
          ]
        }),
        pendingArgValues: {
          container: "nginx",
          tail: "50"
        }
      });

      const labels = wrapper.findAll(".command-panel__label");
      const input = wrapper.get(".command-panel__input");
      const select = wrapper.get(".command-panel__select");

      expect(labels[0]?.attributes("for")).toBe(input.attributes("id"));
      expect(labels[1]?.attributes("for")).toBe(select.attributes("id"));
      expect(input.attributes("name")).toBe("container");
      expect(select.attributes("name")).toBe("tail");
    });

    it("通过 aria-describedby 挂接必填提示与高危说明", () => {
      const wrapper = mountPanel({
        command: createCommand({ dangerous: true }),
        isDangerous: true,
        pendingArgValues: { value: "prod" }
      });

      const input = wrapper.get(".command-panel__input");
      const describedBy = (input.attributes("aria-describedby") ?? "")
        .split(" ")
        .filter(Boolean);

      expect(describedBy.length).toBeGreaterThanOrEqual(2);

      const requiredHint = wrapper.get(`#${describedBy[0]!}`);
      const dangerHint = wrapper.get(`#${describedBy[1]!}`);

      expect(requiredHint.text()).toContain("不能为空");
      expect(dangerHint.text()).toContain("敏感系统资源");
      expect(input.attributes("aria-required")).toBe("true");
    });

    it("参数无效时挂接字段错误并禁用确认按钮", async () => {
      const wrapper = mountPanel({
        command: createValidatedNumberCommand(),
        pendingArgValues: { port: "70000" }
      });

      const input = wrapper.get(".command-panel__input");
      const confirmBtn = wrapper.get("[data-testid='confirm-btn']");

      expect(input.attributes("aria-invalid")).toBe("true");
      expect(wrapper.get(".command-panel__field-error").text()).toContain("不能大于 65535");
      expect(confirmBtn.attributes("disabled")).toBeDefined();

      await confirmBtn.trigger("click");
      expect(wrapper.emitted("submit")).toBeUndefined();
    });
  });
});
