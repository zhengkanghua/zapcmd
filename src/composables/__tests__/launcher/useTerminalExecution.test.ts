import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useTerminalExecution } from "../../launcher/useTerminalExecution";

function createExecutionHarness(
  initialTerminalId: string,
  alwaysElevated = false,
  initialTerminalReusePolicy = "never"
) {
  const run = vi.fn(async () => {});
  const defaultTerminal = ref(initialTerminalId);
  const terminalReusePolicy = ref(initialTerminalReusePolicy);
  const availableTerminals = ref<
    Array<{ id: string; label: string; path: string }>
  >([]);
  const readAvailableTerminals = vi.fn(async () => []);
  const persistCorrectedTerminal = vi.fn();
  const execution = useTerminalExecution({
    commandExecutor: { run },
    defaultTerminal,
    alwaysElevatedTerminal: ref(alwaysElevated),
    terminalReusePolicy,
    availableTerminals,
    fallbackTerminalOptions: () => [],
    isTauriRuntime: () => false,
    readAvailableTerminals,
    persistCorrectedTerminal
  });

  return {
    run,
    defaultTerminal,
    terminalReusePolicy,
    availableTerminals,
    readAvailableTerminals,
    persistCorrectedTerminal,
    execution
  };
}

describe("useTerminalExecution", () => {
  it("builds powershell single-command payload with conditional failed markers", async () => {
    const { run, execution } = createExecutionHarness("powershell");

    await execution.runCommandInTerminal("Get-Item missing");

    expect(run).toHaveBeenCalledWith({
      terminalId: "powershell",
      command:
        "Write-Host '[zapcmd][run] Get-Item missing'; $LASTEXITCODE = $null; Get-Item missing; $zapcmdSuccess = $?; $zapcmdCode = $LASTEXITCODE; if (-not $zapcmdSuccess) { if ($null -ne $zapcmdCode) { Write-Host ('[zapcmd][failed] Get-Item missing (code ' + $zapcmdCode + ')') } else { Write-Host '[zapcmd][failed] Get-Item missing' } }",
      requiresElevation: false,
      alwaysElevated: false,
      terminalReusePolicy: "never"
    });
  });

  it("reads latest terminal id on each invocation", async () => {
    const { run, defaultTerminal, execution } = createExecutionHarness("cmd", true);

    defaultTerminal.value = "wt";
    await execution.runCommandInTerminal("dir", { requiresElevation: true });

    expect(run).toHaveBeenCalledWith({
      terminalId: "wt",
      command:
        "setlocal EnableDelayedExpansion & echo [zapcmd][run] dir & dir & set \"zapcmdCode=!ERRORLEVEL!\" & if not \"!zapcmdCode!\"==\"0\" echo [zapcmd][failed] dir (code !zapcmdCode!)",
      requiresElevation: true,
      alwaysElevated: true,
      terminalReusePolicy: "never"
    });
  });

  it("runs staged commands in one batch command", async () => {
    const { run, execution } = createExecutionHarness("pwsh");

    await execution.runCommandsInTerminal(["echo hello", "git status"]);

    expect(run).toHaveBeenCalledWith({
      terminalId: "pwsh",
      command:
        "$zapcmdFailedCount = 0; Write-Host '[zapcmd][1/2][run] echo hello'; $LASTEXITCODE = $null; echo hello; $zapcmdSuccess = $?; $zapcmdCode = $LASTEXITCODE; if (-not $zapcmdSuccess) { $zapcmdFailedCount += 1; if ($null -ne $zapcmdCode) { Write-Host ('[zapcmd][1/2][failed] echo hello (code ' + $zapcmdCode + ')') } else { Write-Host '[zapcmd][1/2][failed] echo hello' } }; Write-Host '[zapcmd][2/2][run] git status'; $LASTEXITCODE = $null; git status; $zapcmdSuccess = $?; $zapcmdCode = $LASTEXITCODE; if (-not $zapcmdSuccess) { $zapcmdFailedCount += 1; if ($null -ne $zapcmdCode) { Write-Host ('[zapcmd][2/2][failed] git status (code ' + $zapcmdCode + ')') } else { Write-Host '[zapcmd][2/2][failed] git status' } }; if ($zapcmdFailedCount -eq 0) { Write-Host '[zapcmd][queue][done] total: 2' } else { Write-Host ('[zapcmd][queue][failed] total: 2, failed: ' + $zapcmdFailedCount) }",
      requiresElevation: false,
      alwaysElevated: false,
      terminalReusePolicy: "never"
    });
  });

  it("switches queue execution to the latest settings terminal before dispatch", async () => {
    const { run, defaultTerminal, execution } = createExecutionHarness("powershell");

    defaultTerminal.value = "wt";
    await execution.runCommandsInTerminal(["git status"]);

    expect(run).toHaveBeenCalledWith({
      terminalId: "wt",
      command:
        "setlocal EnableDelayedExpansion & set /a zapcmdFailedCount=0 >nul & echo [zapcmd][1/1][run] git status & git status & set \"zapcmdCode=!ERRORLEVEL!\" & (if not \"!zapcmdCode!\"==\"0\" (set /a zapcmdFailedCount+=1 >nul & echo [zapcmd][1/1][failed] git status ^(code !zapcmdCode!^))) & if \"!zapcmdFailedCount!\"==\"0\" (echo [zapcmd][queue][done] total: 1) else (echo [zapcmd][queue][failed] total: 1, failed: !zapcmdFailedCount!)",
      requiresElevation: false,
      alwaysElevated: false,
      terminalReusePolicy: "never"
    });
  });

  it("keeps pipe symbol in PowerShell queue hint for visibility", async () => {
    const { run, execution } = createExecutionHarness("powershell");

    await execution.runCommandsInTerminal(["netstat -ano | findstr :8080"]);

    expect(run).toHaveBeenCalledWith({
      terminalId: "powershell",
      command:
        "$zapcmdFailedCount = 0; Write-Host '[zapcmd][1/1][run] netstat -ano | findstr :8080'; $LASTEXITCODE = $null; netstat -ano | findstr :8080; $zapcmdSuccess = $?; $zapcmdCode = $LASTEXITCODE; if (-not $zapcmdSuccess) { $zapcmdFailedCount += 1; if ($null -ne $zapcmdCode) { Write-Host ('[zapcmd][1/1][failed] netstat -ano | findstr :8080 (code ' + $zapcmdCode + ')') } else { Write-Host '[zapcmd][1/1][failed] netstat -ano | findstr :8080' } }; if ($zapcmdFailedCount -eq 0) { Write-Host '[zapcmd][queue][done] total: 1' } else { Write-Host ('[zapcmd][queue][failed] total: 1, failed: ' + $zapcmdFailedCount) }",
      requiresElevation: false,
      alwaysElevated: false,
      terminalReusePolicy: "never"
    });
  });

  it("labels each queued command so output can be matched to each step", async () => {
    const { run, execution } = createExecutionHarness("powershell");

    await execution.runCommandsInTerminal(["netstat -ano | findstr :8081", "netstat -ano | findstr :443"]);

    expect(run).toHaveBeenCalledWith({
      terminalId: "powershell",
      command:
        "$zapcmdFailedCount = 0; Write-Host '[zapcmd][1/2][run] netstat -ano | findstr :8081'; $LASTEXITCODE = $null; netstat -ano | findstr :8081; $zapcmdSuccess = $?; $zapcmdCode = $LASTEXITCODE; if (-not $zapcmdSuccess) { $zapcmdFailedCount += 1; if ($null -ne $zapcmdCode) { Write-Host ('[zapcmd][1/2][failed] netstat -ano | findstr :8081 (code ' + $zapcmdCode + ')') } else { Write-Host '[zapcmd][1/2][failed] netstat -ano | findstr :8081' } }; Write-Host '[zapcmd][2/2][run] netstat -ano | findstr :443'; $LASTEXITCODE = $null; netstat -ano | findstr :443; $zapcmdSuccess = $?; $zapcmdCode = $LASTEXITCODE; if (-not $zapcmdSuccess) { $zapcmdFailedCount += 1; if ($null -ne $zapcmdCode) { Write-Host ('[zapcmd][2/2][failed] netstat -ano | findstr :443 (code ' + $zapcmdCode + ')') } else { Write-Host '[zapcmd][2/2][failed] netstat -ano | findstr :443' } }; if ($zapcmdFailedCount -eq 0) { Write-Host '[zapcmd][queue][done] total: 2' } else { Write-Host ('[zapcmd][queue][failed] total: 2, failed: ' + $zapcmdFailedCount) }",
      requiresElevation: false,
      alwaysElevated: false,
      terminalReusePolicy: "never"
    });
  });

  it("passes elevation flags for queue execution", async () => {
    const { run, execution } = createExecutionHarness("wt", true);

    await execution.runCommandsInTerminal(["git status"], { requiresElevation: true });

    expect(run).toHaveBeenCalledWith({
      terminalId: "wt",
      command:
        "setlocal EnableDelayedExpansion & set /a zapcmdFailedCount=0 >nul & echo [zapcmd][1/1][run] git status & git status & set \"zapcmdCode=!ERRORLEVEL!\" & (if not \"!zapcmdCode!\"==\"0\" (set /a zapcmdFailedCount+=1 >nul & echo [zapcmd][1/1][failed] git status ^(code !zapcmdCode!^))) & if \"!zapcmdFailedCount!\"==\"0\" (echo [zapcmd][queue][done] total: 1) else (echo [zapcmd][queue][failed] total: 1, failed: !zapcmdFailedCount!)",
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
      persistCorrectedTerminal,
      execution
    } = createExecutionHarness("ghost");
    availableTerminals.value = [{ id: "cmd", label: "Command Prompt", path: "cmd.exe" }];

    await execution.runCommandInTerminal("dir");

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

    await execution.runCommandInTerminal("dir");

    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        terminalReusePolicy: "normal-only"
      })
    );
  });
});
