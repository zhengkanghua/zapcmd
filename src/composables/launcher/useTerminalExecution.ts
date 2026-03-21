import type { Ref } from "vue";
import type { CommandExecutor } from "../../services/commandExecutor";

interface UseTerminalExecutionOptions {
  commandExecutor: CommandExecutor;
  defaultTerminal: Ref<string>;
  alwaysElevatedTerminal: Ref<boolean>;
}

interface TerminalExecutionOptions {
  requiresElevation?: boolean;
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

/**
 * 构造 PowerShell 路径的失败判断片段。
 * @param label 失败提示前缀，会和命令摘要拼成最终尾标。
 * @param hint 命令摘要，用于在终端里标识失败来源。
 * @param failedCountVar 批量模式下的失败计数变量名；传入后会先累加计数。
 * @returns 可直接拼到 payload 里的 PowerShell 条件失败片段。
 */
function buildPowerShellFailureClause(
  label: string,
  hint: string,
  failedCountVar?: string,
): string {
  const escapedLabel = escapePowerShellSingleQuotedLiteral(label);
  const escapedHint = escapePowerShellSingleQuotedLiteral(hint);
  const counter = failedCountVar ? `${failedCountVar} += 1; ` : "";
  return `$zapcmdSuccess = $?; $zapcmdCode = $LASTEXITCODE; if (-not $zapcmdSuccess) { ${counter}if ($null -ne $zapcmdCode) { Write-Host ('${escapedLabel}${escapedHint} (code ' + $zapcmdCode + ')') } else { Write-Host '${escapedLabel}${escapedHint}' } }`;
}

/**
 * 构造 cmd/wt 路径的失败判断片段。
 * @param label 失败提示前缀，会和命令摘要拼成最终尾标。
 * @param hint 命令摘要，用于在终端里标识失败来源。
 * @param failedCountExpression 批量模式下失败时先执行的计数表达式。
 * @returns 可直接拼到 payload 里的 cmd 条件失败片段。
 */
function buildCmdFailureClause(
  label: string,
  hint: string,
  failedCountExpression?: string,
): string {
  if (!failedCountExpression) {
    return `set "zapcmdCode=!ERRORLEVEL!" & if not "!zapcmdCode!"=="0" echo ${label}${hint} (code !zapcmdCode!)`;
  }

  return `set "zapcmdCode=!ERRORLEVEL!" & (if not "!zapcmdCode!"=="0" (${failedCountExpression} & echo ${label}${hint} ^(code !zapcmdCode!^)))`;
}

/**
 * 按终端类型构造单条命令 payload。
 * @param terminalId 当前默认终端标识。
 * @param command 已完成参数渲染的命令文本。
 * @returns 注入到终端的单条命令 payload。
 */
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

/**
 * 按终端类型构造批量命令 payload。
 * @param terminalId 当前默认终端标识。
 * @param commands 已完成参数渲染的命令列表。
 * @returns 注入到终端的批量命令 payload；若队列为空则返回空串。
 */
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
      return `Write-Host '[zapcmd][${step}/${total}][run] ${hint}'; $LASTEXITCODE = $null; ${command}; ${buildPowerShellFailureClause(`[zapcmd][${step}/${total}][failed] `, hint, "$zapcmdFailedCount")}`;
    });
    return `$zapcmdFailedCount = 0; ${steps.join("; ")}; if ($zapcmdFailedCount -eq 0) { Write-Host '[zapcmd][queue][done] total: ${total}' } else { Write-Host ('[zapcmd][queue][failed] total: ${total}, failed: ' + $zapcmdFailedCount) }`;
  }
  if (isCmdTerminal(terminalId)) {
    const steps = normalized.map((command, index) => {
      const step = index + 1;
      const hint = summarizeCommand(terminalId, command);
      return `echo [zapcmd][${step}/${total}][run] ${hint} & ${command} & ${buildCmdFailureClause(`[zapcmd][${step}/${total}][failed] `, hint, "set /a zapcmdFailedCount+=1 >nul")}`;
    });
    return `setlocal EnableDelayedExpansion & set /a zapcmdFailedCount=0 >nul & ${steps.join(" & ")} & if "!zapcmdFailedCount!"=="0" (echo [zapcmd][queue][done] total: ${total}) else (echo [zapcmd][queue][failed] total: ${total}, failed: !zapcmdFailedCount!)`;
  }
  const steps = normalized.map((command, index) => {
    const step = index + 1;
    const hint = summarizeCommand(terminalId, command);
    return `echo "[zapcmd] [${step}/${total}] executing: ${hint}"; ${command}; echo "[zapcmd] [${step}/${total}] finished"`;
  });
  return `${steps.join("; ")}; echo "[zapcmd] queue finished, total: ${total}"`;
}

/**
 * 暴露单条与批量终端执行入口，并在执行前注入与终端类型匹配的提示 contract。
 * @param options 命令执行器与默认终端引用。
 * @returns 终端执行相关的组合式 API。
 */
export function useTerminalExecution(options: UseTerminalExecutionOptions) {
  async function runCommandInTerminal(
    renderedCommand: string,
    executionOptions: TerminalExecutionOptions = {}
  ): Promise<void> {
    const normalized = renderedCommand.trim();
    if (normalized.length === 0) {
      throw new Error("Command cannot be empty.");
    }

    const terminalId = options.defaultTerminal.value;
    const command = buildSingleCommandPayload(terminalId, normalized);
    await options.commandExecutor.run({
      terminalId,
      command,
      requiresElevation: executionOptions.requiresElevation === true,
      alwaysElevated: options.alwaysElevatedTerminal.value
    });
  }

  async function runCommandsInTerminal(
    renderedCommands: string[],
    executionOptions: TerminalExecutionOptions = {}
  ): Promise<void> {
    const terminalId = options.defaultTerminal.value;
    const command = buildBatchCommandPayload(terminalId, renderedCommands);
    if (!command) {
      throw new Error("No executable commands in queue.");
    }

    await options.commandExecutor.run({
      terminalId,
      command,
      requiresElevation: executionOptions.requiresElevation === true,
      alwaysElevated: options.alwaysElevatedTerminal.value
    });
  }

  return {
    runCommandInTerminal,
    runCommandsInTerminal
  };
}
