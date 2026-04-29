import { t } from "../../../i18n";
import type { StagedCommand } from "../../../features/launcher/types";
import { updateStagedResolvedCommand } from "./helpers";
import type { CommandExecutionState, UseCommandExecutionOptions } from "./model";
import { createPanelActions } from "./panel";
import { createQueueActions } from "./queue";
import { createSingleActions } from "./single";

export function createCommandExecutionActions(
  options: UseCommandExecutionOptions,
  state: CommandExecutionState
) {
  function clearStaging(): void {
    const count = options.stagedCommands.value.length;
    options.stagedCommands.value = [];
    if (count > 0) {
      state.setExecutionFeedback("neutral", t("launcher.flowCleared", { n: count }));
    }
  }

  const singleActions = createSingleActions(options, state);
  const queueActions = createQueueActions({
    options,
    state,
    rejectBlockingIssue: singleActions.rejectBlockingIssue
  });
  const panelActions = createPanelActions({
    options,
    state,
    requestSingleExecution: singleActions.requestSingleExecution,
    copyResult: singleActions.copyResult,
    stageCommandWithPreflight: queueActions.stageCommandWithPreflight,
    rejectBlockingIssue: singleActions.rejectBlockingIssue
  });

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

  return {
    ...panelActions,
    removeStagedCommand,
    updateStagedArg,
    clearStaging,
    executeStaged: queueActions.executeStaged,
    refreshQueuedCommandPreflight: queueActions.refreshQueuedCommandPreflight,
    refreshAllQueuedPreflight: queueActions.refreshAllQueuedPreflight
  };
}
