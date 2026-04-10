import type { CommandTemplate } from "../../../features/commands/commandTemplates";
import { t } from "../../../i18n";
import { getCommandArgs } from "../../../features/launcher/commandRuntime";
import { isDangerDismissed } from "../../../features/security/dangerDismiss";
import { getPendingSubmitRejection } from "./helpers";
import type { CommandExecutionState, ParamSubmitMode, UseCommandExecutionOptions } from "./model";
import type { RejectBlockingIssue } from "./single";

interface PanelActionDeps {
  options: UseCommandExecutionOptions;
  state: CommandExecutionState;
  requestSingleExecution: (
    command: CommandTemplate,
    argValues?: Record<string, string>,
    skipDangerConfirmation?: boolean
  ) => Promise<void>;
  copyResult: (
    command: CommandTemplate,
    argValues?: Record<string, string>
  ) => Promise<void>;
  stageCommandWithPreflight: (
    command: CommandTemplate,
    argValues?: Record<string, string>
  ) => Promise<void>;
  rejectBlockingIssue: RejectBlockingIssue;
}

export function needsPanel(command: CommandTemplate, intent: ParamSubmitMode): boolean {
  const hasArgs = getCommandArgs(command).length > 0;
  if (intent === "copy" || intent === "stage") {
    return hasArgs;
  }
  const dismissed = isDangerDismissed(command.id);
  return hasArgs || (command.dangerous === true && !dismissed);
}

function resetPendingCommand(state: CommandExecutionState): void {
  state.pendingCommand.value = null;
  state.pendingSubmitIntent.value = "stage";
  state.pendingArgValues.value = {};
}

export function submitPendingIntent(params: {
  options: UseCommandExecutionOptions;
  state: CommandExecutionState;
  command: CommandTemplate;
  values: Record<string, string>;
  submitMode: ParamSubmitMode;
  requestSingleExecution: PanelActionDeps["requestSingleExecution"];
  copyResult: PanelActionDeps["copyResult"];
  stageCommandWithPreflight: PanelActionDeps["stageCommandWithPreflight"];
}): boolean {
  if (params.submitMode === "execute") {
    resetPendingCommand(params.state);
    void params.requestSingleExecution(params.command, params.values, true);
    return true;
  }

  if (params.submitMode === "copy") {
    resetPendingCommand(params.state);
    void params.copyResult(params.command, params.values);
    return true;
  }

  resetPendingCommand(params.state);
  void params.stageCommandWithPreflight(params.command, params.values);
  return true;
}

export function createPanelActions({
  options,
  state,
  requestSingleExecution,
  copyResult,
  stageCommandWithPreflight,
  rejectBlockingIssue
}: PanelActionDeps) {
  function openParamInput(command: CommandTemplate, submitMode: ParamSubmitMode): void {
    const args = getCommandArgs(command);
    state.pendingCommand.value = command;
    state.pendingSubmitIntent.value = submitMode;
    state.pendingArgValues.value = args.reduce<Record<string, string>>((acc, arg) => {
      acc[arg.key] = arg.defaultValue ?? "";
      return acc;
    }, {});
  }

  function stageResult(command: CommandTemplate): void {
    if (rejectBlockingIssue(command, "single")) {
      return;
    }
    if (needsPanel(command, "stage")) {
      openParamInput(command, "stage");
      options.onNeedPanel?.(command, "stage");
      return;
    }
    void stageCommandWithPreflight(command);
  }

  function executeResult(command: CommandTemplate): void {
    if (rejectBlockingIssue(command, "single")) {
      return;
    }
    if (needsPanel(command, "execute")) {
      openParamInput(command, "execute");
      options.onNeedPanel?.(command, "execute");
      return;
    }
    void requestSingleExecution(command);
  }

  async function dispatchCommandIntent(
    command: CommandTemplate,
    intent: ParamSubmitMode
  ): Promise<void> {
    if (rejectBlockingIssue(command, "single")) {
      return;
    }
    if (intent === "execute") {
      executeResult(command);
      return;
    }
    if (intent === "stage") {
      stageResult(command);
      return;
    }
    if (needsPanel(command, "copy")) {
      openParamInput(command, "copy");
      options.onNeedPanel?.(command, "copy");
      return;
    }
    await copyResult(command);
  }

  function submitParamInput(): boolean {
    const command = state.pendingCommand.value;
    if (!command) {
      return false;
    }
    if (rejectBlockingIssue(command, "single")) {
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

    return submitPendingIntent({
      options,
      state,
      command,
      values: { ...state.pendingArgValues.value },
      submitMode: state.pendingSubmitIntent.value,
      requestSingleExecution,
      copyResult,
      stageCommandWithPreflight
    });
  }

  function cancelParamInput(): void {
    resetPendingCommand(state);
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
    dispatchCommandIntent,
    openParamInput,
    submitParamInput,
    cancelParamInput,
    updatePendingArgValue
  };
}
