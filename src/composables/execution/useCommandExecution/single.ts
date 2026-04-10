import type { CommandTemplate } from "../../../features/commands/commandTemplates";
import type { StagedCommand } from "../../../features/launcher/types";
import { t } from "../../../i18n";
import {
  getCommandArgs,
  resolveCommandExecution
} from "../../../features/launcher/commandRuntime";
import {
  buildSafetyInputFromTemplate,
  checkSingleCommandSafety
} from "../../../features/security/commandSafety";
import { isDangerDismissed } from "../../../features/security/dangerDismiss";
import {
  buildCommandUnavailableFeedback,
  buildPreflightBlockedFeedback,
  collectBlockingPreflightIssues,
  collectWarningPreflightIssues,
  copyRenderedCommand,
  executeSingleCommand,
  summarizeCommandForFeedback
} from "./helpers";
import type { CommandExecutionState, UseCommandExecutionOptions } from "./model";
import { collectCommandPreflightIssues } from "./preflight";

type BlockingIssueSubject =
  | Pick<CommandTemplate, "blockingIssue">
  | Pick<StagedCommand, "blockingIssue">
  | null;

export type RejectBlockingIssue = (
  command: BlockingIssueSubject,
  mode: "single" | "queue"
) => boolean;

export function createSingleActions(
  options: UseCommandExecutionOptions,
  state: CommandExecutionState
) {
  const rejectBlockingIssue: RejectBlockingIssue = (command, mode) => {
    const issue = command?.blockingIssue;
    if (!issue) {
      return false;
    }

    state.setExecutionFeedback("error", buildCommandUnavailableFeedback(issue, mode));
    options.scheduleSearchInputFocus(false);
    return true;
  };

  async function requestSingleExecution(
    command: CommandTemplate,
    argValues?: Record<string, string>,
    skipDangerConfirmation = false
  ): Promise<void> {
    if (rejectBlockingIssue(command, "single")) {
      return;
    }

    const args = getCommandArgs(command);
    const resolved = resolveCommandExecution(command, argValues);
    const safety = checkSingleCommandSafety(
      buildSafetyInputFromTemplate(command, resolved.renderedPreview, argValues, args)
    );

    if (safety.blockedMessage) {
      state.setExecutionFeedback(
        "error",
        t("execution.blockedWithNextStep", {
          reason: safety.blockedMessage,
          nextStep: t("execution.nextStepBlocked")
        })
      );
      options.scheduleSearchInputFocus(false);
      return;
    }

    const preflightIssues = await collectCommandPreflightIssues(options, command.prerequisites);
    const blockingPreflightIssues = collectBlockingPreflightIssues(preflightIssues);
    if (blockingPreflightIssues.length > 0) {
      state.setExecutionFeedback(
        "error",
        buildPreflightBlockedFeedback(options, blockingPreflightIssues)
      );
      options.scheduleSearchInputFocus(false);
      return;
    }

    const warningPreflightIssues = collectWarningPreflightIssues(preflightIssues);

    if (
      !skipDangerConfirmation &&
      safety.confirmationReasons.length > 0 &&
      !isDangerDismissed(command.id)
    ) {
      state.requestSafetyConfirmation(
        {
          mode: "single",
          title: t("execution.safetySingleTitle"),
          description: t("execution.safetySingleDescription"),
          items: [
            {
              title: command.title,
              renderedCommand: summarizeCommandForFeedback(resolved.renderedPreview),
              reasons: safety.confirmationReasons
            }
          ]
        },
        async () => {
          await executeSingleCommand(
            options,
            state,
            command,
            argValues,
            warningPreflightIssues
          );
        }
      );
      return;
    }

    await executeSingleCommand(
      options,
      state,
      command,
      argValues,
      warningPreflightIssues
    );
  }

  async function copyResult(
    command: CommandTemplate,
    argValues?: Record<string, string>
  ): Promise<void> {
    if (rejectBlockingIssue(command, "single")) {
      return;
    }
    await copyRenderedCommand(options, state, command, argValues);
  }

  return {
    requestSingleExecution,
    copyResult,
    rejectBlockingIssue
  };
}
