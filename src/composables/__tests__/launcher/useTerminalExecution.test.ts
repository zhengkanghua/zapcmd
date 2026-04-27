import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useTerminalExecution } from "../../launcher/useTerminalExecution";
import type { TerminalReusePolicy } from "../../../stores/settingsStore";

type TestTerminalOption = { id: string; label: string; path: string };

interface ExecutionHarnessOptions {
  isTauriRuntime?: boolean;
  initialAvailableTerminals?: TestTerminalOption[];
  availableTerminalsTrusted?: boolean;
  discoveredTerminals?: TestTerminalOption[];
  fallbackTerminalOptions?: TestTerminalOption[];
  readAvailableTerminals?: () => Promise<TestTerminalOption[]>;
}

function createExecutionHarness(
  initialTerminalId: string,
  alwaysElevated = false,
  initialTerminalReusePolicy: TerminalReusePolicy = "never",
  options: ExecutionHarnessOptions = {}
) {
  const run = vi.fn(async () => {});
  const defaultTerminal = ref(initialTerminalId);
  const terminalReusePolicy = ref(initialTerminalReusePolicy);
  const availableTerminals = ref<TestTerminalOption[]>(
    options.initialAvailableTerminals ?? []
  );
  const availableTerminalsTrusted = ref(
    options.availableTerminalsTrusted ?? availableTerminals.value.length > 0
  );
  const readAvailableTerminals = vi.fn(
    options.readAvailableTerminals ??
      (async () => options.discoveredTerminals ?? [])
  );
  const persistCorrectedTerminal = vi.fn();
  const execution = useTerminalExecution({
    commandExecutor: { run },
    defaultTerminal,
    alwaysElevatedTerminal: ref(alwaysElevated),
    terminalReusePolicy,
    availableTerminals,
    availableTerminalsTrusted,
    fallbackTerminalOptions: () => options.fallbackTerminalOptions ?? [],
    isTauriRuntime: () => options.isTauriRuntime ?? false,
    readAvailableTerminals,
    persistCorrectedTerminal
  });

  return {
    run,
    defaultTerminal,
    terminalReusePolicy,
    availableTerminals,
    availableTerminalsTrusted,
    readAvailableTerminals,
    persistCorrectedTerminal,
    execution
  };
}

function createExecStep(summary: string, program: string, args: string[]) {
  return {
    summary,
    execution: {
      kind: "exec" as const,
      program,
      args
    }
  };
}

function createScriptStep(summary: string, runner: "powershell" | "pwsh" | "cmd" | "bash" | "sh", command: string) {
  return {
    summary,
    execution: {
      kind: "script" as const,
      runner,
      command
    }
  };
}

describe("useTerminalExecution", () => {
  it("dispatches structured single-step payload to executor", async () => {
    const { run, execution } = createExecutionHarness("powershell");

    await execution.runCommandInTerminal(
      createScriptStep("Get-Item missing", "powershell", "Get-Item missing")
    );

    expect(run).toHaveBeenCalledWith({
      terminalId: "powershell",
      steps: [
        {
          summary: "Get-Item missing",
          execution: {
            kind: "script",
            runner: "powershell",
            command: "Get-Item missing"
          }
        }
      ],
      requiresElevation: false,
      alwaysElevated: false,
      terminalReusePolicy: "never"
    });
  });

  it("reads latest terminal id on each invocation", async () => {
    const { run, defaultTerminal, execution } = createExecutionHarness("cmd", true);

    defaultTerminal.value = "wt";
    await execution.runCommandInTerminal(
      createExecStep("dir", "cmd", ["/c", "dir"]),
      { requiresElevation: true }
    );

    expect(run).toHaveBeenCalledWith({
      terminalId: "wt",
      steps: [
        {
          summary: "dir",
          execution: {
            kind: "exec",
            program: "cmd",
            args: ["/c", "dir"]
          }
        }
      ],
      requiresElevation: true,
      alwaysElevated: true,
      terminalReusePolicy: "never"
    });
  });

  it("runs staged commands as structured steps", async () => {
    const { run, execution } = createExecutionHarness("pwsh");

    await execution.runCommandsInTerminal([
      createExecStep("echo hello", "echo", ["hello"]),
      createExecStep("git status", "git", ["status"])
    ]);

    expect(run).toHaveBeenCalledWith({
      terminalId: "pwsh",
      steps: [
        {
          summary: "echo hello",
          execution: {
            kind: "exec",
            program: "echo",
            args: ["hello"]
          }
        },
        {
          summary: "git status",
          execution: {
            kind: "exec",
            program: "git",
            args: ["status"]
          }
        }
      ],
      requiresElevation: false,
      alwaysElevated: false,
      terminalReusePolicy: "never"
    });
  });

  it("keeps mixed exec/script queue order and summary text intact", async () => {
    const { run, execution } = createExecutionHarness("wt");

    await execution.runCommandsInTerminal([
      createExecStep("docker ps", "docker", ["ps"]),
      createScriptStep("regex-test-win", "powershell", "Get-Content app.log | Select-String ERROR")
    ]);

    expect(run).toHaveBeenCalledWith({
      terminalId: "wt",
      steps: [
        {
          summary: "docker ps",
          execution: {
            kind: "exec",
            program: "docker",
            args: ["ps"]
          }
        },
        {
          summary: "regex-test-win",
          execution: {
            kind: "script",
            runner: "powershell",
            command: "Get-Content app.log | Select-String ERROR"
          }
        }
      ],
      requiresElevation: false,
      alwaysElevated: false,
      terminalReusePolicy: "never"
    });
  });

  it("passes elevation flags for queue execution", async () => {
    const { run, execution } = createExecutionHarness("wt", true);

    await execution.runCommandsInTerminal(
      [createExecStep("git status", "git", ["status"])],
      { requiresElevation: true }
    );

    expect(run).toHaveBeenCalledWith({
      terminalId: "wt",
      steps: [
        {
          summary: "git status",
          execution: {
            kind: "exec",
            program: "git",
            args: ["status"]
          }
        }
      ],
      requiresElevation: true,
      alwaysElevated: true,
      terminalReusePolicy: "never"
    });
  });

  it("corrects invalid terminal before dispatching command", async () => {
    const {
      run,
      defaultTerminal,
      availableTerminals,
      availableTerminalsTrusted,
      persistCorrectedTerminal,
      execution
    } = createExecutionHarness("ghost");
    availableTerminals.value = [{ id: "cmd", label: "Command Prompt", path: "cmd.exe" }];
    availableTerminalsTrusted.value = true;

    await execution.runCommandInTerminal(createExecStep("dir", "cmd", ["/c", "dir"]));

    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        terminalId: "cmd"
      })
    );
    expect(defaultTerminal.value).toBe("cmd");
    expect(persistCorrectedTerminal).toHaveBeenCalledTimes(1);
  });

  it("passes terminal reuse policy to executor requests", async () => {
    const { run, execution } = createExecutionHarness("wt", false, "normal-only");

    await execution.runCommandInTerminal(createExecStep("dir", "cmd", ["/c", "dir"]));

    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        terminalReusePolicy: "normal-only"
      })
    );
  });

  it("passes terminal reuse policy for queue requests without frontend platform branching", async () => {
    const { run, readAvailableTerminals, execution } = createExecutionHarness(
      "wt",
      false,
      "normal-only",
      {
        isTauriRuntime: false
      }
    );

    await execution.runCommandsInTerminal([
      createExecStep("git status", "git", ["status"])
    ]);

    expect(readAvailableTerminals).not.toHaveBeenCalled();
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        terminalId: "wt",
        terminalReusePolicy: "normal-only"
      })
    );
  });

  it("discovers terminals from tauri runtime and caches corrected terminal before dispatch", async () => {
    const {
      run,
      defaultTerminal,
      availableTerminals,
      readAvailableTerminals,
      persistCorrectedTerminal,
      execution
    } = createExecutionHarness("ghost", false, "never", {
      isTauriRuntime: true,
      discoveredTerminals: [{ id: "wt", label: "Windows Terminal", path: "wt.exe" }]
    });

    await execution.runCommandInTerminal(createExecStep("dir", "cmd", ["/c", "dir"]));

    expect(readAvailableTerminals).toHaveBeenCalledTimes(1);
    expect(availableTerminals.value).toEqual([
      { id: "wt", label: "Windows Terminal", path: "wt.exe" }
    ]);
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        terminalId: "wt"
      })
    );
    expect(defaultTerminal.value).toBe("wt");
    expect(persistCorrectedTerminal).toHaveBeenCalledTimes(1);
  });

  it("skips rediscovery when terminals are already cached", async () => {
    const { run, readAvailableTerminals, execution } = createExecutionHarness(
      "pwsh",
      false,
      "never",
      {
        isTauriRuntime: true,
        initialAvailableTerminals: [{ id: "pwsh", label: "PowerShell 7", path: "pwsh.exe" }]
      }
    );

    await execution.runCommandInTerminal(createExecStep("dir", "cmd", ["/c", "dir"]));

    expect(readAvailableTerminals).not.toHaveBeenCalled();
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        terminalId: "pwsh"
      })
    );
  });

  it("falls back to unresolved terminal when tauri discovery returns no usable terminals", async () => {
    const { run, persistCorrectedTerminal, execution } = createExecutionHarness(
      "ghost",
      false,
      "never",
      {
        isTauriRuntime: true,
        discoveredTerminals: []
      }
    );

    await execution.runCommandInTerminal(createExecStep("dir", "cmd", ["/c", "dir"]));

    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        terminalId: "ghost"
      })
    );
    expect(persistCorrectedTerminal).not.toHaveBeenCalled();
  });

  it("warns and continues when terminal discovery fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { run, persistCorrectedTerminal, execution } = createExecutionHarness("ghost", false, "never", {
      isTauriRuntime: true,
      fallbackTerminalOptions: [{ id: "cmd", label: "Command Prompt", path: "cmd.exe" }],
      readAvailableTerminals: async () => {
        throw new Error("boom");
      }
    });

    await execution.runCommandInTerminal(createExecStep("dir", "cmd", ["/c", "dir"]));

    expect(warnSpy).toHaveBeenCalledWith(
      "readAvailableTerminals before execution failed",
      expect.any(Error)
    );
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        terminalId: "cmd"
      })
    );
    expect(persistCorrectedTerminal).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("warns and continues when persisting corrected terminal fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const {
      run,
      persistCorrectedTerminal,
      execution
    } = createExecutionHarness("ghost", false, "never", {
      isTauriRuntime: true,
      initialAvailableTerminals: [{ id: "cmd", label: "Command Prompt", path: "cmd.exe" }]
    });
    persistCorrectedTerminal.mockImplementation(() => {
      throw new Error("persist failed");
    });

    await execution.runCommandInTerminal(createExecStep("dir", "cmd", ["/c", "dir"]));

    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        terminalId: "cmd"
      })
    );
    expect(warnSpy).toHaveBeenCalledWith(
      "persist corrected terminal before execution failed",
      expect.any(Error)
    );
    warnSpy.mockRestore();
  });

  it("rejects blank single-step summaries before dispatch", async () => {
    const { run, execution } = createExecutionHarness("pwsh");

    await expect(
      execution.runCommandInTerminal(createExecStep("   ", "git", ["status"]))
    ).rejects.toThrow("Command summary cannot be empty.");
    expect(run).not.toHaveBeenCalled();
  });

  it("filters blank queue items but keeps executable steps in order", async () => {
    const { run, execution } = createExecutionHarness("pwsh");

    await execution.runCommandsInTerminal([
      createExecStep("git status", "git", ["status"]),
      createScriptStep("   ", "bash", "echo skipped"),
      createScriptStep("echo ready", "bash", "echo ready")
    ]);

    expect(run).toHaveBeenCalledWith({
      terminalId: "pwsh",
      steps: [
        {
          summary: "git status",
          execution: {
            kind: "exec",
            program: "git",
            args: ["status"]
          }
        },
        {
          summary: "echo ready",
          execution: {
            kind: "script",
            runner: "bash",
            command: "echo ready"
          }
        }
      ],
      requiresElevation: false,
      alwaysElevated: false,
      terminalReusePolicy: "never"
    });
  });

  it("rejects queue execution when every step is blank", async () => {
    const { run, execution } = createExecutionHarness("pwsh");

    await expect(
      execution.runCommandsInTerminal([createExecStep("   ", "git", ["status"])])
    ).rejects.toThrow("No executable commands in queue.");
    expect(run).not.toHaveBeenCalled();
  });
});
