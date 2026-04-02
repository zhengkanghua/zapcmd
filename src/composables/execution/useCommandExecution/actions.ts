import type { CommandTemplate } from "../../../features/commands/commandTemplates";
import { t } from "../../../i18n";
import { getCommandArgs, renderCommand } from "../../../features/launcher/commandRuntime";
import type { StagedCommand } from "../../../features/launcher/types";
import {
  buildSafetyInputFromTemplate,
  checkQueueCommandSafety,
  checkSingleCommandSafety
} from "../../../features/security/commandSafety";
import { isDangerDismissed } from "../../../features/security/dangerDismiss";
import {
  appendToStaging,
  appendPreflightWarnings,
  buildExecutionFailureFeedback,
  buildPreflightBlockedFeedback,
  collectBlockingPreflightIssues,
  collectWarningPreflightIssues,
  type CommandPreflightIssue,
  executeSingleCommand,
  getPendingSubmitRejection,
  runCommandPreflight,
  summarizeCommandForFeedback,
  updateStagedRenderedCommand
} from "./helpers";
import type { CommandExecutionState, ParamSubmitMode, UseCommandExecutionOptions } from "./model";

function needsPanel(command: CommandTemplate): boolean {
  const hasArgs = getCommandArgs(command).length > 0;
  const isDangerous = command.dangerous === true;
  const dismissed = isDangerDismissed(command.id);
  return hasArgs || (isDangerous && !dismissed);
}

function hasPrerequisites(
  prerequisites: CommandTemplate["prerequisites"] | StagedCommand["prerequisites"]
): boolean {
  return Array.isArray(prerequisites) && prerequisites.length > 0;
}

async function collectQueuePreflightIssues(
  options: UseCommandExecutionOptions,
  snapshot: StagedCommand[]
): Promise<CommandPreflightIssue[]> {
  if (!options.runCommandPreflight || !snapshot.some((item) => hasPrerequisites(item.prerequisites))) {
    return [];
  }

  return (
    await Promise.all(
      snapshot.map(async (item) =>
        (
          await runCommandPreflight(options, item.prerequisites)
        ).map((result, index) => ({
          title: item.title,
          prerequisite: item.prerequisites?.[index],
          result
        }))
      )
    )
  ).flat();
}

function createExecuteStagedAction(
  options: UseCommandExecutionOptions,
  state: CommandExecutionState,
  clearStaging: () => void
) {
  async function runStagedSnapshot(
    snapshot: StagedCommand[],
    preflightWarnings: CommandPreflightIssue[] = []
  ): Promise<void> {
    state.executing.value = true;
    const commands = snapshot
      .map((item) => item.renderedCommand.trim())
      .filter((item) => item.length > 0);
    const requiresElevation = snapshot.some((item) => item.adminRequired === true);

    try {
      if (commands.length === 0) {
        throw new Error(t("execution.queueEmpty"));
      }

      state.setExecutionFeedback("success", t("launcher.executionStarted"));

      if (options.runCommandsInTerminal) {
        await options.runCommandsInTerminal(commands, { requiresElevation });
      } else {
        for (const rendered of commands) {
          await options.runCommandInTerminal(rendered, { requiresElevation });
        }
      }

      clearStaging();
      const firstCommand = summarizeCommandForFeedback(commands[0]);
      state.setExecutionFeedback(
        "success",
        appendPreflightWarnings(
          t("execution.queueSuccess", {
            count: commands.length,
            firstCommand
          }),
          preflightWarnings
        )
      );
    } catch (error) {
      console.error("queue execution failed:", error);
      state.setExecutionFeedback("error", buildExecutionFailureFeedback(error, "queue"));
    } finally {
      state.executing.value = false;
      options.scheduleSearchInputFocus(true);
    }
  }

  return async function executeStaged(): Promise<void> {
    if (options.stagedCommands.value.length === 0 || state.executing.value) {
      return;
    }
    if (state.pendingCommand.value !== null || state.safetyDialog.value !== null) {
      state.setExecutionFeedback("neutral", t("execution.flowInProgress"));
      return;
    }
    const snapshot = [...options.stagedCommands.value];
    const queueSafety = checkQueueCommandSafety(
      snapshot.map((item) => ({
        title: item.title,
        renderedCommand: item.renderedCommand,
        args: item.args,
        argValues: item.argValues,
        adminRequired: item.adminRequired ?? false,
        dangerous: item.dangerous ?? false
      }))
    );
    if (queueSafety.blockedMessage) {
      state.setExecutionFeedback(
        "error",
        t("execution.blockedWithNextStep", {
          reason: queueSafety.blockedMessage,
          nextStep: t("execution.nextStepBlocked")
        })
      );
      options.scheduleSearchInputFocus(false);
      return;
    }
    const preflightIssues = await collectQueuePreflightIssues(options, snapshot);
    const blockingPreflightIssues = collectBlockingPreflightIssues(preflightIssues);
    if (blockingPreflightIssues.length > 0) {
      state.setExecutionFeedback(
        "error",
        buildPreflightBlockedFeedback(blockingPreflightIssues)
      );
      options.scheduleSearchInputFocus(false);
      return;
    }
    const warningPreflightIssues = collectWarningPreflightIssues(preflightIssues);

    if (queueSafety.confirmationItems.length > 0) {
      state.requestSafetyConfirmation(
        {
          mode: "queue",
          title: t("execution.safetyQueueTitle"),
          description: t("execution.safetyQueueDescription", {
            count: queueSafety.confirmationItems.length
          }),
          items: queueSafety.confirmationItems
        },
        async () => {
          await runStagedSnapshot(snapshot, warningPreflightIssues);
        }
      );
      return;
    }

    await runStagedSnapshot(snapshot, warningPreflightIssues);
  };
}

function createSingleExecutionRequester(
  options: UseCommandExecutionOptions,
  state: CommandExecutionState
) {
  return async function requestSingleExecution(
    command: CommandTemplate,
    argValues?: Record<string, string>,
    skipDangerConfirmation = false
  ): Promise<void> {
    const args = getCommandArgs(command);
    const rendered = renderCommand(command, argValues);
    const safety = checkSingleCommandSafety(
      buildSafetyInputFromTemplate(command, rendered, argValues, args)
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
    const shouldRunPreflight = !!options.runCommandPreflight && hasPrerequisites(command.prerequisites);
    const preflightIssues = shouldRunPreflight
      ? (
          await runCommandPreflight(options, command.prerequisites)
        ).map((result, index) => ({
          prerequisite: command.prerequisites?.[index],
          result
        }))
      : [];
    const blockingPreflightIssues = collectBlockingPreflightIssues(preflightIssues);
    if (blockingPreflightIssues.length > 0) {
      state.setExecutionFeedback(
        "error",
        buildPreflightBlockedFeedback(blockingPreflightIssues)
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
              renderedCommand: summarizeCommandForFeedback(rendered),
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
  };
}

function createPendingCommandActions(
  options: UseCommandExecutionOptions,
  state: CommandExecutionState,
  requestSingleExecution: (
    command: CommandTemplate,
    argValues?: Record<string, string>,
    skipDangerConfirmation?: boolean
  ) => Promise<void>
) {
  function resetPendingCommand(): void {
    state.pendingCommand.value = null;
    state.pendingSubmitMode.value = "stage";
    state.pendingArgValues.value = {};
  }

  function openParamInput(command: CommandTemplate, submitMode: ParamSubmitMode): void {
    const args = getCommandArgs(command);
    state.pendingCommand.value = command;
    state.pendingSubmitMode.value = submitMode;
    state.pendingArgValues.value = args.reduce<Record<string, string>>((acc, arg) => {
      acc[arg.key] = arg.defaultValue ?? "";
      return acc;
    }, {});
  }

  function stageResult(command: CommandTemplate): void {
    if (needsPanel(command)) {
      openParamInput(command, "stage");
      options.onNeedPanel?.(command, "stage");
      return;
    }
    appendToStaging(options, state, command);
  }

  function executeResult(command: CommandTemplate): void {
    if (needsPanel(command)) {
      openParamInput(command, "execute");
      options.onNeedPanel?.(command, "execute");
      return;
    }
    void requestSingleExecution(command);
  }

  function submitParamInput(): boolean {
    const command = state.pendingCommand.value;
    if (!command) {
      return false;
    }
    const rejection = getPendingSubmitRejection(command, state.pendingArgValues.value);
    if (rejection) {
      state.setExecutionFeedback(
        "error",
        t(
          rejection.mode === "blocked"
            ? "execution.blockedWithNextStep"
            : "execution.failedWithNextStep",
          {
          reason: rejection.reason,
          nextStep: rejection.nextStep
          }
        )
      );
      return false;
    }
    const values = { ...state.pendingArgValues.value };
    const submitMode = state.pendingSubmitMode.value;

    if (submitMode === "execute") {
      resetPendingCommand();
      void requestSingleExecution(command, values, true);
      return true;
    }

    resetPendingCommand();
    appendToStaging(options, state, command, values);
    return true;
  }

  function cancelParamInput(): void {
    resetPendingCommand();
    options.scheduleSearchInputFocus(false);
  }

  function updatePendingArgValue(key: string, value: string): void {
    state.pendingArgValues.value = {
      ...state.pendingArgValues.value,
      [key]: value
    };
  }

  return {
    stageResult,
    executeResult,
    submitParamInput,
    cancelParamInput,
    updatePendingArgValue
  };
}

export function createCommandExecutionActions(
  options: UseCommandExecutionOptions,
  state: CommandExecutionState
) {
  const requestSingleExecution = createSingleExecutionRequester(options, state);
  const {
    stageResult,
    executeResult,
    submitParamInput,
    cancelParamInput,
    updatePendingArgValue
  } = createPendingCommandActions(options, state, requestSingleExecution);

  function removeStagedCommand(id: string): void {
    options.stagedCommands.value = options.stagedCommands.value.filter((cmd) => cmd.id !== id);
    if (options.stagingActiveIndex.value >= options.stagedCommands.value.length) {
      options.stagingActiveIndex.value = Math.max(0, options.stagedCommands.value.length - 1);
    }
    state.setExecutionFeedback("neutral", t("launcher.flowRemoved"));
  }

  function updateStagedArg(id: string, key: string, value: string): void {
    options.stagedCommands.value = options.stagedCommands.value.map((cmd: StagedCommand) => {
      if (cmd.id !== id || cmd.args.length === 0) {
        return cmd;
      }
      const nextValues = { ...cmd.argValues, [key]: value };
      return {
        ...cmd,
        argValues: nextValues,
        renderedCommand: updateStagedRenderedCommand(cmd, nextValues)
      };
    });
  }

  function clearStaging(): void {
    const count = options.stagedCommands.value.length;
    options.stagedCommands.value = [];
    if (count > 0) {
      state.setExecutionFeedback("neutral", t("launcher.flowCleared", { n: count }));
    }
  }
  const executeStaged = createExecuteStagedAction(options, state, clearStaging);

  return {
    stageResult,
    executeResult,
    submitParamInput,
    cancelParamInput,
    removeStagedCommand,
    updateStagedArg,
    updatePendingArgValue,
    clearStaging,
    executeStaged
  };
}
