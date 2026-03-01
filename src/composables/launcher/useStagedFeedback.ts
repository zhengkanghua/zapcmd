import { ref } from "vue";

interface UseStagedFeedbackOptions {
  durationMs?: number;
}

export function useStagedFeedback(options: UseStagedFeedbackOptions = {}) {
  const durationMs = options.durationMs ?? 220;
  const stagedFeedbackCommandId = ref<string | null>(null);
  let stagedFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

  function clearStagedFeedbackTimer(): void {
    if (!stagedFeedbackTimer) {
      return;
    }
    clearTimeout(stagedFeedbackTimer);
    stagedFeedbackTimer = null;
  }

  function triggerStagedFeedback(commandId: string): void {
    clearStagedFeedbackTimer();
    stagedFeedbackCommandId.value = commandId;
    stagedFeedbackTimer = setTimeout(() => {
      stagedFeedbackCommandId.value = null;
      stagedFeedbackTimer = null;
    }, durationMs);
  }

  return {
    stagedFeedbackCommandId,
    triggerStagedFeedback,
    clearStagedFeedbackTimer
  };
}
