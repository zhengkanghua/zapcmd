import type {
  CommandArg,
  CommandExecutionTemplate,
  CommandTemplate
} from "./types";
import { getCurrentLocale } from "../../i18n";
import type { CommandPrerequisite } from "./prerequisiteTypes";
import type {
  RuntimeCommand,
  RuntimeCommandArg,
  RuntimeExecCommand,
  RuntimeCommandPrerequisite,
  RuntimeLocalizedText,
  RuntimeLocalizedTextOrString,
  RuntimeScriptCommand
} from "./runtimeTypes";

function getPreferredLocalizedText(value: RuntimeLocalizedText): string {
  const currentLocale = getCurrentLocale();
  const normalizedCurrent = currentLocale.toLowerCase();
  const shortCurrent = normalizedCurrent.split("-")[0];
  const preferredOrder = [
    currentLocale,
    normalizedCurrent,
    shortCurrent,
    "zh-CN",
    "zh",
    "en-US",
    "en"
  ];
  for (const key of preferredOrder) {
    const text = value[key];
    if (typeof text === "string" && text.trim().length > 0) {
      return text;
    }
  }

  const fallback = Object.values(value).find((text) => text.trim().length > 0);
  return fallback ?? "";
}

export function resolveRuntimeText(value: RuntimeLocalizedTextOrString | undefined): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (!value) {
    return "";
  }
  return getPreferredLocalizedText(value).trim();
}

function mapRuntimeArg(arg: RuntimeCommandArg): CommandArg {
  const validationPattern =
    typeof arg.validation?.pattern === "string" && arg.validation.pattern.trim().length > 0
      ? arg.validation.pattern.trim()
      : undefined;
  return {
    key: arg.key,
    label: resolveRuntimeText(arg.label) || arg.key,
    token: `{{${arg.key}}}`,
    placeholder: arg.placeholder,
    required: arg.required ?? false,
    defaultValue: arg.default,
    argType: arg.type,
    validationPattern,
    validationError: resolveRuntimeText(arg.validation?.errorMessage),
    min: arg.validation?.min,
    max: arg.validation?.max,
    options: Array.isArray(arg.validation?.options)
      ? arg.validation?.options.filter((item) => typeof item === "string" && item.trim().length > 0)
      : undefined
  };
}

function mapRuntimePrerequisite(
  prerequisite: RuntimeCommandPrerequisite
): CommandPrerequisite {
  return {
    id: prerequisite.id,
    type: prerequisite.type,
    required: prerequisite.required,
    check: prerequisite.check,
    installHint: resolveRuntimeText(prerequisite.installHint),
    fallbackCommandId: prerequisite.fallbackCommandId
  };
}

function extractFolder(command: RuntimeCommand): string {
  return `@_${command.category}`;
}

function isExecRuntimeCommand(
  command: RuntimeCommand
): command is RuntimeCommand & { exec: RuntimeExecCommand } {
  return command.exec !== undefined;
}

function collapsePreviewWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function deriveExecPreview(exec: RuntimeExecCommand): string {
  return collapsePreviewWhitespace([exec.program, ...exec.args].join(" "));
}

function deriveScriptPreview(script: RuntimeScriptCommand): string {
  const summary = collapsePreviewWhitespace(script.command);
  return collapsePreviewWhitespace(`${script.runner}: ${summary}`);
}

function mapRuntimeExecution(command: RuntimeCommand): CommandExecutionTemplate {
  if (isExecRuntimeCommand(command)) {
    return {
      kind: "exec",
      program: command.exec.program,
      args: [...command.exec.args],
      stdinArgKey: command.exec.stdinArgKey
    };
  }

  return {
    kind: "script",
    runner: command.script.runner,
    command: command.script.command
  };
}

export function mapRuntimeCommandToTemplate(command: RuntimeCommand): CommandTemplate {
  const args = (command.args ?? []).map(mapRuntimeArg);
  const prerequisites = (command.prerequisites ?? []).map(mapRuntimePrerequisite);
  const primaryArg = args[0];
  const title = resolveRuntimeText(command.name) || command.id;
  const description = resolveRuntimeText(command.description) || title;
  const execution = mapRuntimeExecution(command);
  const preview =
    execution.kind === "exec"
      ? deriveExecPreview(execution)
      : deriveScriptPreview(execution);

  return {
    id: command.id,
    title,
    description,
    preview,
    execution,
    folder: extractFolder(command),
    category: command.category,
    needsArgs: args.length > 0,
    argLabel: primaryArg?.label,
    argPlaceholder: primaryArg?.placeholder,
    argToken: primaryArg?.token,
    args: args.length > 0 ? args : undefined,
    prerequisites: prerequisites.length > 0 ? prerequisites : undefined,
    adminRequired: command.adminRequired,
    dangerous: command.dangerous ?? false
  };
}
