import { nextTick, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { CommandTemplate } from "../../../features/commands/commandTemplates";
import type { StagedCommand } from "../../../features/launcher/types";
import { useCommandExecution } from "../../execution/useCommandExecution";
import type { FocusZone } from "../../launcher/useStagingQueue";

interface Harness {
  stagedCommands: { value: StagedCommand[] };
  focusZone: { value: FocusZone };
  stagingActiveIndex: { value: number };
  openStagingDrawer: ReturnType<typeof vi.fn>;
  ensureActiveStagingVisible: ReturnType<typeof vi.fn>;
  clearSearchQueryAndSelection: ReturnType<typeof vi.fn>;
  triggerStagedFeedback: ReturnType<typeof vi.fn>;
  scheduleSearchInputFocus: ReturnType<typeof vi.fn>;
  runCommandInTerminal: ReturnType<typeof vi.fn>;
  runCommandsInTerminal: ReturnType<typeof vi.fn>;
  execution: ReturnType<typeof useCommandExecution>;
}

function createNoArgCommand(): CommandTemplate {
  return {
    id: "list-dir",
    title: "列目录",
    description: "测试命令",
    preview: "ls -la",
    folder: "@_sys",
    category: "system",
    needsArgs: false
  };
}

function createArgCommand(): CommandTemplate {
  return {
    id: "open-port",
    title: "开放端口",
    description: "带参数测试命令",
    preview: "sudo ufw allow {{value}}/tcp",
    folder: "@_sys",
    category: "network",
    needsArgs: true,
    argLabel: "端口",
    argPlaceholder: "3000",
    argToken: "{{value}}"
  };
}

function createHarness(useBatchRunner = false): Harness {
  const stagedCommands = ref<StagedCommand[]>([]);
  const focusZone = ref<FocusZone>("search");
  const stagingActiveIndex = ref(0);
  const openStagingDrawer = vi.fn();
  const ensureActiveStagingVisible = vi.fn();
  const clearSearchQueryAndSelection = vi.fn();
  const triggerStagedFeedback = vi.fn();
  const scheduleSearchInputFocus = vi.fn();
  const runCommandInTerminal = vi.fn(async () => {});
  const runCommandsInTerminal = vi.fn(async () => {});

  const execution = useCommandExecution({
    stagedCommands,
    focusZone,
    stagingActiveIndex,
    openStagingDrawer,
    ensureActiveStagingVisible,
    clearSearchQueryAndSelection,
    triggerStagedFeedback,
    scheduleSearchInputFocus,
    runCommandInTerminal,
    runCommandsInTerminal: useBatchRunner ? runCommandsInTerminal : undefined
  });

  return {
    stagedCommands,
    focusZone,
    stagingActiveIndex,
    openStagingDrawer,
    ensureActiveStagingVisible,
    clearSearchQueryAndSelection,
    triggerStagedFeedback,
    scheduleSearchInputFocus,
    runCommandInTerminal,
    runCommandsInTerminal,
    execution
  };
}

describe("useCommandExecution", () => {
  it("stages no-arg command and triggers queue side effects", () => {
    const harness = createHarness();
    const command = createNoArgCommand();

    harness.execution.stageResult(command);

    expect(harness.stagedCommands.value).toHaveLength(1);
    expect(harness.stagedCommands.value[0]?.renderedCommand).toBe("ls -la");
    expect(harness.openStagingDrawer).not.toHaveBeenCalled();
    expect(harness.clearSearchQueryAndSelection).not.toHaveBeenCalled();
    expect(harness.scheduleSearchInputFocus).toHaveBeenCalledWith(true);
    expect(harness.triggerStagedFeedback).toHaveBeenCalledWith("list-dir");
  });

  it("opens param input when staging command requires args", () => {
    const harness = createHarness();
    const command = createArgCommand();

    harness.execution.stageResult(command);

    expect(harness.execution.pendingCommand.value?.id).toBe(command.id);
    expect(harness.execution.pendingSubmitMode.value).toBe("stage");
    expect(harness.execution.pendingArgValues.value.value).toBe("3000");
  });

  it("rejects pending submit when required argument is blank", () => {
    const harness = createHarness();
    const command: CommandTemplate = {
      ...createArgCommand(),
      argPlaceholder: undefined
    };

    harness.execution.executeResult(command);
    harness.execution.updatePendingArgValue("value", "   ");
    harness.execution.submitParamInput();

    expect(harness.execution.pendingCommand.value?.id).toBe(command.id);
    expect(harness.runCommandInTerminal).not.toHaveBeenCalled();
    expect(harness.execution.executionFeedbackTone.value).toBe("error");
    expect(harness.execution.executionFeedbackMessage.value).toContain("不能为空");
    expect(harness.execution.executionFeedbackMessage.value).toContain("下一步");
  });

  it("executes command from pending execute mode", async () => {
    const harness = createHarness();
    const command = createArgCommand();

    harness.execution.executeResult(command);
    harness.execution.updatePendingArgValue("value", "8088");
    harness.execution.submitParamInput();
    await nextTick();

    expect(harness.execution.pendingCommand.value).toBeNull();
    expect(harness.runCommandInTerminal).toHaveBeenCalledWith("sudo ufw allow 8088/tcp");
    expect(harness.scheduleSearchInputFocus).toHaveBeenCalledWith(true);
    expect(harness.execution.executionFeedbackTone.value).toBe("success");
    expect(harness.execution.executionFeedbackMessage.value).toContain("终端");
  });

  it("keeps param input open when pending execute requires safety confirmation and restores param on cancel", async () => {
    const harness = createHarness();
    const command: CommandTemplate = {
      ...createArgCommand(),
      dangerous: true
    };

    harness.execution.executeResult(command);
    harness.execution.updatePendingArgValue("value", "8088");
    harness.execution.submitParamInput();
    await nextTick();

    expect(harness.execution.safetyDialog.value?.mode).toBe("single");
    expect(harness.runCommandInTerminal).not.toHaveBeenCalled();
    expect(harness.execution.pendingCommand.value?.id).toBe(command.id);
    expect(harness.execution.pendingArgValues.value.value).toBe("8088");

    harness.execution.cancelSafetyExecution();
    expect(harness.execution.safetyDialog.value).toBeNull();
    expect(harness.execution.pendingCommand.value?.id).toBe(command.id);
    expect(harness.execution.pendingArgValues.value.value).toBe("8088");
  });

  it("trims boundary arg input before single execution and keeps success feedback", async () => {
    const harness = createHarness();
    const command = createArgCommand();

    harness.execution.executeResult(command);
    harness.execution.updatePendingArgValue("value", "  8088  ");
    harness.execution.submitParamInput();
    await nextTick();

    expect(harness.runCommandInTerminal).toHaveBeenCalledWith("sudo ufw allow 8088/tcp");
    expect(harness.execution.executionFeedbackTone.value).toBe("success");
    expect(harness.execution.executionFeedbackMessage.value).toContain("终端");
  });

  it("auto dismisses execution feedback after 3 seconds", async () => {
    vi.useFakeTimers();
    const harness = createHarness();
    const command = createNoArgCommand();

    harness.execution.executeResult(command);
    await nextTick();
    expect(harness.execution.executionFeedbackMessage.value).toContain("终端");
    expect(harness.execution.executionFeedbackTone.value).toBe("success");

    await vi.advanceTimersByTimeAsync(3000);
    expect(harness.execution.executionFeedbackMessage.value).toBe("");
    expect(harness.execution.executionFeedbackTone.value).toBe("neutral");
    vi.useRealTimers();
  });

  it("sets error feedback when single command execution fails", async () => {
    const harness = createHarness();
    const command = createNoArgCommand();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    harness.runCommandInTerminal.mockRejectedValueOnce(new Error("mock-run-failed"));

    harness.execution.executeResult(command);
    await nextTick();

    expect(harness.execution.executionFeedbackTone.value).toBe("error");
    expect(harness.execution.executionFeedbackMessage.value).toContain("mock-run-failed");
    expect(harness.execution.executionFeedbackMessage.value).toContain("下一步");
    errorSpy.mockRestore();
  });

  it("maps terminal unavailable failure to actionable next step", async () => {
    const harness = createHarness();
    const command = createNoArgCommand();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    harness.runCommandInTerminal.mockRejectedValueOnce(new Error("ENOENT: terminal not found"));

    harness.execution.executeResult(command);
    await nextTick();

    expect(harness.execution.executionFeedbackTone.value).toBe("error");
    expect(harness.execution.executionFeedbackMessage.value).toContain("ENOENT");
    expect(harness.execution.executionFeedbackMessage.value).toContain("检查并切换可用终端");
    errorSpy.mockRestore();
  });

  it("updates staged argument and rendered command", () => {
    const harness = createHarness();
    const command = createArgCommand();

    harness.execution.stageResult(command);
    harness.execution.updatePendingArgValue("value", "3000");
    harness.execution.submitParamInput();
    const stagedId = harness.stagedCommands.value[0]?.id;
    expect(stagedId).toBeTruthy();

    harness.execution.updateStagedArg(stagedId!, "value", "9527");

    expect(harness.stagedCommands.value[0]?.argValues.value).toBe("9527");
    expect(harness.stagedCommands.value[0]?.renderedCommand).toBe("sudo ufw allow 9527/tcp");
  });

  it("blocks queue execution when param/safety flow is open (shows toast, does not run terminal)", async () => {
    const harness = createHarness(true);
    harness.execution.stageResult(createNoArgCommand());
    harness.execution.executeResult(createArgCommand());

    harness.scheduleSearchInputFocus.mockClear();
    await harness.execution.executeStaged();

    expect(harness.runCommandsInTerminal).not.toHaveBeenCalled();
    expect(harness.runCommandInTerminal).not.toHaveBeenCalled();
    expect(harness.stagedCommands.value).toHaveLength(1);
    expect(harness.execution.executionFeedbackTone.value).toBe("neutral");
    expect(harness.execution.executionFeedbackMessage.value).toContain("完成或取消当前流程");
    expect(harness.scheduleSearchInputFocus).not.toHaveBeenCalled();
  });

  it("executes staged queue and clears snapshot", async () => {
    const harness = createHarness();
    const first = createNoArgCommand();
    const second = {
      ...createNoArgCommand(),
      id: "git-prune",
      preview: "git gc --prune=now"
    };

    harness.execution.stageResult(first);
    harness.execution.stageResult(second);
    harness.scheduleSearchInputFocus.mockClear();
    await harness.execution.executeStaged();

    expect(harness.runCommandInTerminal).toHaveBeenNthCalledWith(1, "ls -la");
    expect(harness.runCommandInTerminal).toHaveBeenNthCalledWith(2, "git gc --prune=now");
    expect(harness.stagedCommands.value).toHaveLength(0);
    expect(harness.scheduleSearchInputFocus).toHaveBeenCalledWith(true);
    expect(harness.execution.executionFeedbackTone.value).toBe("success");
    expect(harness.execution.executionFeedbackMessage.value).toContain("2 个节点");
    expect(harness.execution.executionFeedbackMessage.value).toContain("首个：ls -la");
  });

  it("executes staged queue in one terminal call when batch runner is provided", async () => {
    const harness = createHarness(true);
    const first = createNoArgCommand();
    const second = {
      ...createNoArgCommand(),
      id: "git-prune",
      preview: "git gc --prune=now"
    };

    harness.execution.stageResult(first);
    harness.execution.stageResult(second);
    await harness.execution.executeStaged();

    expect(harness.runCommandsInTerminal).toHaveBeenCalledTimes(1);
    expect(harness.runCommandsInTerminal).toHaveBeenCalledWith(["ls -la", "git gc --prune=now"]);
    expect(harness.runCommandInTerminal).not.toHaveBeenCalled();
    expect(harness.execution.executionFeedbackMessage.value).toContain("首个：ls -la");
  });

  it("blocks queue execution on injection hit, keeps queue, and does not call terminal runners", async () => {
    const harness = createHarness(true);
    const command = createArgCommand();

    harness.execution.stageResult(command);
    harness.execution.updatePendingArgValue("value", " 8080; whoami ");
    harness.execution.submitParamInput();
    await harness.execution.executeStaged();

    expect(harness.runCommandsInTerminal).not.toHaveBeenCalled();
    expect(harness.runCommandInTerminal).not.toHaveBeenCalled();
    expect(harness.stagedCommands.value).toHaveLength(1);
    expect(harness.execution.executionFeedbackTone.value).toBe("error");
    expect(harness.execution.executionFeedbackMessage.value).toContain("执行已拦截");
    expect(harness.execution.executionFeedbackMessage.value).toContain("下一步");
  });

  it("removes staged command and clamps active index", () => {
    const harness = createHarness();
    harness.stagedCommands.value = [
      {
        id: "a",
        title: "A",
        rawPreview: "echo a",
        renderedCommand: "echo a",
        args: [],
        argValues: {}
      },
      {
        id: "b",
        title: "B",
        rawPreview: "echo b",
        renderedCommand: "echo b",
        args: [],
        argValues: {}
      }
    ];
    harness.stagingActiveIndex.value = 1;

    harness.execution.removeStagedCommand("b");

    expect(harness.stagedCommands.value.map((item) => item.id)).toEqual(["a"]);
    expect(harness.stagingActiveIndex.value).toBe(0);
  });

  it("blocks execution when argument contains injection tokens", async () => {
    const harness = createHarness();
    const command = createArgCommand();

    harness.execution.executeResult(command);
    harness.execution.updatePendingArgValue("value", "8080; rm -rf /");
    harness.execution.submitParamInput();
    await nextTick();

    expect(harness.runCommandInTerminal).not.toHaveBeenCalled();
    expect(harness.execution.executionFeedbackTone.value).toBe("error");
    expect(harness.execution.executionFeedbackMessage.value).toContain("执行已拦截");
    expect(harness.execution.executionFeedbackMessage.value).toContain("下一步");
  });

  it("requires safety confirmation for dangerous single command", async () => {
    const harness = createHarness();
    const command: CommandTemplate = {
      ...createNoArgCommand(),
      dangerous: true
    };

    harness.execution.executeResult(command);
    await nextTick();

    expect(harness.execution.safetyDialog.value?.mode).toBe("single");
    expect(harness.runCommandInTerminal).not.toHaveBeenCalled();

    await harness.execution.confirmSafetyExecution();
    expect(harness.runCommandInTerminal).toHaveBeenCalledWith("ls -la");
  });

  it("requires safety confirmation for dangerous queue before execution", async () => {
    const harness = createHarness(true);
    const risky: CommandTemplate = {
      ...createNoArgCommand(),
      id: "kill-task",
      preview: "taskkill /F /PID 1234",
      dangerous: true
    };

    harness.execution.stageResult(risky);
    await harness.execution.executeStaged();

    expect(harness.execution.safetyDialog.value?.mode).toBe("queue");
    expect(harness.runCommandsInTerminal).not.toHaveBeenCalled();

    await harness.execution.confirmSafetyExecution();
    expect(harness.runCommandsInTerminal).toHaveBeenCalledWith(["taskkill /F /PID 1234"]);
  });
});
