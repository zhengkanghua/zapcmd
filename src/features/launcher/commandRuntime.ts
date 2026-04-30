import type {
  CommandArg,
  CommandTemplate,
  ResolvedCommandExecution
} from "../commands/commandTemplates";
import { t } from "../../i18n";
import type { RuntimeScriptRunner } from "../commands/runtimeTypes";

export interface ResolvedCommandExecutionResult {
  renderedPreview: string;
  execution: ResolvedCommandExecution;
}

export function getCommandArgs(command: CommandTemplate): CommandArg[] {
  if (command.args && command.args.length > 0) {
    return command.args;
  }

  if (!command.needsArgs) {
    return [];
  }

  return [
    {
      key: "value",
      label: command.argLabel ?? t("command.argFallbackLabel"),
      token: command.argToken ?? "{{value}}",
      placeholder: command.argPlaceholder,
      required: true,
      defaultValue: command.argPlaceholder
    }
  ];
}

function collapsePreviewWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function resolveArgValue(arg: CommandArg, argValues?: Record<string, string>): string {
  const rawValue = argValues?.[arg.key] ?? "";
  const fallback =
    arg.defaultValue ?? (arg.required === false ? "" : arg.placeholder ?? "value");
  return rawValue.trim() || fallback;
}

function replaceArgTokens(
  value: string,
  args: CommandArg[],
  resolvedValues: Record<string, string>
): string {
  let rendered = value;
  for (const arg of args) {
    rendered = rendered.split(arg.token).join(resolvedValues[arg.key] ?? "");
  }
  return rendered;
}

function quotePosixSingleQuoted(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function quotePowerShellSingleQuoted(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function quoteCmdArgument(value: string): string {
  return `"${value.replaceAll("^", "^^").replaceAll("\"", "\\\"")}"`;
}

function quoteScriptArgValue(runner: RuntimeScriptRunner, value: string): string {
  if (runner === "powershell" || runner === "pwsh") {
    return quotePowerShellSingleQuoted(value);
  }
  if (runner === "cmd") {
    return quoteCmdArgument(value);
  }
  return quotePosixSingleQuoted(value);
}

function replaceScriptArgTokens(
  value: string,
  runner: RuntimeScriptRunner,
  args: CommandArg[],
  resolvedValues: Record<string, string>
): string {
  let rendered = value;
  for (const arg of args) {
    const replacement = quoteScriptArgValue(runner, resolvedValues[arg.key] ?? "");
    rendered = rendered.split(`"${arg.token}"`).join(replacement);
    rendered = rendered.split(`'${arg.token}'`).join(replacement);
    rendered = rendered.split(arg.token).join(replacement);
  }
  return rendered;
}

function normalizeExecArgument(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 2) {
    return trimmed;
  }

  const startsWithDouble = trimmed.startsWith("\"") && trimmed.endsWith("\"");
  const startsWithSingle = trimmed.startsWith("'") && trimmed.endsWith("'");
  if (startsWithDouble || startsWithSingle) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function requireStructuredExecution(command: CommandTemplate): NonNullable<CommandTemplate["execution"]> {
  if (!command.execution) {
    throw new Error(`Command "${command.id}" is missing structured execution.`);
  }
  return command.execution;
}

function buildResolvedArgValues(
  command: CommandTemplate,
  argValues?: Record<string, string>
): { args: CommandArg[]; values: Record<string, string> } {
  const args = getCommandArgs(command);
  const values = args.reduce<Record<string, string>>((acc, arg) => {
    acc[arg.key] = resolveArgValue(arg, argValues);
    return acc;
  }, {});
  return { args, values };
}

function resolveExecCommand(
  program: string,
  args: string[],
  stdinArgKey: string | undefined,
  commandArgs: CommandArg[],
  resolvedValues: Record<string, string>
): ResolvedCommandExecutionResult {
  const renderedProgram = replaceArgTokens(program, commandArgs, resolvedValues).trim();
  const previewArgs = args
    .map((item) => replaceArgTokens(item, commandArgs, resolvedValues).trim())
    .filter((item) => item.length > 0);
  const stdin = stdinArgKey ? resolvedValues[stdinArgKey] : undefined;

  return {
    renderedPreview: collapsePreviewWhitespace([renderedProgram, ...previewArgs].join(" ")),
    execution: {
      kind: "exec",
      program: renderedProgram,
      args: previewArgs
        .map((item) => normalizeExecArgument(item))
        .filter((item) => item.length > 0),
      stdinArgKey,
      stdin
    }
  };
}

function resolveScriptCommand(
  runner: Extract<ResolvedCommandExecution, { kind: "script" }>["runner"],
  command: string,
  commandArgs: CommandArg[],
  resolvedValues: Record<string, string>
): ResolvedCommandExecutionResult {
  const renderedCommand = replaceScriptArgTokens(command, runner, commandArgs, resolvedValues).trim();
  return {
    renderedPreview: collapsePreviewWhitespace(`${runner}: ${renderedCommand}`),
    execution: {
      kind: "script",
      runner,
      command: renderedCommand
    }
  };
}

export function resolveCommandExecution(
  command: CommandTemplate,
  argValues?: Record<string, string>
): ResolvedCommandExecutionResult {
  const structuredExecution = requireStructuredExecution(command);
  const { args, values } = buildResolvedArgValues(command, argValues);

  if (structuredExecution.kind === "exec") {
    return resolveExecCommand(
      structuredExecution.program,
      structuredExecution.args,
      structuredExecution.stdinArgKey,
      args,
      values
    );
  }

  return resolveScriptCommand(
    structuredExecution.runner,
    structuredExecution.command,
    args,
    values
  );
}

export function renderCommand(command: CommandTemplate, argValues?: Record<string, string>): string {
  return resolveCommandExecution(command, argValues).renderedPreview;
}

export function buildInitialArgValues(
  command: CommandTemplate,
  argValues?: Record<string, string>
): { args: CommandArg[]; values: Record<string, string> } {
  const args = getCommandArgs(command);
  const values = args.reduce<Record<string, string>>((acc, arg) => {
    const inputValue = argValues?.[arg.key];
    if (typeof inputValue === "string") {
      acc[arg.key] = inputValue;
      return acc;
    }
    acc[arg.key] = arg.defaultValue ?? "";
    return acc;
  }, {});

  return { args, values };
}
