import { nextTick } from "vue";
import type { CommandTemplate } from "../../../features/commands/commandTemplates";
import { t } from "../../../i18n";
import { CommandExecutionError } from "../../../services/commandExecutor";
import {
  buildInitialArgValues,
  getCommandArgs,
  renderCommand
} from "../../../features/launcher/commandRuntime";
import type { StagedCommand } from "../../../features/launcher/types";
import type { CommandExecutionState, UseCommandExecutionOptions } from "./model";

type ExecutionFailureKind = "terminal-unavailable" | "invalid-params" | "blocked" | "unknown";

const TERMINAL_UNAVAILABLE_MARKERS = [
  "terminal unavailable",
  "terminal not found",
  "enoent",
  "not recognized as an internal or external command",
  "command not found",
  "终端不可用",
  "未检测到可用终端",
  "找不到终端"
];
const INVALID_PARAMS_MARKERS = [
  "required",
  "不能为空",
  "invalid argument",
  "invalid parameter",
  "参数",
  "not in allowed options",
  "does not match"
];
const BLOCKED_MARKERS = ["blocked", "拦截", "injection", "注入"];

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }
  return fallback;
}

function includesAny(input: string, markers: string[]): boolean {
  return markers.some((marker) => input.includes(marker));
}

function classifyExecutionFailure(reason: string): ExecutionFailureKind {
  const normalized = reason.trim().toLowerCase();
  if (includesAny(normalized, TERMINAL_UNAVAILABLE_MARKERS)) {
    return "terminal-unavailable";
  }
  if (includesAny(normalized, INVALID_PARAMS_MARKERS)) {
    return "invalid-params";
  }
  if (includesAny(normalized, BLOCKED_MARKERS)) {
    return "blocked";
  }
  return "unknown";
}

function mapFailureKindToNextStep(kind: ExecutionFailureKind): string {
  if (kind === "terminal-unavailable") {
    return t("execution.nextStepTerminalUnavailable");
  }
  if (kind === "invalid-params") {
    return t("execution.nextStepInvalidParams");
  }
  if (kind === "blocked") {
    return t("execution.nextStepBlocked");
  }
  return t("execution.nextStepUnknown");
}

function formatFailureMessage(
  reason: string,
  kind: ExecutionFailureKind,
  mode: "single" | "queue"
): string {
  const nextStep = mapFailureKindToNextStep(kind);
  if (mode === "queue") {
    return t("execution.queueFailedWithNextStep", {
      reason,
      nextStep
    });
  }
  return t("execution.failedWithNextStep", {
    reason,
    nextStep
  });
}

function resolveStructuredExecutionFeedback(error: unknown): string | null {
  if (!(error instanceof CommandExecutionError)) {
    return null;
  }
  if (error.code === "elevation-cancelled") {
    return t("execution.elevationCancelled");
  }
  if (error.code === "elevation-launch-failed") {
    return t("execution.elevationLaunchFailed");
  }
  if (error.code === "terminal-launch-failed") {
    return t("execution.terminalLaunchFailed");
  }
  return null;
}

export function buildExecutionFailureFeedback(error: unknown, mode: "single" | "queue"): string {
  const structuredFeedback = resolveStructuredExecutionFeedback(error);
  if (structuredFeedback) {
    return structuredFeedback;
  }
  const fallback = mode === "queue" ? t("execution.queueFailedFallback") : t("execution.failedFallback");
  const reason = toErrorMessage(error, fallback);
  return formatFailureMessage(reason, classifyExecutionFailure(reason), mode);
}

export function summarizeCommandForFeedback(command: string): string {
  const collapsed = command.replace(/\s+/g, " ").trim();
  if (!collapsed) {
    return t("execution.emptyCommand");
  }

  const maxLength = 84;
  return collapsed.length > maxLength ? `${collapsed.slice(0, maxLength)}...` : collapsed;
}

export interface PendingSubmitRejection {
  reason: string;
  nextStep: string;
}

export function getPendingSubmitRejection(
  command: CommandTemplate,
  pendingArgValues: Record<string, string>
): PendingSubmitRejection | null {
  const args = getCommandArgs(command);
  for (const arg of args) {
    if (arg.required === false) {
      continue;
    }
    const value = pendingArgValues[arg.key]?.trim() ?? "";
    if (value.length === 0) {
      return {
        reason: t("safety.validation.required", { label: arg.label }),
        nextStep: t("execution.nextStepInvalidParams")
      };
    }
  }
  return null;
}

function buildStagedCommand(
  command: CommandTemplate,
  argValues?: Record<string, string>
): StagedCommand {
  const { args, values } = buildInitialArgValues(command, argValues);
  return {
    id: `${command.id}-${Date.now()}`,
    title: command.title,
    rawPreview: command.preview,
    renderedCommand: renderCommand(command, values),
    args,
    argValues: values,
    adminRequired: command.adminRequired ?? false,
    dangerous: command.dangerous ?? false
  };
}

export async function executeSingleCommand(
  options: UseCommandExecutionOptions,
  state: CommandExecutionState,
  command: CommandTemplate,
  argValues?: Record<string, string>
): Promise<void> {
  if (state.executing.value) {
    return;
  }
  state.executing.value = true;
  const rendered = renderCommand(command, argValues);

  try {
    state.setExecutionFeedback("success", t("launcher.executionStarted"));
    await options.runCommandInTerminal(rendered, {
      requiresElevation: command.adminRequired === true
    });
    state.setExecutionFeedback(
      "success",
      t("execution.sentToTerminal", {
        command: summarizeCommandForFeedback(rendered)
      })
    );
  } catch (error) {
    console.error("command execution failed:", error);
    state.setExecutionFeedback("error", buildExecutionFailureFeedback(error, "single"));
  } finally {
    state.executing.value = false;
    options.scheduleSearchInputFocus(true);
  }
}

export function appendToStaging(
  options: UseCommandExecutionOptions,
  state: CommandExecutionState,
  command: CommandTemplate,
  argValues?: Record<string, string>
): void {
  options.stagedCommands.value.push(buildStagedCommand(command, argValues));
  state.setExecutionFeedback("success", t("launcher.flowAdded"));
  options.scheduleSearchInputFocus(true);
  options.triggerStagedFeedback(command.id);

  if (options.focusZone.value === "staging") {
    options.stagingActiveIndex.value = options.stagedCommands.value.length - 1;
    void nextTick(() => options.ensureActiveStagingVisible());
  }
}

export function updateStagedRenderedCommand(
  cmd: StagedCommand,
  nextValues: Record<string, string>
): string {
  const command: CommandTemplate = {
    id: cmd.id,
    title: cmd.title,
    description: "",
    preview: cmd.rawPreview,
    folder: "",
    category: "",
    needsArgs: cmd.args.length > 0,
    args: cmd.args,
    adminRequired: cmd.adminRequired ?? false,
    dangerous: cmd.dangerous ?? false
  };
  return renderCommand(command, nextValues);
}
