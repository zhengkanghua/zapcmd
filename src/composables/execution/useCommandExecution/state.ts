import { ref } from "vue";
import type { CommandExecutionState, ExecutionFeedbackTone } from "./model";

const DEFAULT_FEEDBACK_DURATION_MS = 3000;

export function createCommandExecutionState(feedbackDurationMs?: number): CommandExecutionState {
  const safetyDialog = ref<CommandExecutionState["safetyDialog"]["value"]>(null);
  const executionFeedbackMessage = ref("");
  const executionFeedbackTone = ref<ExecutionFeedbackTone>("neutral");
  const dismissDelay = feedbackDurationMs ?? DEFAULT_FEEDBACK_DURATION_MS;
  let executionFeedbackTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingSafetyConfirm: (() => Promise<void>) | null = null;

  function clearExecutionFeedbackTimer(): void {
    if (!executionFeedbackTimer) {
      return;
    }
    clearTimeout(executionFeedbackTimer);
    executionFeedbackTimer = null;
  }

  function setExecutionFeedback(
    tone: ExecutionFeedbackTone,
    message: string,
    autoDismiss = true
  ): void {
    clearExecutionFeedbackTimer();
    executionFeedbackTone.value = tone;
    executionFeedbackMessage.value = message;

    if (!autoDismiss || message.trim().length === 0) {
      return;
    }

    executionFeedbackTimer = setTimeout(() => {
      executionFeedbackMessage.value = "";
      executionFeedbackTone.value = "neutral";
      executionFeedbackTimer = null;
    }, dismissDelay);
  }

  function requestSafetyConfirmation(
    dialog: NonNullable<CommandExecutionState["safetyDialog"]["value"]>,
    onConfirm: () => Promise<void>
  ): void {
    pendingSafetyConfirm = onConfirm;
    safetyDialog.value = dialog;
  }

  async function confirmSafetyExecution(): Promise<void> {
    if (!pendingSafetyConfirm) {
      safetyDialog.value = null;
      return;
    }

    const run = pendingSafetyConfirm;
    pendingSafetyConfirm = null;
    safetyDialog.value = null;
    await run();
  }

  function cancelSafetyExecution(): void {
    pendingSafetyConfirm = null;
    safetyDialog.value = null;
  }

  return {
    executing: ref(false),
    pendingCommand: ref(null),
    pendingSubmitMode: ref("stage"),
    pendingArgValues: ref({}),
    safetyDialog,
    executionFeedbackMessage,
    executionFeedbackTone,
    clearExecutionFeedbackTimer,
    requestSafetyConfirmation,
    confirmSafetyExecution,
    cancelSafetyExecution,
    setExecutionFeedback
  };
}
