import { nextTick } from "vue";
import type { CommandTemplate } from "../../../features/commands/commandTemplates";
import { t } from "../../../i18n";
import {
  buildInitialArgValues,
  getCommandArgs,
  renderCommand
} from "../../../features/launcher/commandRuntime";
import type { StagedCommand } from "../../../features/launcher/types";
import type { CommandExecutionState, UseCommandExecutionOptions } from "./model";

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }
  return fallback;
}

export function summarizeCommandForFeedback(command: string): string {
  const collapsed = command.replace(/\s+/g, " ").trim();
  if (!collapsed) {
    return t("execution.emptyCommand");
  }

  const maxLength = 84;
  return collapsed.length > maxLength ? `${collapsed.slice(0, maxLength)}...` : collapsed;
}

export function shouldRejectPendingSubmit(
  command: CommandTemplate,
  pendingArgValues: Record<string, string>
): boolean {
  const args = getCommandArgs(command);
  return args.some((arg) => {
    if (arg.required === false) {
      return false;
    }
    const value = pendingArgValues[arg.key]?.trim() ?? "";
    return value.length === 0;
  });
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
    await options.runCommandInTerminal(rendered);
    state.setExecutionFeedback(
      "success",
      t("execution.sentToTerminal", {
        command: summarizeCommandForFeedback(rendered)
      })
    );
  } catch (error) {
    console.error("command execution failed:", error);
    state.setExecutionFeedback(
      "error",
      t("execution.failed", {
        reason: toErrorMessage(error, t("execution.failedFallback"))
      })
    );
  } finally {
    state.executing.value = false;
    options.scheduleSearchInputFocus(false);
  }
}

export function appendToStaging(
  options: UseCommandExecutionOptions,
  state: CommandExecutionState,
  command: CommandTemplate,
  argValues?: Record<string, string>
): void {
  const wasEmpty = options.stagedCommands.value.length === 0;
  options.stagedCommands.value.push(buildStagedCommand(command, argValues));

  if (wasEmpty) {
    options.openStagingDrawer();
  }
  options.clearSearchQueryAndSelection();
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
