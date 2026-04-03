import { createCommandExecutionActions } from "./actions";
import type { UseCommandExecutionOptions } from "./model";
import { createCommandExecutionState } from "./state";

export function useCommandExecution(options: UseCommandExecutionOptions) {
  const state = createCommandExecutionState(options.feedbackDurationMs);
  const actions = createCommandExecutionActions(options, state);

  return {
    executing: state.executing,
    refreshingAllQueuedPreflight: state.refreshingAllQueuedPreflight,
    refreshingQueuedCommandIds: state.refreshingQueuedCommandIds,
    pendingCommand: state.pendingCommand,
    pendingSubmitMode: state.pendingSubmitMode,
    pendingArgValues: state.pendingArgValues,
    safetyDialog: state.safetyDialog,
    executionFeedbackMessage: state.executionFeedbackMessage,
    executionFeedbackTone: state.executionFeedbackTone,
    clearExecutionFeedbackTimer: state.clearExecutionFeedbackTimer,
    setExecutionFeedback: state.setExecutionFeedback,
    confirmSafetyExecution: state.confirmSafetyExecution,
    cancelSafetyExecution: state.cancelSafetyExecution,
    ...actions
  };
}

export type {
  CommandExecutionState,
  ExecutionFeedbackTone,
  ParamSubmitMode,
  UseCommandExecutionOptions
} from "./model";
