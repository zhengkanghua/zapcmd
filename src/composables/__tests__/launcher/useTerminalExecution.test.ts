import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useTerminalExecution } from "../../launcher/useTerminalExecution";

describe("useTerminalExecution", () => {
  it("runs command with selected terminal id", async () => {
    const run = vi.fn(async () => {});
    const terminal = ref("powershell");
    const execution = useTerminalExecution({
      commandExecutor: { run },
      defaultTerminal: terminal
    });

    await execution.runCommandInTerminal("echo hello");

    expect(run).toHaveBeenCalledWith({
      terminalId: "powershell",
      command: "Write-Host '[zapcmd] executing: echo hello'; echo hello; Write-Host ('[zapcmd] finished, last exit code: ' + $LASTEXITCODE)"
    });
  });

  it("reads latest terminal id on each invocation", async () => {
    const run = vi.fn(async () => {});
    const terminal = ref("cmd");
    const execution = useTerminalExecution({
      commandExecutor: { run },
      defaultTerminal: terminal
    });

    terminal.value = "wt";
    await execution.runCommandInTerminal("dir");

    expect(run).toHaveBeenCalledWith({
      terminalId: "wt",
      command: "echo [zapcmd] executing: dir && dir & echo [zapcmd] finished"
    });
  });

  it("runs staged commands in one batch command", async () => {
    const run = vi.fn(async () => {});
    const terminal = ref("pwsh");
    const execution = useTerminalExecution({
      commandExecutor: { run },
      defaultTerminal: terminal
    });

    await execution.runCommandsInTerminal(["echo hello", "git status"]);

    expect(run).toHaveBeenCalledWith({
      terminalId: "pwsh",
      command:
        "Write-Host '[zapcmd] [1/2] executing: echo hello'; echo hello; Write-Host ('[zapcmd] [1/2] exit code: ' + $LASTEXITCODE); Write-Host '[zapcmd] [2/2] executing: git status'; git status; Write-Host ('[zapcmd] [2/2] exit code: ' + $LASTEXITCODE); Write-Host ('[zapcmd] queue finished, total: 2, last exit code: ' + $LASTEXITCODE)"
    });
  });

  it("switches queue execution to the latest settings terminal before dispatch", async () => {
    const run = vi.fn(async () => {});
    const terminal = ref("powershell");
    const execution = useTerminalExecution({
      commandExecutor: { run },
      defaultTerminal: terminal
    });

    terminal.value = "wt";
    await execution.runCommandsInTerminal(["git status"]);

    expect(run).toHaveBeenCalledWith({
      terminalId: "wt",
      command:
        "echo [zapcmd] [1/1] executing: git status & git status & echo [zapcmd] [1/1] finished & echo [zapcmd] queue finished, total: 1"
    });
  });

  it("keeps pipe symbol in PowerShell queue hint for visibility", async () => {
    const run = vi.fn(async () => {});
    const terminal = ref("powershell");
    const execution = useTerminalExecution({
      commandExecutor: { run },
      defaultTerminal: terminal
    });

    await execution.runCommandsInTerminal(["netstat -ano | findstr :8080"]);

    expect(run).toHaveBeenCalledWith({
      terminalId: "powershell",
      command:
        "Write-Host '[zapcmd] [1/1] executing: netstat -ano | findstr :8080'; netstat -ano | findstr :8080; Write-Host ('[zapcmd] [1/1] exit code: ' + $LASTEXITCODE); Write-Host ('[zapcmd] queue finished, total: 1, last exit code: ' + $LASTEXITCODE)"
    });
  });

  it("labels each queued command so output can be matched to each step", async () => {
    const run = vi.fn(async () => {});
    const terminal = ref("powershell");
    const execution = useTerminalExecution({
      commandExecutor: { run },
      defaultTerminal: terminal
    });

    await execution.runCommandsInTerminal(["netstat -ano | findstr :8081", "netstat -ano | findstr :443"]);

    expect(run).toHaveBeenCalledWith({
      terminalId: "powershell",
      command:
        "Write-Host '[zapcmd] [1/2] executing: netstat -ano | findstr :8081'; netstat -ano | findstr :8081; Write-Host ('[zapcmd] [1/2] exit code: ' + $LASTEXITCODE); Write-Host '[zapcmd] [2/2] executing: netstat -ano | findstr :443'; netstat -ano | findstr :443; Write-Host ('[zapcmd] [2/2] exit code: ' + $LASTEXITCODE); Write-Host ('[zapcmd] queue finished, total: 2, last exit code: ' + $LASTEXITCODE)"
    });
  });
});

