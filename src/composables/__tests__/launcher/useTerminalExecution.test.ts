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
      command:
        "Write-Host '[zapcmd][run] echo hello'; echo hello; Write-Host ('[zapcmd][exit ' + $LASTEXITCODE + '] echo hello')"
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
      command:
        "setlocal EnableDelayedExpansion & echo [zapcmd][run] dir & dir & echo [zapcmd][exit !ERRORLEVEL!] dir"
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
        "Write-Host '[zapcmd][1/2][run] echo hello'; echo hello; Write-Host ('[zapcmd][1/2][exit ' + $LASTEXITCODE + '] echo hello'); Write-Host '[zapcmd][2/2][run] git status'; git status; Write-Host ('[zapcmd][2/2][exit ' + $LASTEXITCODE + '] git status'); Write-Host ('[zapcmd][queue][exit ' + $LASTEXITCODE + '] total: 2')"
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
        "setlocal EnableDelayedExpansion & echo [zapcmd][1/1][run] git status & git status & echo [zapcmd][1/1][exit !ERRORLEVEL!] git status & echo [zapcmd][queue][exit !ERRORLEVEL!] total: 1"
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
        "Write-Host '[zapcmd][1/1][run] netstat -ano | findstr :8080'; netstat -ano | findstr :8080; Write-Host ('[zapcmd][1/1][exit ' + $LASTEXITCODE + '] netstat -ano | findstr :8080'); Write-Host ('[zapcmd][queue][exit ' + $LASTEXITCODE + '] total: 1')"
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
        "Write-Host '[zapcmd][1/2][run] netstat -ano | findstr :8081'; netstat -ano | findstr :8081; Write-Host ('[zapcmd][1/2][exit ' + $LASTEXITCODE + '] netstat -ano | findstr :8081'); Write-Host '[zapcmd][2/2][run] netstat -ano | findstr :443'; netstat -ano | findstr :443; Write-Host ('[zapcmd][2/2][exit ' + $LASTEXITCODE + '] netstat -ano | findstr :443'); Write-Host ('[zapcmd][queue][exit ' + $LASTEXITCODE + '] total: 2')"
    });
  });
});
