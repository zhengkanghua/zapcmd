import { describe, it, expect } from "vitest";
import type { CommandTemplate } from "../../../features/commands/commandTemplates";
import { useLauncherNavStack } from "../../launcher/useLauncherNavStack";

describe("useLauncherNavStack", () => {
  it("初始状态为 search 页面", () => {
    const { currentPage, canGoBack, stack } = useLauncherNavStack();
    expect(currentPage.value.type).toBe("search");
    expect(canGoBack.value).toBe(false);
    expect(stack.value).toHaveLength(1);
  });

  it("pushPage 推入新页面", () => {
    const { currentPage, canGoBack, pushPage } = useLauncherNavStack();
    pushPage({ type: "command-action", props: { panel: "params", intent: "execute" } });
    expect(currentPage.value.type).toBe("command-action");
    expect(currentPage.value.props?.panel).toBe("params");
    expect(currentPage.value.props?.intent).toBe("execute");
    expect(canGoBack.value).toBe(true);
  });

  it("popPage 弹出栈顶回到搜索", () => {
    const { currentPage, canGoBack, pushPage, popPage } = useLauncherNavStack();
    pushPage({ type: "command-action" });
    popPage();
    expect(currentPage.value.type).toBe("search");
    expect(canGoBack.value).toBe(false);
  });

  it("popPage 在栈底时为空操作", () => {
    const { currentPage, popPage } = useLauncherNavStack();
    popPage(); // 不应抛错
    expect(currentPage.value.type).toBe("search");
  });

  it("resetToSearch 清空栈回到搜索首页", () => {
    const { currentPage, stack, pushPage, resetToSearch } = useLauncherNavStack();
    pushPage({ type: "command-action" });
    pushPage({ type: "command-action" });
    resetToSearch();
    expect(currentPage.value.type).toBe("search");
    expect(stack.value).toHaveLength(1);
  });

  it("重复 pushPage 同类型页面不崩溃", () => {
    const { stack, pushPage } = useLauncherNavStack();
    pushPage({ type: "command-action" });
    pushPage({ type: "command-action" });
    expect(stack.value).toHaveLength(3);
  });

  it("replaceTopPage 只替换栈顶，不增加栈深", () => {
    const command: CommandTemplate = {
      id: "copy-cmd",
      title: "copy",
      description: "",
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
    const { stack, currentPage, pushPage, replaceTopPage } = useLauncherNavStack();
    pushPage({ type: "command-action", props: { panel: "actions", command } });

    replaceTopPage({
      type: "command-action",
      props: { panel: "params", command, intent: "copy" }
    });

    expect(stack.value).toHaveLength(2);
    expect(currentPage.value.props?.panel).toBe("params");
    expect(currentPage.value.props?.intent).toBe("copy");
  });
});
