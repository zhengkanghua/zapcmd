import type { CommandTemplate } from "../../../features/commands/commandTemplates";
import { t } from "../../../i18n";
import {
  getCommandArgs,
  resolveCommandExecution
} from "../../../features/launcher/commandRuntime";
import type {
  StagedCommand,
  StagedCommandPreflightCache
} from "../../../features/launcher/types";
import {
  buildSafetyInputFromTemplate,
  checkQueueCommandSafety,
  checkSingleCommandSafety
} from "../../../features/security/commandSafety";
import { isDangerDismissed } from "../../../features/security/dangerDismiss";
import {
  appendToStaging,
  buildExecutionFailureFeedback,
  buildPreflightBlockedFeedback,
  collectBlockingPreflightIssues,
  collectWarningPreflightIssues,
  executeSingleCommand,
  getPendingSubmitRejection,
  runCommandPreflight,
  summarizeCommandForFeedback,
  updateStagedResolvedCommand
} from "./helpers";
import type { CommandExecutionState, ParamSubmitMode, UseCommandExecutionOptions } from "./model";
import {
  buildRefreshQueueFeedbackMessage,
  buildStageQueueFeedbackMessage,
  buildStagedPreflightCache,
  countQueuedCommandsWithPreflightIssues
} from "./stagedPreflightCache";

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

function createExecuteStagedAction(
  options: UseCommandExecutionOptions,
  state: CommandExecutionState,
  clearStaging: () => void
) {
  async function runStagedSnapshot(snapshot: StagedCommand[]): Promise<void> {
    state.executing.value = true;
    const steps = snapshot
      .map((item) => ({
        summary: item.renderedPreview.trim(),
        execution: item.execution
      }))
      .filter((item) => item.summary.length > 0);
    const requiresElevation = snapshot.some((item) => item.adminRequired === true);

    try {
      if (steps.length === 0) {
        throw new Error(t("execution.queueEmpty"));
      }

      state.setExecutionFeedback("success", t("launcher.executionStarted"));

      if (options.runCommandsInTerminal) {
        await options.runCommandsInTerminal(steps, { requiresElevation });
      } else {
        for (const step of steps) {
          await options.runCommandInTerminal(step, { requiresElevation });
        }
      }

      clearStaging();
      const firstCommand = summarizeCommandForFeedback(steps[0]?.summary ?? "");
      state.setExecutionFeedback(
        "success",
        t("execution.queueSuccess", {
          count: steps.length,
          firstCommand
        })
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
        renderedCommand: item.renderedPreview,
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
          await runStagedSnapshot(snapshot);
        }
      );
      return;
    }

    await runStagedSnapshot(snapshot);
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
  async function stageCommandWithPreflight(
    command: CommandTemplate,
    argValues?: Record<string, string>
  ): Promise<void> {
    const issues = hasPrerequisites(command.prerequisites)
      ? (
          await runCommandPreflight(options, command.prerequisites)
        )
          .filter((result) => result.ok !== true)
          .map((result, index) => ({
            prerequisite: command.prerequisites?.[index],
            result
          }))
      : [];
    const preflightCache = buildStagedPreflightCache(command.title, issues);

    appendToStaging(options, state, command, argValues, preflightCache);
    state.setExecutionFeedback(
      "success",
      buildStageQueueFeedbackMessage(preflightCache ? 1 : 0)
    );
  }

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
    void stageCommandWithPreflight(command);
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
    void stageCommandWithPreflight(command, values);
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

function createQueuedPreflightRefreshActions(
  options: UseCommandExecutionOptions,
  state: CommandExecutionState
) {
  async function collectCommandPreflightCache(
    title: string,
    prerequisites: StagedCommand["prerequisites"]
  ): Promise<StagedCommandPreflightCache | undefined> {
    const issues = hasPrerequisites(prerequisites)
      ? (
          await runCommandPreflight(options, prerequisites)
        )
          .filter((result) => result.ok !== true)
          .map((result, index) => ({
            title,
            prerequisite: prerequisites?.[index],
            result
          }))
      : [];

    return buildStagedPreflightCache(title, issues);
  }

  function createEmptyPreflightCache(): StagedCommandPreflightCache {
    return {
      checkedAt: Date.now(),
      issueCount: 0,
      source: "issues",
      issues: []
    };
  }

  function updateQueuedPreflightCache(
    commandId: string,
    cache: StagedCommandPreflightCache | undefined
  ): void {
    options.stagedCommands.value = options.stagedCommands.value.map((cmd: StagedCommand) =>
      cmd.id === commandId
        ? {
            ...cmd,
            preflightCache: cache
          }
        : cmd
    );
  }

  async function refreshQueuedCommandPreflight(id: string): Promise<void> {
    const target = options.stagedCommands.value.find((cmd) => cmd.id === id);
    if (!target) {
      return;
    }

    state.refreshingQueuedCommandIds.value = Array.from(
      new Set([...state.refreshingQueuedCommandIds.value, id])
    );
    try {
      const cache =
        (await collectCommandPreflightCache(target.title, target.prerequisites)) ??
        createEmptyPreflightCache();
      updateQueuedPreflightCache(id, cache);
      state.setExecutionFeedback(
        "success",
        buildRefreshQueueFeedbackMessage(
          countQueuedCommandsWithPreflightIssues(options.stagedCommands.value)
        )
      );
    } finally {
      state.refreshingQueuedCommandIds.value = state.refreshingQueuedCommandIds.value.filter(
        (item) => item !== id
      );
    }
  }

  async function refreshAllQueuedPreflight(): Promise<void> {
    if (state.refreshingAllQueuedPreflight.value || options.stagedCommands.value.length === 0) {
      return;
    }

    const snapshot = [...options.stagedCommands.value];
    state.refreshingAllQueuedPreflight.value = true;
    state.refreshingQueuedCommandIds.value = snapshot.map((item) => item.id);
    try {
      const nextCaches = await Promise.all(
        snapshot.map(async (item) => ({
          id: item.id,
          cache:
            (await collectCommandPreflightCache(item.title, item.prerequisites)) ??
            createEmptyPreflightCache()
        }))
      );

      const cacheMap = new Map(nextCaches.map((item) => [item.id, item.cache]));
      options.stagedCommands.value = options.stagedCommands.value.map((cmd: StagedCommand) => ({
        ...cmd,
        preflightCache: cacheMap.get(cmd.id) ?? cmd.preflightCache
      }));
      state.setExecutionFeedback(
        "success",
        buildRefreshQueueFeedbackMessage(
          countQueuedCommandsWithPreflightIssues(options.stagedCommands.value)
        )
      );
    } finally {
      state.refreshingAllQueuedPreflight.value = false;
      state.refreshingQueuedCommandIds.value = [];
    }
  }

  return {
    refreshQueuedCommandPreflight,
    refreshAllQueuedPreflight
  };
}

export function createCommandExecutionActions(
  options: UseCommandExecutionOptions,
  state: CommandExecutionState
) {
  const queuedPreflightRefreshActions = createQueuedPreflightRefreshActions(options, state);

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
        ...updateStagedResolvedCommand(cmd, nextValues)
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
    executeStaged,
    refreshQueuedCommandPreflight:
      queuedPreflightRefreshActions.refreshQueuedCommandPreflight,
    refreshAllQueuedPreflight:
      queuedPreflightRefreshActions.refreshAllQueuedPreflight
  };
}
