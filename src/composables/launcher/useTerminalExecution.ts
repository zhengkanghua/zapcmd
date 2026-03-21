import type { Ref } from "vue";
import type { CommandExecutor } from "../../services/commandExecutor";

interface UseTerminalExecutionOptions {
  commandExecutor: CommandExecutor;
  defaultTerminal: Ref<string>;
}

function collapseCommand(command: string): string {
  const collapsed = command.replace(/\s+/g, " ").trim();
  if (!collapsed) {
    return "command";
  }

  return collapsed;
}

function isPowerShellTerminal(terminalId: string): boolean {
  return terminalId === "powershell" || terminalId === "pwsh";
}

function isCmdTerminal(terminalId: string): boolean {
  return terminalId === "cmd" || terminalId === "wt";
}

function summarizeCommand(terminalId: string, command: string): string {
  const collapsed = collapseCommand(command);
  if (isPowerShellTerminal(terminalId)) {
    return collapsed.slice(0, 96);
  }

  const safe = collapsed.replace(/[^a-zA-Z0-9 _.:/\\\-+=,@#%()[\]{}]/g, "_");
  return safe.slice(0, 96);
}

function escapePowerShellSingleQuotedLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function buildPowerShellFailureClause(label: string, hint: string): string {
  const escapedLabel = escapePowerShellSingleQuotedLiteral(label);
  const escapedHint = escapePowerShellSingleQuotedLiteral(hint);
  return `$zapcmdSuccess = $?; $zapcmdCode = $LASTEXITCODE; if (-not $zapcmdSuccess) { if ($null -ne $zapcmdCode) { Write-Host ('${escapedLabel}${escapedHint} (code ' + $zapcmdCode + ')') } else { Write-Host '${escapedLabel}${escapedHint}' } }`;
}

function buildCmdFailureClause(label: string, hint: string): string {
  return `set "zapcmdCode=!ERRORLEVEL!" & if not "!zapcmdCode!"=="0" echo ${label}${hint} (code !zapcmdCode!)`;
}

function buildSingleCommandPayload(terminalId: string, command: string): string {
  const hint = summarizeCommand(terminalId, command);
  if (isPowerShellTerminal(terminalId)) {
    const escapedHint = escapePowerShellSingleQuotedLiteral(hint);
    return `Write-Host '[zapcmd][run] ${escapedHint}'; $LASTEXITCODE = $null; ${command}; ${buildPowerShellFailureClause("[zapcmd][failed] ", hint)}`;
  }
  if (isCmdTerminal(terminalId)) {
    return `setlocal EnableDelayedExpansion & echo [zapcmd][run] ${hint} & ${command} & ${buildCmdFailureClause("[zapcmd][failed] ", hint)}`;
  }
  return `echo "[zapcmd] executing: ${hint}"; ${command}; echo "[zapcmd] finished"`;
}

function buildBatchCommandPayload(terminalId: string, commands: string[]): string {
  const normalized = commands.map((item) => item.trim()).filter((item) => item.length > 0);
  if (normalized.length === 0) {
    return "";
  }

  const total = normalized.length;
  if (isPowerShellTerminal(terminalId)) {
    const steps = normalized.map((command, index) => {
      const step = index + 1;
      const hint = escapePowerShellSingleQuotedLiteral(summarizeCommand(terminalId, command));
      return `Write-Host '[zapcmd][${step}/${total}][run] ${hint}'; ${command}; Write-Host ('[zapcmd][${step}/${total}][exit ' + $LASTEXITCODE + '] ${hint}')`;
    });
    return `${steps.join("; ")}; Write-Host ('[zapcmd][queue][exit ' + $LASTEXITCODE + '] total: ${total}')`;
  }
  if (isCmdTerminal(terminalId)) {
    const steps = normalized.map((command, index) => {
      const step = index + 1;
      const hint = summarizeCommand(terminalId, command);
      return `echo [zapcmd][${step}/${total}][run] ${hint} & ${command} & echo [zapcmd][${step}/${total}][exit !ERRORLEVEL!] ${hint}`;
    });
    return `setlocal EnableDelayedExpansion & ${steps.join(" & ")} & echo [zapcmd][queue][exit !ERRORLEVEL!] total: ${total}`;
  }
  const steps = normalized.map((command, index) => {
    const step = index + 1;
    const hint = summarizeCommand(terminalId, command);
    return `echo "[zapcmd] [${step}/${total}] executing: ${hint}"; ${command}; echo "[zapcmd] [${step}/${total}] finished"`;
  });
  return `${steps.join("; ")}; echo "[zapcmd] queue finished, total: ${total}"`;
}

export function useTerminalExecution(options: UseTerminalExecutionOptions) {
  async function runCommandInTerminal(renderedCommand: string): Promise<void> {
    const normalized = renderedCommand.trim();
    if (normalized.length === 0) {
      throw new Error("Command cannot be empty.");
    }

    const terminalId = options.defaultTerminal.value;
    const command = buildSingleCommandPayload(terminalId, normalized);
    await options.commandExecutor.run({
      terminalId,
      command
    });
  }

  async function runCommandsInTerminal(renderedCommands: string[]): Promise<void> {
    const terminalId = options.defaultTerminal.value;
    const command = buildBatchCommandPayload(terminalId, renderedCommands);
    if (!command) {
      throw new Error("No executable commands in queue.");
    }

    await options.commandExecutor.run({
      terminalId,
      command
    });
  }

  return {
    runCommandInTerminal,
    runCommandsInTerminal
  };
}
