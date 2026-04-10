import type { CommandTemplate } from "../../../features/commands/commandTemplates";
import type { StagedCommand } from "../../../features/launcher/types";
import { t } from "../../../i18n";
import { checkQueueCommandSafety } from "../../../features/security/commandSafety";
import {
  appendToStaging,
  buildExecutionFailureFeedback,
  summarizeCommandForFeedback
} from "./helpers";
import type { CommandExecutionState, UseCommandExecutionOptions } from "./model";
import {
  collectCommandPreflightCache,
  createEmptyPreflightCache,
  hasPrerequisites
} from "./preflight";
import {
  buildRefreshQueueFeedbackMessage,
  buildStageQueueFeedbackMessage,
  countQueuedCommandsWithPreflightIssues
} from "./stagedPreflightCache";

interface QueueActionDeps {
  options: UseCommandExecutionOptions;
  state: CommandExecutionState;
  clearStaging: () => void;
  rejectBlockingIssue: (
    command: Pick<CommandTemplate, "blockingIssue"> | Pick<StagedCommand, "blockingIssue"> | null,
    mode: "single" | "queue"
  ) => boolean;
}

type QueueActionContext = Pick<QueueActionDeps, "options" | "state">;

function createStageCommandWithPreflight({
  options,
  state,
  rejectBlockingIssue
}: Pick<QueueActionDeps, "options" | "state" | "rejectBlockingIssue">) {
  return async function stageCommandWithPreflight(
    command: CommandTemplate,
    argValues?: Record<string, string>
  ): Promise<void> {
    if (rejectBlockingIssue(command, "single")) {
      return;
    }

    const preflightCache = hasPrerequisites(command.prerequisites)
      ? await collectCommandPreflightCache(options, command.title, command.prerequisites)
      : undefined;

    appendToStaging(options, state, command, argValues, preflightCache);
    state.setExecutionFeedback(
      "success",
      buildStageQueueFeedbackMessage(preflightCache ? 1 : 0)
    );
  };
}

async function runStagedSnapshot(
  {
    options,
    state,
    clearStaging
  }: Pick<QueueActionDeps, "options" | "state" | "clearStaging">,
  snapshot: StagedCommand[]
): Promise<void> {
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

function createExecuteStagedAction({
  options,
  state,
  clearStaging,
  rejectBlockingIssue
}: QueueActionDeps) {
  return async function executeStaged(): Promise<void> {
    if (options.stagedCommands.value.length === 0 || state.executing.value) {
      return;
    }
    if (state.pendingCommand.value !== null || state.safetyDialog.value !== null) {
      state.setExecutionFeedback("neutral", t("execution.flowInProgress"));
      return;
    }

    const snapshot = [...options.stagedCommands.value];
    if (snapshot.some((item) => rejectBlockingIssue(item, "queue"))) {
      return;
    }

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
        async () => runStagedSnapshot({ options, state, clearStaging }, snapshot)
      );
      return;
    }

    await runStagedSnapshot({ options, state, clearStaging }, snapshot);
  };
}

function updateQueuedPreflightCache(
  options: UseCommandExecutionOptions,
  id: string,
  cache: StagedCommand["preflightCache"]
): void {
  options.stagedCommands.value = options.stagedCommands.value.map((command: StagedCommand) =>
    command.id === id
      ? {
          ...command,
          preflightCache: cache
        }
      : command
  );
}

function createQueuedPreflightRefreshActions({
  options,
  state
}: QueueActionContext) {
  async function refreshQueuedCommandPreflight(id: string): Promise<void> {
    const target = options.stagedCommands.value.find((command) => command.id === id);
    if (!target) {
      return;
    }

    state.refreshingQueuedCommandIds.value = Array.from(
      new Set([...state.refreshingQueuedCommandIds.value, id])
    );
    try {
      const cache =
        (await collectCommandPreflightCache(options, target.title, target.prerequisites)) ??
        createEmptyPreflightCache();
      updateQueuedPreflightCache(options, id, cache);
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
            (await collectCommandPreflightCache(options, item.title, item.prerequisites)) ??
            createEmptyPreflightCache()
        }))
      );

      const cacheMap = new Map(nextCaches.map((item) => [item.id, item.cache]));
      options.stagedCommands.value = options.stagedCommands.value.map((command: StagedCommand) => ({
        ...command,
        preflightCache: cacheMap.get(command.id) ?? command.preflightCache
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

export function createQueueActions(params: QueueActionDeps) {
  return {
    stageCommandWithPreflight: createStageCommandWithPreflight(params),
    executeStaged: createExecuteStagedAction(params),
    ...createQueuedPreflightRefreshActions(params)
  };
}
