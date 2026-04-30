import { nextTick, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommandTemplate } from "../../../features/commands/commandTemplates";
import type {
  CommandPrerequisite,
  CommandPrerequisiteProbeResult
} from "../../../features/commands/prerequisiteTypes";
import type { StagedCommand } from "../../../features/launcher/types";
import {
  DANGER_DISMISS_STORAGE_KEY,
  dismissDanger
} from "../../../features/security/dangerDismiss";
import { CommandExecutionError } from "../../../services/commandExecutor";
import { useCommandExecution } from "../../execution/useCommandExecution";
import type { FocusZone } from "../../launcher/useCommandQueue";

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
  runCommandPreflight: ReturnType<typeof vi.fn>;
  copyTextToClipboard: ReturnType<typeof vi.fn>;
  resolveCommandTitle: ReturnType<typeof vi.fn>;
  onNeedPanel: ReturnType<typeof vi.fn>;
  execution: ReturnType<typeof useCommandExecution>;
}

function createNoArgCommand(): CommandTemplate {
  return {
    id: "list-dir",
    title: "列目录",
    description: "测试命令",
    preview: "ls -la",
    execution: {
      kind: "exec",
      program: "ls",
      args: ["-la"]
    },
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
    execution: {
      kind: "exec",
      program: "sudo",
      args: ["ufw", "allow", "{{value}}/tcp"]
    },
    folder: "@_sys",
    category: "network",
    needsArgs: true,
    argLabel: "端口",
    argPlaceholder: "3000",
    argToken: "{{value}}"
  };
}

function createValidatedArgCommand(): CommandTemplate {
  return {
    id: "open-port-validated",
    title: "开放端口",
    description: "带校验的参数测试命令",
    preview: "sudo ufw allow {{port}}/tcp",
    execution: {
      kind: "exec",
      program: "sudo",
      args: ["ufw", "allow", "{{port}}/tcp"]
    },
    folder: "@_sys",
    category: "network",
    needsArgs: true,
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
  };
}

function createProblemCommand(): CommandTemplate {
  return {
    ...createArgCommand(),
    id: "broken-command",
    title: "问题命令",
    blockingIssue: {
      code: "invalid-arg-pattern",
      message: "命令配置有问题，暂时不可用。",
      detail: "参数 value 的校验正则无效。"
    }
  };
}

function createAdminCommand(): CommandTemplate {
  return {
    ...createNoArgCommand(),
    id: "flush-dns",
    title: "刷新 DNS",
    preview: "ipconfig /flushdns",
    execution: {
      kind: "exec",
      program: "ipconfig",
      args: ["/flushdns"]
    },
    adminRequired: true
  };
}

function createGitPruneCommand(): CommandTemplate {
  return {
    ...createNoArgCommand(),
    id: "git-prune",
    title: "Git Prune",
    preview: "git gc --prune=now",
    execution: {
      kind: "exec",
      program: "git",
      args: ["gc", "--prune=now"]
    }
  };
}

function createKillTaskCommand(): CommandTemplate {
  return {
    ...createNoArgCommand(),
    id: "kill-task",
    preview: "taskkill /F /PID 1234",
    execution: {
      kind: "exec",
      program: "taskkill",
      args: ["/F", "/PID", "1234"]
    },
    dangerous: true
  };
}

function createSqliteQueryCommand(): CommandTemplate {
  return {
    id: "sqlite-query",
    title: "SQLite Query",
    description: "执行 SQL",
    preview: 'sqlite3 "{{file}}"',
    execution: {
      kind: "exec",
      program: "sqlite3",
      args: ['"{{file}}"'],
      stdinArgKey: "sql"
    },
    folder: "@_sqlite",
    category: "sqlite",
    needsArgs: true,
    args: [
      {
        key: "file",
        label: "数据库文件",
        token: "{{file}}",
        placeholder: "app.db",
        required: true,
        argType: "path"
      },
      {
        key: "sql",
        label: "SQL",
        token: "{{sql}}",
        placeholder: "select 1;",
        required: true,
        argType: "text"
      }
    ]
  };
}

function createPrerequisiteCommand(
  overrides: Partial<CommandTemplate> = {},
  prerequisites: CommandPrerequisite[] = [
    { id: "docker", type: "binary", required: true, check: "docker" }
  ]
): CommandTemplate {
  return {
    ...createNoArgCommand(),
    id: "docker-ps",
    title: "Docker PS",
    preview: "docker ps",
    execution: {
      kind: "exec",
      program: "docker",
      args: ["ps"]
    },
    prerequisites,
    ...overrides
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
  const runCommandPreflight = vi.fn(
    async () => [] as CommandPrerequisiteProbeResult[]
  );
  const copyTextToClipboard = vi.fn(async () => {});
  const resolveCommandTitle = vi.fn((commandId: string) =>
    commandId === "install-docker" ? "安装 Docker" : null
  );
  const onNeedPanel = vi.fn();

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
    runCommandsInTerminal: useBatchRunner ? runCommandsInTerminal : undefined,
    runCommandPreflight,
    copyTextToClipboard,
    resolveCommandTitle,
    onNeedPanel
  } as Parameters<typeof useCommandExecution>[0]);

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
    runCommandPreflight,
    copyTextToClipboard,
    resolveCommandTitle,
    onNeedPanel,
    execution
  };
}

async function flushExecution(): Promise<void> {
  await Promise.resolve();
  await nextTick();
  await nextTick();
}

function createExecStep(
  summary: string,
  program: string,
  args: string[],
  options: { stdinArgKey?: string; stdin?: string } = {}
) {
  return {
    summary,
    execution: {
      kind: "exec" as const,
      program,
      args,
      stdinArgKey: options.stdinArgKey,
      stdin: options.stdin
    }
  };
}

describe("useCommandExecution", () => {
  beforeEach(() => {
    localStorage.removeItem(DANGER_DISMISS_STORAGE_KEY);
  });

  it("keeps pendingSubmitMode as an alias of pendingSubmitIntent", () => {
    const harness = createHarness();

    expect(harness.execution.pendingSubmitMode).toBe(harness.execution.pendingSubmitIntent);
  });

  it("keeps queue refresh APIs after internal extraction", () => {
    const harness = createHarness();

    expect(typeof harness.execution.refreshQueuedCommandPreflight).toBe("function");
    expect(typeof harness.execution.refreshAllQueuedPreflight).toBe("function");
  });

  it("stages no-arg command and triggers queue side effects", () => {
    const harness = createHarness();
    const command = createNoArgCommand();

    harness.execution.stageResult(command);

    expect(harness.stagedCommands.value).toHaveLength(1);
    expect(harness.stagedCommands.value[0]?.renderedPreview).toBe("ls -la");
    expect(harness.stagedCommands.value[0]?.execution).toEqual({
      kind: "exec",
      program: "ls",
      args: ["-la"]
    });
    expect(harness.openStagingDrawer).not.toHaveBeenCalled();
    expect(harness.clearSearchQueryAndSelection).not.toHaveBeenCalled();
    expect(harness.scheduleSearchInputFocus).toHaveBeenCalledWith(true);
    expect(harness.triggerStagedFeedback).toHaveBeenCalledWith("list-dir");
  });

  it("can remove one duplicated queued command without deleting the other entry", () => {
    const harness = createHarness();
    const command = createNoArgCommand();
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1745740800000);

    try {
      harness.execution.stageResult(command);
      harness.execution.stageResult(command);

      expect(harness.stagedCommands.value).toHaveLength(2);
      const firstId = harness.stagedCommands.value[0]?.id;
      const secondId = harness.stagedCommands.value[1]?.id;

      expect(firstId).toBeTruthy();
      expect(secondId).toBeTruthy();
      expect(firstId).not.toBe(secondId);

      harness.execution.removeStagedCommand(firstId!);

      expect(harness.stagedCommands.value).toHaveLength(1);
      expect(harness.stagedCommands.value[0]?.id).toBe(secondId);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("stages stdin-based exec with decoupled preview and execution payload", () => {
    const harness = createHarness();

    harness.execution.stageResult(createSqliteQueryCommand());
    harness.execution.updatePendingArgValue("file", "data.db");
    harness.execution.updatePendingArgValue("sql", "select 1;");
    harness.execution.submitParamInput();

    expect(harness.stagedCommands.value).toHaveLength(1);
    expect(harness.stagedCommands.value[0]?.renderedPreview).toContain("sqlite3");
    expect(harness.stagedCommands.value[0]?.execution).toEqual({
      kind: "exec",
      program: "sqlite3",
      args: ["data.db"],
      stdinArgKey: "sql",
      stdin: "select 1;"
    });
  });

  it("opens param input when staging command requires args", () => {
    const harness = createHarness();
    const command = createArgCommand();

    harness.execution.stageResult(command);

    expect(harness.execution.pendingCommand.value?.id).toBe(command.id);
    expect(harness.execution.pendingSubmitMode.value).toBe("stage");
    expect(harness.execution.pendingArgValues.value.value).toBe("3000");
    expect(harness.onNeedPanel).toHaveBeenCalledWith(command, "stage");
  });

  it("stages prerequisite command with cached preflight issues and total feedback", async () => {
    const harness = createHarness();
    const command = createPrerequisiteCommand(
      {},
      [
        {
          id: "docker",
          type: "binary",
          required: true,
          check: "docker",
          displayName: "Docker Desktop",
          resolutionHint: "安装 Docker Desktop 后重试"
        }
      ]
    );
    harness.runCommandPreflight.mockResolvedValueOnce([
      {
        id: "docker",
        ok: false,
        code: "missing-binary",
        required: true,
        message: "docker not found"
      }
    ]);

    harness.execution.stageResult(command);
    await flushExecution();

    expect(harness.stagedCommands.value).toHaveLength(1);
    expect(harness.stagedCommands.value[0]?.preflightCache?.issueCount).toBe(1);
    expect(harness.stagedCommands.value[0]?.preflightCache?.issues).toEqual(["未检测到 Docker Desktop。"]);
    expect(harness.execution.executionFeedbackMessage.value).toContain("1 条命令存在环境提示");
  });

  it("uses the matching prerequisite metadata when a later queued prerequisite fails", async () => {
    const harness = createHarness();
    const command = createPrerequisiteCommand(
      {},
      [
        {
          id: "docker",
          type: "binary",
          required: true,
          check: "docker",
          displayName: "Docker Desktop",
          resolutionHint: "安装 Docker Desktop 后重试"
        },
        {
          id: "github-token",
          type: "env",
          required: true,
          check: "env:GITHUB_TOKEN",
          displayName: "GitHub Token",
          resolutionHint: "设置 GITHUB_TOKEN 后重试"
        }
      ]
    );
    harness.runCommandPreflight.mockResolvedValueOnce([
      {
        id: "docker",
        ok: true,
        code: "ok",
        message: "",
        required: true
      },
      {
        id: "github-token",
        ok: false,
        code: "missing-env",
        message: "required environment variable not found: GITHUB_TOKEN",
        required: true
      }
    ]);

    harness.execution.stageResult(command);
    await flushExecution();

    expect(harness.stagedCommands.value).toHaveLength(1);
    expect(harness.stagedCommands.value[0]?.preflightCache?.issues).toEqual([
      "缺少 GitHub Token（环境变量 GITHUB_TOKEN）。"
    ]);
    expect(harness.stagedCommands.value[0]?.preflightCache?.issues).not.toContain(
      "未检测到 Docker Desktop。"
    );
  });

  it("rejects pending submit when required argument is blank", () => {
    const harness = createHarness();
    const command: CommandTemplate = {
      ...createArgCommand(),
      argPlaceholder: undefined
    };

    harness.execution.executeResult(command);
    harness.execution.updatePendingArgValue("value", "   ");
    const submitted = harness.execution.submitParamInput();

    expect(submitted).toBe(false);
    expect(harness.execution.pendingCommand.value?.id).toBe(command.id);
    expect(harness.runCommandInTerminal).not.toHaveBeenCalled();
    expect(harness.execution.executionFeedbackTone.value).toBe("error");
    expect(harness.execution.executionFeedbackMessage.value).toContain("不能为空");
    expect(harness.execution.executionFeedbackMessage.value).toContain("下一步");
  });

  it("blocks staged submit when argument violates validation rule", () => {
    const harness = createHarness();
    const command = createValidatedArgCommand();

    harness.execution.stageResult(command);
    harness.execution.updatePendingArgValue("port", "70000");
    const submitted = harness.execution.submitParamInput();

    expect(submitted).toBe(false);
    expect(harness.execution.pendingCommand.value?.id).toBe(command.id);
    expect(harness.stagedCommands.value).toHaveLength(0);
    expect(harness.runCommandInTerminal).not.toHaveBeenCalled();
    expect(harness.execution.executionFeedbackTone.value).toBe("error");
    expect(harness.execution.executionFeedbackMessage.value).toContain("不能大于 65535");
    expect(harness.execution.executionFeedbackMessage.value).toContain("检查必填参数与输入格式后重试");
    expect(harness.execution.executionFeedbackMessage.value).not.toContain("移除高风险或注入片段后重试");
  });

  it("blocks problem command before opening execute flow", async () => {
    const harness = createHarness();

    harness.execution.executeResult(createProblemCommand());
    await flushExecution();

    expect(harness.execution.pendingCommand.value).toBeNull();
    expect(harness.runCommandInTerminal).not.toHaveBeenCalled();
    expect(harness.execution.executionFeedbackTone.value).toBe("error");
    expect(harness.execution.executionFeedbackMessage.value).toContain("命令配置有问题");
  });

  it("blocks problem command before joining the queue", async () => {
    const harness = createHarness();

    harness.execution.stageResult(createProblemCommand());
    await flushExecution();

    expect(harness.stagedCommands.value).toHaveLength(0);
    expect(harness.execution.pendingCommand.value).toBeNull();
    expect(harness.execution.executionFeedbackTone.value).toBe("error");
    expect(harness.execution.executionFeedbackMessage.value).toContain("命令配置有问题");
  });

  it("executes command from pending execute mode", async () => {
    const harness = createHarness();
    const command = createArgCommand();

    harness.execution.executeResult(command);
    harness.execution.updatePendingArgValue("value", "8088");
    const submitted = harness.execution.submitParamInput();
    await flushExecution();

    expect(submitted).toBe(true);
    expect(harness.execution.pendingCommand.value).toBeNull();
    expect(harness.runCommandInTerminal).toHaveBeenCalledWith(
      createExecStep("sudo ufw allow 8088/tcp", "sudo", ["ufw", "allow", "8088/tcp"]),
      {
        requiresElevation: false
      }
    );
    expect(harness.scheduleSearchInputFocus).toHaveBeenCalledWith(true);
    expect(harness.execution.executionFeedbackTone.value).toBe("success");
    expect(harness.execution.executionFeedbackMessage.value).toContain("终端");
  });

  it("copies no-arg command directly without opening panel or terminal", async () => {
    const command = createNoArgCommand();
    const harness = createHarness();

    await harness.execution.dispatchCommandIntent(command, "copy");

    expect(harness.copyTextToClipboard).toHaveBeenCalledWith("ls -la");
    expect(harness.runCommandInTerminal).not.toHaveBeenCalled();
    expect(harness.onNeedPanel).not.toHaveBeenCalled();
  });

  it("opens param panel with copy intent when command requires args", () => {
    const command = createArgCommand();
    const harness = createHarness();

    harness.execution.dispatchCommandIntent(command, "copy");

    expect(harness.execution.pendingSubmitIntent.value).toBe("copy");
    expect(harness.onNeedPanel).toHaveBeenCalledWith(command, "copy");
  });

  it("does not request safety confirmation when dangerous command is copied", async () => {
    const command = createKillTaskCommand();
    const harness = createHarness();

    await harness.execution.dispatchCommandIntent(command, "copy");

    expect(harness.execution.safetyDialog.value).toBeNull();
    expect(harness.copyTextToClipboard).toHaveBeenCalledTimes(1);
  });

  it("blocks copy intent for problem command", async () => {
    const harness = createHarness();

    await harness.execution.dispatchCommandIntent(createProblemCommand(), "copy");

    expect(harness.copyTextToClipboard).not.toHaveBeenCalled();
    expect(harness.execution.executionFeedbackTone.value).toBe("error");
    expect(harness.execution.executionFeedbackMessage.value).toContain("命令配置有问题");
  });

  it("staged submit writes preflight cache for param commands", async () => {
    const harness = createHarness();
    const command: CommandTemplate = {
      ...createArgCommand(),
      id: "docker-port",
      title: "Docker Port",
      preview: "docker port {{value}}",
      execution: {
        kind: "exec",
        program: "docker",
        args: ["port", "{{value}}"]
      },
      prerequisites: [
        {
          id: "docker",
          type: "binary",
          required: true,
          check: "docker",
          displayName: "Docker Desktop",
          resolutionHint: "安装 Docker Desktop 后重试"
        }
      ]
    };
    harness.runCommandPreflight.mockResolvedValueOnce([
      {
        id: "docker",
        ok: false,
        code: "missing-binary",
        required: true,
        message: "docker not found"
      }
    ]);

    harness.execution.stageResult(command);
    harness.execution.updatePendingArgValue("value", "8088");
    const submitted = harness.execution.submitParamInput();
    await flushExecution();

    expect(submitted).toBe(true);
    expect(harness.stagedCommands.value).toHaveLength(1);
    expect(harness.stagedCommands.value[0]?.preflightCache?.issues).toEqual(["未检测到 Docker Desktop。"]);
    expect(harness.execution.executionFeedbackMessage.value).toContain("1 条命令存在环境提示");
  });

  it("passes requiresElevation=true for adminRequired single command", async () => {
    const harness = createHarness();
    const command = createAdminCommand();

    harness.execution.executeResult(command);
    await nextTick();

    expect(harness.execution.safetyDialog.value?.mode).toBe("single");
    await harness.execution.confirmSafetyExecution();
    expect(harness.runCommandInTerminal).toHaveBeenCalledWith(
      createExecStep("ipconfig /flushdns", "ipconfig", ["/flushdns"]),
      {
        requiresElevation: true
      }
    );
  });

  it("blocks single execution when required prerequisite fails", async () => {
    const harness = createHarness();
    const command = createPrerequisiteCommand(
      {},
      [
        {
          id: "docker",
          type: "binary",
          required: true,
          check: "docker",
          displayName: "Docker Desktop",
          resolutionHint: "安装 Docker Desktop 后重试",
          fallbackCommandId: "install-docker"
        }
      ]
    );
    harness.runCommandPreflight.mockResolvedValueOnce([
      {
        id: "docker",
        ok: false,
        code: "missing-binary",
        required: true,
        message: "docker not found"
      }
    ]);

    harness.execution.executeResult(command);
    await flushExecution();

    expect(harness.runCommandInTerminal).not.toHaveBeenCalled();
    expect(harness.execution.executionFeedbackTone.value).toBe("error");
    expect(harness.execution.executionFeedbackMessage.value).toContain("无法执行该命令。");
    expect(harness.execution.executionFeedbackMessage.value).toContain("未检测到 Docker Desktop。");
    expect(harness.execution.executionFeedbackMessage.value).toContain("处理建议：安装 Docker Desktop 后重试。");
    expect(harness.execution.executionFeedbackMessage.value).toContain("可改用“安装 Docker”命令。");
  });

  it("blocks single execution with a system-level message when prerequisite probing throws", async () => {
    const harness = createHarness();
    const command = createPrerequisiteCommand(
      {},
      [
        {
          id: "docker",
          type: "binary",
          required: true,
          check: "docker",
          displayName: "Docker Desktop"
        },
        {
          id: "powershell",
          type: "shell",
          required: true,
          check: "shell:powershell",
          displayName: "PowerShell 7"
        }
      ]
    );
    harness.runCommandPreflight.mockRejectedValueOnce(new Error("probe transport failed"));

    harness.execution.executeResult(command);
    await flushExecution();

    expect(harness.runCommandInTerminal).not.toHaveBeenCalled();
    expect(harness.execution.executionFeedbackTone.value).toBe("error");
    expect(harness.execution.executionFeedbackMessage.value).toContain("执行前检查暂时失败");
    expect(harness.execution.executionFeedbackMessage.value).not.toContain("docker / docker");
    expect(harness.execution.executionFeedbackMessage.value).not.toContain("powershell / powershell");
  });

  it("keeps execution but appends warning when optional prerequisite fails", async () => {
    const harness = createHarness();
    const command = createPrerequisiteCommand(
      {},
      [
        {
          id: "docker",
          type: "binary",
          required: false,
          check: "docker",
          displayName: "Docker Desktop",
          resolutionHint: "安装 Docker Desktop 后重试",
          fallbackCommandId: "install-docker"
        }
      ]
    );
    harness.runCommandPreflight.mockResolvedValueOnce([
      {
        id: "docker",
        ok: false,
        code: "missing-binary",
        required: false,
        message: "docker not found"
      }
    ]);

    harness.execution.executeResult(command);
    await flushExecution();

    expect(harness.runCommandInTerminal).toHaveBeenCalledWith(
      createExecStep("docker ps", "docker", ["ps"]),
      {
        requiresElevation: false
      }
    );
    expect(harness.execution.executionFeedbackTone.value).toBe("success");
    expect(harness.execution.executionFeedbackMessage.value).toContain(
      "命令已发送到终端，但有一项可选依赖未满足。"
    );
    expect(harness.execution.executionFeedbackMessage.value).toContain("未检测到 Docker Desktop。");
    expect(harness.execution.executionFeedbackMessage.value).toContain("可改用“安装 Docker”命令。");
  });

  it("opens command panel for dangerous no-arg command and executes on submit (skips safetyDialog)", async () => {
    const harness = createHarness();
    const command: CommandTemplate = {
      ...createNoArgCommand(),
      dangerous: true
    };

    harness.execution.executeResult(command);
    expect(harness.execution.pendingCommand.value?.id).toBe(command.id);
    expect(harness.execution.pendingSubmitMode.value).toBe("execute");
    expect(harness.onNeedPanel).toHaveBeenCalledWith(command, "execute");
    expect(harness.execution.pendingCommand.value?.id).toBe(command.id);
    expect(harness.runCommandInTerminal).not.toHaveBeenCalled();

    harness.execution.submitParamInput();
    await flushExecution();

    expect(harness.execution.safetyDialog.value).toBeNull();
    expect(harness.execution.pendingCommand.value).toBeNull();
    expect(harness.runCommandInTerminal).toHaveBeenCalledWith(
      createExecStep("ls -la", "ls", ["-la"]),
      {
        requiresElevation: false
      }
    );
  });

  it("executes dangerous command from pending execute mode without opening safetyDialog", async () => {
    const harness = createHarness();
    const command: CommandTemplate = {
      ...createArgCommand(),
      dangerous: true
    };

    harness.execution.executeResult(command);
    harness.execution.updatePendingArgValue("value", "8088");
    harness.execution.submitParamInput();
    await flushExecution();

    expect(harness.execution.safetyDialog.value).toBeNull();
    expect(harness.execution.pendingCommand.value).toBeNull();
    expect(harness.runCommandInTerminal).toHaveBeenCalledWith(
      createExecStep("sudo ufw allow 8088/tcp", "sudo", ["ufw", "allow", "8088/tcp"]),
      {
        requiresElevation: false
      }
    );
  });

  it("executes dismissed dangerous command directly without opening panel or safetyDialog", async () => {
    const harness = createHarness();
    const command: CommandTemplate = {
      ...createNoArgCommand(),
      dangerous: true
    };

    dismissDanger(command.id);
    harness.execution.executeResult(command);
    await flushExecution();

    expect(harness.execution.pendingCommand.value).toBeNull();
    expect(harness.execution.safetyDialog.value).toBeNull();
    expect(harness.runCommandInTerminal).toHaveBeenCalledWith(
      createExecStep("ls -la", "ls", ["-la"]),
      {
        requiresElevation: false
      }
    );
  });

  it("trims boundary arg input before single execution and keeps success feedback", async () => {
    const harness = createHarness();
    const command = createArgCommand();

    harness.execution.executeResult(command);
    harness.execution.updatePendingArgValue("value", "  8088  ");
    harness.execution.submitParamInput();
    await flushExecution();

    expect(harness.runCommandInTerminal).toHaveBeenCalledWith(
      createExecStep("sudo ufw allow 8088/tcp", "sudo", ["ufw", "allow", "8088/tcp"]),
      {
        requiresElevation: false
      }
    );
    expect(harness.execution.executionFeedbackTone.value).toBe("success");
    expect(harness.execution.executionFeedbackMessage.value).toContain("终端");
  });

  it("auto dismisses execution feedback after 3 seconds", async () => {
    vi.useFakeTimers();
    const harness = createHarness();
    const command = createNoArgCommand();

    harness.execution.executeResult(command);
    await flushExecution();
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
    await flushExecution();

    expect(harness.execution.executionFeedbackTone.value).toBe("error");
    expect(harness.execution.executionFeedbackMessage.value).toContain("mock-run-failed");
    expect(harness.execution.executionFeedbackMessage.value).toContain("下一步");
    errorSpy.mockRestore();
  });

  it("does not classify terminal-looking plain errors by message content", async () => {
    const harness = createHarness();
    const command = createNoArgCommand();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    harness.runCommandInTerminal.mockRejectedValueOnce(new Error("ENOENT: terminal not found"));

    harness.execution.executeResult(command);
    await flushExecution();

    expect(harness.execution.executionFeedbackTone.value).toBe("error");
    expect(harness.execution.executionFeedbackMessage.value).toContain("ENOENT");
    expect(harness.execution.executionFeedbackMessage.value).toContain("请重试；若仍失败请查看日志并反馈");
    errorSpy.mockRestore();
  });

  it("does not classify plain string errors by message content anymore", async () => {
    const harness = createHarness();
    const command = createNoArgCommand();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    harness.runCommandInTerminal.mockRejectedValueOnce(new Error("ENOENT: terminal not found"));

    harness.execution.executeResult(command);
    await flushExecution();

    expect(harness.execution.executionFeedbackTone.value).toBe("error");
    expect(harness.execution.executionFeedbackMessage.value).toContain("ENOENT");
    expect(harness.execution.executionFeedbackMessage.value).not.toContain("检查并切换可用终端");
    expect(harness.execution.executionFeedbackMessage.value).not.toContain("请检查设置中的终端配置");
    errorSpy.mockRestore();
  });

  it("maps terminal-launch-failed by structured error code", async () => {
    const harness = createHarness();
    const command = createNoArgCommand();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    harness.runCommandInTerminal.mockRejectedValueOnce(
      new CommandExecutionError("terminal-launch-failed", "spawn failed")
    );

    harness.execution.executeResult(command);
    await flushExecution();

    expect(harness.execution.executionFeedbackTone.value).toBe("error");
    expect(harness.execution.executionFeedbackMessage.value).toBe(
      "执行失败：终端启动失败。下一步：请检查设置中的终端配置后重试。"
    );
    errorSpy.mockRestore();
  });

  it("maps invalid-request to actionable invalid request feedback", async () => {
    const harness = createHarness();
    const command = createNoArgCommand();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    harness.runCommandInTerminal.mockRejectedValueOnce(
      new CommandExecutionError("invalid-request", "Unknown terminal id: ghost")
    );

    harness.execution.executeResult(command);
    await flushExecution();

    expect(harness.execution.executionFeedbackTone.value).toBe("error");
    expect(harness.execution.executionFeedbackMessage.value).toBe(
      "执行失败：执行请求无效。下一步：请检查命令参数或终端配置后重试。"
    );
    errorSpy.mockRestore();
  });

  it("maps unsupported platform terminal-launch-failed to platform guidance", async () => {
    const harness = createHarness();
    const command = createNoArgCommand();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    harness.runCommandInTerminal.mockRejectedValueOnce(
      new CommandExecutionError(
        "terminal-launch-failed",
        "Running commands is not supported on this platform."
      )
    );

    harness.execution.executeResult(command);
    await flushExecution();

    expect(harness.execution.executionFeedbackTone.value).toBe("error");
    expect(harness.execution.executionFeedbackMessage.value).toBe(
      "执行失败：当前平台暂不支持执行命令。下一步：请在桌面版 ZapCmd 支持的平台上执行该命令。"
    );
    errorSpy.mockRestore();
  });

  it("maps elevation-cancelled to explicit feedback", async () => {
    const harness = createHarness();
    const command = createAdminCommand();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    harness.runCommandInTerminal.mockRejectedValueOnce(
      new CommandExecutionError("elevation-cancelled", "user cancelled elevation")
    );

    harness.execution.executeResult(command);
    await nextTick();
    await harness.execution.confirmSafetyExecution();

    expect(harness.execution.executionFeedbackTone.value).toBe("error");
    expect(harness.execution.executionFeedbackMessage.value).toBe("已取消管理员授权，本次未执行");
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
    expect(harness.stagedCommands.value[0]?.renderedPreview).toBe("sudo ufw allow 9527/tcp");
  });

  it("freezes queued commands while execution is in flight", async () => {
    const harness = createHarness(true);
    let releaseRun!: () => void;
    const runReleased = new Promise<void>((resolve) => {
      releaseRun = resolve;
    });
    harness.runCommandsInTerminal.mockReturnValueOnce(runReleased);
    const command = createArgCommand();

    harness.execution.stageResult(command);
    harness.execution.updatePendingArgValue("value", "3000");
    harness.execution.submitParamInput();
    await flushExecution();
    const stagedId = harness.stagedCommands.value[0]?.id;
    expect(stagedId).toBeTruthy();

    const pending = harness.execution.executeStaged();
    await flushExecution();
    expect(harness.execution.executing.value).toBe(true);

    harness.execution.updateStagedArg(stagedId!, "value", "9527");
    harness.execution.removeStagedCommand(stagedId!);
    harness.execution.clearStaging();

    expect(harness.stagedCommands.value).toHaveLength(1);
    expect(harness.stagedCommands.value[0]?.argValues.value).toBe("3000");
    expect(harness.stagedCommands.value[0]?.renderedPreview).toBe("sudo ufw allow 3000/tcp");

    releaseRun();
    await pending;
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

  it("dispatches staged queue to terminal and keeps snapshot by default", async () => {
    const harness = createHarness();
    const first = createNoArgCommand();
    const second = createGitPruneCommand();

    harness.execution.stageResult(first);
    harness.execution.stageResult(second);
    harness.scheduleSearchInputFocus.mockClear();
    await harness.execution.executeStaged();

    expect(harness.runCommandInTerminal).toHaveBeenNthCalledWith(
      1,
      createExecStep("ls -la", "ls", ["-la"]),
      {
        requiresElevation: false
      }
    );
    expect(harness.runCommandInTerminal).toHaveBeenNthCalledWith(
      2,
      createExecStep("git gc --prune=now", "git", ["gc", "--prune=now"]),
      {
        requiresElevation: false
      }
    );
    expect(harness.stagedCommands.value).toHaveLength(2);
    expect(harness.scheduleSearchInputFocus).toHaveBeenCalledWith(true);
    expect(harness.execution.executionFeedbackTone.value).toBe("success");
    expect(harness.execution.executionFeedbackMessage.value).toContain("已发送到终端");
    expect(harness.execution.executionFeedbackMessage.value).toContain("首个：ls -la");
  });

  it("executes staged queue in one terminal call when batch runner is provided", async () => {
    const harness = createHarness(true);
    const first = createNoArgCommand();
    const second = createGitPruneCommand();

    harness.execution.stageResult(first);
    harness.execution.stageResult(second);
    await harness.execution.executeStaged();

    expect(harness.runCommandsInTerminal).toHaveBeenCalledTimes(1);
    expect(harness.runCommandsInTerminal).toHaveBeenCalledWith(
      [
        createExecStep("ls -la", "ls", ["-la"]),
        createExecStep("git gc --prune=now", "git", ["gc", "--prune=now"])
      ],
      {
        requiresElevation: false
      }
    );
    expect(harness.runCommandInTerminal).not.toHaveBeenCalled();
    expect(harness.stagedCommands.value).toHaveLength(2);
    expect(harness.execution.executionFeedbackMessage.value).toContain("已发送到终端");
    expect(harness.execution.executionFeedbackMessage.value).toContain("首个：ls -la");
  });

  it("passes requiresElevation=true when staged queue contains admin command", async () => {
    const harness = createHarness(true);

    harness.execution.stageResult(createNoArgCommand());
    harness.execution.stageResult(createAdminCommand());
    await harness.execution.executeStaged();

    expect(harness.execution.safetyDialog.value?.mode).toBe("queue");
    await harness.execution.confirmSafetyExecution();
    expect(harness.runCommandsInTerminal).toHaveBeenCalledWith(
      [
        createExecStep("ls -la", "ls", ["-la"]),
        createExecStep("ipconfig /flushdns", "ipconfig", ["/flushdns"])
      ],
      {
        requiresElevation: true
      }
    );
  });

  it("blocks staged submit on injection hit before enqueue, and does not call terminal runners", async () => {
    const harness = createHarness(true);
    const command = createArgCommand();

    harness.execution.stageResult(command);
    harness.execution.updatePendingArgValue("value", " 8080; whoami ");
    const submitted = harness.execution.submitParamInput();

    expect(submitted).toBe(false);
    expect(harness.runCommandsInTerminal).not.toHaveBeenCalled();
    expect(harness.runCommandInTerminal).not.toHaveBeenCalled();
    expect(harness.stagedCommands.value).toHaveLength(0);
    expect(harness.execution.executionFeedbackTone.value).toBe("error");
    expect(harness.execution.executionFeedbackMessage.value).toContain("执行已拦截");
    expect(harness.execution.executionFeedbackMessage.value).toContain("下一步");
  });

  it("re-probes queued prerequisites before execution and blocks when required prerequisite now fails", async () => {
    const harness = createHarness(true);
    harness.runCommandPreflight.mockResolvedValueOnce([
      {
        id: "docker",
        ok: true,
        code: "ok",
        required: true,
        message: ""
      }
    ]);
    harness.execution.stageResult(createPrerequisiteCommand());
    await flushExecution();
    harness.runCommandPreflight.mockResolvedValueOnce([
      {
        id: "docker",
        ok: false,
        code: "missing-binary",
        required: true,
        message: "docker not found"
      }
    ]);

    await harness.execution.executeStaged();

    expect(harness.runCommandPreflight).toHaveBeenCalledTimes(2);
    expect(harness.runCommandsInTerminal).not.toHaveBeenCalled();
    expect(harness.runCommandInTerminal).not.toHaveBeenCalled();
    expect(harness.stagedCommands.value).toHaveLength(1);
    expect(harness.execution.executionFeedbackTone.value).toBe("error");
    expect(harness.execution.executionFeedbackMessage.value).toContain("无法执行该命令");
    expect(harness.execution.executionFeedbackMessage.value).toContain("未检测到 docker");
  });

  it("keeps staged queue when batch execution fails", async () => {
    const harness = createHarness(true);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    harness.runCommandsInTerminal.mockRejectedValueOnce(new Error("queue failed"));

    try {
      harness.execution.stageResult(createNoArgCommand());
      harness.execution.stageResult(createGitPruneCommand());

      await harness.execution.executeStaged();

      expect(harness.stagedCommands.value).toHaveLength(2);
      expect(harness.execution.executionFeedbackTone.value).toBe("error");
      expect(harness.execution.executionFeedbackMessage.value).toContain("queue failed");
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("prevents duplicate queue dispatch while preflight is still running", async () => {
    const harness = createHarness(true);
    let releasePreflight!: () => void;
    harness.runCommandPreflight.mockResolvedValueOnce([
      {
        id: "docker",
        ok: true,
        code: "ok",
        required: true,
        message: ""
      }
    ]);
    harness.runCommandPreflight.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releasePreflight = () =>
            resolve([
              {
                id: "docker",
                ok: true,
                code: "ok",
                required: true,
                message: ""
              }
            ]);
        })
    );
    harness.runCommandPreflight.mockResolvedValueOnce([
      {
        id: "docker",
        ok: true,
        code: "ok",
        required: true,
        message: ""
      }
    ]);

    harness.execution.stageResult(createPrerequisiteCommand());
    await flushExecution();

    const firstExecution = harness.execution.executeStaged();
    await nextTick();
    const secondExecution = harness.execution.executeStaged();

    expect(harness.execution.executing.value).toBe(true);
    expect(harness.runCommandsInTerminal).not.toHaveBeenCalled();

    releasePreflight();
    await firstExecution;
    await secondExecution;

    expect(harness.runCommandsInTerminal).toHaveBeenCalledTimes(1);
  });

  it("blocks queued execution when staged snapshot contains a problem command", async () => {
    const harness = createHarness(true);
    harness.stagedCommands.value = [
      {
        id: "broken-command",
        title: "问题命令",
        rawPreview: "echo {{value}}",
        renderedPreview: "echo test",
        executionTemplate: {
          kind: "exec",
          program: "echo",
          args: ["{{value}}"]
        },
        execution: {
          kind: "exec",
          program: "echo",
          args: ["test"]
        },
        args: [],
        argValues: {},
        blockingIssue: {
          code: "invalid-arg-pattern",
          message: "命令配置有问题，暂时不可用。",
          detail: "参数 value 的校验正则无效。"
        }
      }
    ];

    await harness.execution.executeStaged();

    expect(harness.runCommandsInTerminal).not.toHaveBeenCalled();
    expect(harness.runCommandInTerminal).not.toHaveBeenCalled();
    expect(harness.execution.executionFeedbackTone.value).toBe("error");
    expect(harness.execution.executionFeedbackMessage.value).toContain("命令配置有问题");
  });

  it("refreshes a single queued command cache without touching other items", async () => {
    const harness = createHarness();
    const second = createPrerequisiteCommand(
      {
        id: "gh-auth",
        title: "gh-auth",
        preview: "gh auth status",
        execution: {
          kind: "exec",
          program: "gh",
          args: ["auth", "status"]
        }
      },
      [
        {
          id: "github-token",
          type: "env",
          required: true,
          check: "env:GITHUB_TOKEN",
          displayName: "GitHub Token",
          resolutionHint: "设置 GITHUB_TOKEN 后重试"
        }
      ]
    );
    harness.runCommandPreflight.mockResolvedValueOnce([
      {
        id: "docker",
        ok: false,
        code: "missing-binary",
        required: true,
        message: "docker not found"
      }
    ]);
    harness.execution.stageResult(createPrerequisiteCommand());
    await flushExecution();
    harness.runCommandPreflight.mockResolvedValueOnce([
      {
        id: "github-token",
        ok: false,
        code: "missing-env",
        required: true,
        message: "required environment variable not found: GITHUB_TOKEN"
      }
    ]);
    harness.execution.stageResult(second);
    await flushExecution();

    const targetId = harness.stagedCommands.value[0]?.id;
    let resolveRefresh: (value: CommandPrerequisiteProbeResult[]) => void = () => {};
    harness.runCommandPreflight.mockImplementationOnce(
      () =>
        new Promise<CommandPrerequisiteProbeResult[]>((resolve) => {
          resolveRefresh = resolve;
        })
    );

    const refreshPromise = harness.execution.refreshQueuedCommandPreflight(targetId!);

    expect(harness.execution.refreshingAllQueuedPreflight.value).toBe(false);
    expect(harness.execution.refreshingQueuedCommandIds.value).toContain(targetId);

    resolveRefresh([]);
    await refreshPromise;

    expect(harness.stagedCommands.value[0]?.preflightCache?.issueCount).toBe(0);
    expect(harness.stagedCommands.value[1]?.preflightCache?.issueCount).toBe(1);
    expect(harness.execution.refreshingQueuedCommandIds.value).not.toContain(targetId);
  });

  it("ignores a single queued preflight refresh that resolves after the target item was removed", async () => {
    const harness = createHarness();
    harness.runCommandPreflight.mockResolvedValueOnce([
      {
        id: "docker",
        ok: false,
        code: "missing-binary",
        required: true,
        message: "docker not found"
      }
    ]);
    harness.execution.stageResult(createPrerequisiteCommand());
    await flushExecution();

    const targetId = harness.stagedCommands.value[0]?.id;
    let resolveRefresh: (value: CommandPrerequisiteProbeResult[]) => void = () => {};
    harness.runCommandPreflight.mockImplementationOnce(
      () =>
        new Promise<CommandPrerequisiteProbeResult[]>((resolve) => {
          resolveRefresh = resolve;
        })
    );

    const refreshPromise = harness.execution.refreshQueuedCommandPreflight(targetId!);
    harness.execution.removeStagedCommand(targetId!);
    resolveRefresh([]);
    await refreshPromise;

    expect(harness.stagedCommands.value).toEqual([]);
  });

  it("refreshes all queued command caches and reports total issue count", async () => {
    const harness = createHarness();
    const second = createPrerequisiteCommand(
      {
        id: "gh-auth",
        title: "gh-auth",
        preview: "gh auth status",
        execution: {
          kind: "exec",
          program: "gh",
          args: ["auth", "status"]
        }
      },
      [
        {
          id: "github-token",
          type: "env",
          required: true,
          check: "env:GITHUB_TOKEN",
          displayName: "GitHub Token",
          resolutionHint: "设置 GITHUB_TOKEN 后重试"
        }
      ]
    );
    harness.runCommandPreflight.mockResolvedValueOnce([
      {
        id: "docker",
        ok: false,
        code: "missing-binary",
        required: true,
        message: "docker not found"
      }
    ]);
    harness.execution.stageResult(createPrerequisiteCommand());
    await flushExecution();
    harness.runCommandPreflight.mockResolvedValueOnce([
      {
        id: "github-token",
        ok: false,
        code: "missing-env",
        required: true,
        message: "required environment variable not found: GITHUB_TOKEN"
      }
    ]);
    harness.execution.stageResult(second);
    await flushExecution();

    const refreshResolvers: Array<(value: CommandPrerequisiteProbeResult[]) => void> = [];
    harness.runCommandPreflight.mockImplementationOnce(
      () =>
        new Promise<CommandPrerequisiteProbeResult[]>((resolve) => {
          refreshResolvers[0] = resolve;
        })
    );
    harness.runCommandPreflight.mockImplementationOnce(
      () =>
        new Promise<CommandPrerequisiteProbeResult[]>((resolve) => {
          refreshResolvers[1] = resolve;
        })
    );

    const refreshPromise = harness.execution.refreshAllQueuedPreflight();

    expect(harness.execution.refreshingAllQueuedPreflight.value).toBe(true);

    const firstRefreshResolve = refreshResolvers[0];
    if (firstRefreshResolve) {
      firstRefreshResolve([]);
    }
    const secondRefreshResolve = refreshResolvers[1];
    if (secondRefreshResolve) {
      secondRefreshResolve([
        {
          id: "github-token",
          ok: false,
          code: "missing-env",
          required: true,
          message: "required environment variable not found: GITHUB_TOKEN"
        }
      ]);
    }
    await refreshPromise;

    expect(harness.execution.refreshingAllQueuedPreflight.value).toBe(false);
    expect(harness.stagedCommands.value[0]?.preflightCache?.issueCount).toBe(0);
    expect(harness.stagedCommands.value[1]?.preflightCache?.issueCount).toBe(1);
    expect(harness.execution.executionFeedbackMessage.value).toContain("1 条命令存在环境提示");
  });

  it("treats unsupported prerequisite as blocking failure", async () => {
    const harness = createHarness();
    const command = createPrerequisiteCommand(
      {},
      [{ id: "login-shell", type: "shell", required: true, check: "pwsh" }]
    );
    harness.runCommandPreflight.mockResolvedValueOnce([
      {
        id: "login-shell",
        ok: false,
        code: "unsupported-prerequisite",
        required: true,
        message: "unsupported prerequisite type: shell"
      }
    ]);

    harness.execution.executeResult(command);
    await flushExecution();

    expect(harness.runCommandInTerminal).not.toHaveBeenCalled();
    expect(harness.execution.executionFeedbackTone.value).toBe("error");
    expect(harness.execution.executionFeedbackMessage.value).toContain("unsupported prerequisite");
  });

  it("limits concurrent queued preflight refreshes", async () => {
    vi.useFakeTimers();
    const harness = createHarness();
    harness.stagedCommands.value = Array.from({ length: 9 }, (_, index) => ({
      id: `cmd-${index}`,
      title: `Cmd ${index}`,
      rawPreview: `echo ${index}`,
      renderedPreview: `echo ${index}`,
      executionTemplate: {
        kind: "exec",
        program: "echo",
        args: [`${index}`]
      },
      execution: {
        kind: "exec",
        program: "echo",
        args: [`${index}`]
      },
      args: [],
      argValues: {},
      prerequisites: [{ id: `bin-${index}`, type: "binary", required: true, check: "echo" }]
    }));

    let inFlight = 0;
    let maxInFlight = 0;
    harness.runCommandPreflight.mockImplementation(async (prerequisites: CommandPrerequisite[]) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 0));
      inFlight -= 1;
      return prerequisites.map((prerequisite) => ({
        id: prerequisite.id,
        ok: true,
        code: "ok",
        message: "",
        required: prerequisite.required
      }));
    });

    const pending = harness.execution.refreshAllQueuedPreflight();
    await vi.runAllTimersAsync();
    await pending;

    expect(maxInFlight).toBeLessThanOrEqual(4);
    vi.useRealTimers();
  });

  it("limits but parallelizes queued preflight checks before execution", async () => {
    vi.useFakeTimers();
    const harness = createHarness(true);
    harness.stagedCommands.value = Array.from({ length: 8 }, (_, index) => ({
      id: `exec-${index}`,
      title: `Exec ${index}`,
      rawPreview: `echo ${index}`,
      renderedPreview: `echo ${index}`,
      executionTemplate: {
        kind: "exec",
        program: "echo",
        args: [`${index}`]
      },
      execution: {
        kind: "exec",
        program: "echo",
        args: [`${index}`]
      },
      args: [],
      argValues: {},
      prerequisites: [{ id: `bin-${index}`, type: "binary", required: true, check: "echo" }]
    }));

    let inFlight = 0;
    let maxInFlight = 0;
    harness.runCommandPreflight.mockImplementation(async (prerequisites: CommandPrerequisite[]) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 0));
      inFlight -= 1;
      return prerequisites.map((prerequisite) => ({
        id: prerequisite.id,
        ok: true,
        code: "ok",
        message: "",
        required: prerequisite.required
      }));
    });

    const pending = harness.execution.executeStaged();
    await vi.runAllTimersAsync();
    await pending;

    expect(maxInFlight).toBeGreaterThan(1);
    expect(maxInFlight).toBeLessThanOrEqual(4);
    expect(harness.runCommandsInTerminal).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("removes staged command and clamps active index", () => {
    const harness = createHarness();
    harness.stagedCommands.value = [
      {
        id: "a",
        title: "A",
        rawPreview: "echo a",
        renderedPreview: "echo a",
        executionTemplate: {
          kind: "exec",
          program: "echo",
          args: ["a"]
        },
        execution: {
          kind: "exec",
          program: "echo",
          args: ["a"]
        },
        args: [],
        argValues: {}
      },
      {
        id: "b",
        title: "B",
        rawPreview: "echo b",
        renderedPreview: "echo b",
        executionTemplate: {
          kind: "exec",
          program: "echo",
          args: ["b"]
        },
        execution: {
          kind: "exec",
          program: "echo",
          args: ["b"]
        },
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

  it("requires safety confirmation for dangerous queue before execution", async () => {
    const harness = createHarness(true);
    const risky = createKillTaskCommand();

    harness.execution.stageResult(risky);
    expect(harness.execution.pendingCommand.value).toBeNull();
    expect(harness.stagedCommands.value).toHaveLength(1);
    expect(harness.onNeedPanel).not.toHaveBeenCalled();

    await harness.execution.executeStaged();

    expect(harness.execution.safetyDialog.value?.mode).toBe("queue");
    expect(harness.runCommandsInTerminal).not.toHaveBeenCalled();

    await harness.execution.confirmSafetyExecution();
    expect(harness.runCommandsInTerminal).toHaveBeenCalledWith(
      [createExecStep("taskkill /F /PID 1234", "taskkill", ["/F", "/PID", "1234"])],
      {
        requiresElevation: false
      }
    );
  });
});
