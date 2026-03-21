import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useTerminalExecution } from "../../launcher/useTerminalExecution";

describe("useTerminalExecution", () => {
  it("builds powershell single-command payload with conditional failed markers", async () => {
    const run = vi.fn(async () => {});
    const terminal = ref("powershell");
    const execution = useTerminalExecution({
      commandExecutor: { run },
      defaultTerminal: terminal
    });

    await execution.runCommandInTerminal("Get-Item missing");

    expect(run).toHaveBeenCalledWith({
      terminalId: "powershell",
      command:
        "Write-Host '[zapcmd][run] Get-Item missing'; $LASTEXITCODE = $null; Get-Item missing; $zapcmdSuccess = $?; $zapcmdCode = $LASTEXITCODE; if (-not $zapcmdSuccess) { if ($null -ne $zapcmdCode) { Write-Host ('[zapcmd][failed] Get-Item missing (code ' + $zapcmdCode + ')') } else { Write-Host '[zapcmd][failed] Get-Item missing' } }"
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
        "setlocal EnableDelayedExpansion & echo [zapcmd][run] dir & dir & set \"zapcmdCode=!ERRORLEVEL!\" & if not \"!zapcmdCode!\"==\"0\" echo [zapcmd][failed] dir (code !zapcmdCode!)"
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
        "$zapcmdFailedCount = 0; Write-Host '[zapcmd][1/2][run] echo hello'; $LASTEXITCODE = $null; echo hello; $zapcmdSuccess = $?; $zapcmdCode = $LASTEXITCODE; if (-not $zapcmdSuccess) { $zapcmdFailedCount += 1; if ($null -ne $zapcmdCode) { Write-Host ('[zapcmd][1/2][failed] echo hello (code ' + $zapcmdCode + ')') } else { Write-Host '[zapcmd][1/2][failed] echo hello' } }; Write-Host '[zapcmd][2/2][run] git status'; $LASTEXITCODE = $null; git status; $zapcmdSuccess = $?; $zapcmdCode = $LASTEXITCODE; if (-not $zapcmdSuccess) { $zapcmdFailedCount += 1; if ($null -ne $zapcmdCode) { Write-Host ('[zapcmd][2/2][failed] git status (code ' + $zapcmdCode + ')') } else { Write-Host '[zapcmd][2/2][failed] git status' } }; if ($zapcmdFailedCount -eq 0) { Write-Host '[zapcmd][queue][done] total: 2' } else { Write-Host ('[zapcmd][queue][failed] total: 2, failed: ' + $zapcmdFailedCount) }"
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
        "setlocal EnableDelayedExpansion & set /a zapcmdFailedCount=0 & echo [zapcmd][1/1][run] git status & git status & set \"zapcmdCode=!ERRORLEVEL!\" & if not \"!zapcmdCode!\"==\"0\" (set /a zapcmdFailedCount+=1 & echo [zapcmd][1/1][failed] git status (code !zapcmdCode!)) & if \"!zapcmdFailedCount!\"==\"0\" (echo [zapcmd][queue][done] total: 1) else (echo [zapcmd][queue][failed] total: 1, failed: !zapcmdFailedCount!)"
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
        "$zapcmdFailedCount = 0; Write-Host '[zapcmd][1/1][run] netstat -ano | findstr :8080'; $LASTEXITCODE = $null; netstat -ano | findstr :8080; $zapcmdSuccess = $?; $zapcmdCode = $LASTEXITCODE; if (-not $zapcmdSuccess) { $zapcmdFailedCount += 1; if ($null -ne $zapcmdCode) { Write-Host ('[zapcmd][1/1][failed] netstat -ano | findstr :8080 (code ' + $zapcmdCode + ')') } else { Write-Host '[zapcmd][1/1][failed] netstat -ano | findstr :8080' } }; if ($zapcmdFailedCount -eq 0) { Write-Host '[zapcmd][queue][done] total: 1' } else { Write-Host ('[zapcmd][queue][failed] total: 1, failed: ' + $zapcmdFailedCount) }"
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
        "$zapcmdFailedCount = 0; Write-Host '[zapcmd][1/2][run] netstat -ano | findstr :8081'; $LASTEXITCODE = $null; netstat -ano | findstr :8081; $zapcmdSuccess = $?; $zapcmdCode = $LASTEXITCODE; if (-not $zapcmdSuccess) { $zapcmdFailedCount += 1; if ($null -ne $zapcmdCode) { Write-Host ('[zapcmd][1/2][failed] netstat -ano | findstr :8081 (code ' + $zapcmdCode + ')') } else { Write-Host '[zapcmd][1/2][failed] netstat -ano | findstr :8081' } }; Write-Host '[zapcmd][2/2][run] netstat -ano | findstr :443'; $LASTEXITCODE = $null; netstat -ano | findstr :443; $zapcmdSuccess = $?; $zapcmdCode = $LASTEXITCODE; if (-not $zapcmdSuccess) { $zapcmdFailedCount += 1; if ($null -ne $zapcmdCode) { Write-Host ('[zapcmd][2/2][failed] netstat -ano | findstr :443 (code ' + $zapcmdCode + ')') } else { Write-Host '[zapcmd][2/2][failed] netstat -ano | findstr :443' } }; if ($zapcmdFailedCount -eq 0) { Write-Host '[zapcmd][queue][done] total: 2' } else { Write-Host ('[zapcmd][queue][failed] total: 2, failed: ' + $zapcmdFailedCount) }"
    });
  });
});
