import { getCurrentScope, onScopeDispose, ref } from "vue";

interface UseStagedFeedbackOptions {
  durationMs?: number;
}

export function useStagedFeedback(options: UseStagedFeedbackOptions = {}) {
  const durationMs = options.durationMs ?? 220;
  const stagedFeedbackCommandId = ref<string | null>(null);
  let stagedFeedbackTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  function clearStagedFeedbackTimer(): void {
    if (!stagedFeedbackTimer) {
      return;
    }
    clearTimeout(stagedFeedbackTimer);
    stagedFeedbackTimer = null;
  }

  function triggerStagedFeedback(commandId: string): void {
    if (disposed) {
      return;
    }
    clearStagedFeedbackTimer();
    stagedFeedbackCommandId.value = commandId;
    stagedFeedbackTimer = setTimeout(() => {
      if (disposed) {
        stagedFeedbackTimer = null;
        return;
      }
      stagedFeedbackCommandId.value = null;
      stagedFeedbackTimer = null;
    }, durationMs);
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      disposed = true;
      clearStagedFeedbackTimer();
    });
  }

  return {
    stagedFeedbackCommandId,
    triggerStagedFeedback,
    clearStagedFeedbackTimer
  };
}
