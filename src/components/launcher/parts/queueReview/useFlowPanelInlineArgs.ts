import { nextTick, ref } from "vue";
import type { LauncherQueueReviewPanelProps } from "../../types";
import { validateCommandArgValue } from "../../../../features/security/commandArgValidation";
import { collectTrustedArgKeysFromExecution } from "../../../../features/security/commandSafety";

interface FlowPanelInlineArgsDeps {
  props: LauncherQueueReviewPanelProps;
  t: (key: string) => string;
  emitUpdateStagedArg: (id: string, key: string, value: string) => void;
  emitExecuteStaged: () => void;
  emitExecutionFeedback: (
    tone: "neutral" | "success" | "error",
    message: string
  ) => void;
}

export function useFlowPanelInlineArgs(deps: FlowPanelInlineArgsDeps) {
  const editingParam = ref<{
    cmdId: string;
    argKey: string;
    currentValue: string;
    originalValue: string;
  } | null>(null);
  const editingParamError = ref<string | null>(null);
  const paramEditInputRef = ref<HTMLInputElement | HTMLInputElement[] | null>(null);

  function focusParamInput(): void {
    void nextTick(() => {
      const el = paramEditInputRef.value;
      const input = Array.isArray(el) ? el[0] : el;
      if (input instanceof HTMLInputElement) {
        input.focus();
      }
    });
  }

  function resolveEditingArg(cmdId: string, argKey: string) {
    const command = deps.props.queuedCommands.find((item) => item.id === cmdId);
    return command?.args.find((arg) => arg.key === argKey) ?? null;
  }

  function validateEditingValue(cmdId: string, argKey: string, value: string): string | null {
    const command = deps.props.queuedCommands.find((item) => item.id === cmdId);
    const arg = resolveEditingArg(cmdId, argKey);
    if (!arg || !command) {
      return null;
    }
    return validateCommandArgValue(arg, value, {
      trustedArgKeys: collectTrustedArgKeysFromExecution(command.executionTemplate, command.args)
    });
  }

  function guardInvalidDraft(): boolean {
    if (!editingParam.value || !editingParamError.value) {
      return false;
    }
    deps.emitExecutionFeedback("error", editingParamError.value);
    focusParamInput();
    return true;
  }

  function startParamEdit(cmdId: string, argKey: string, currentValue: string): void {
    if (guardInvalidDraft()) {
      return;
    }
    editingParam.value = { cmdId, argKey, currentValue, originalValue: currentValue };
    editingParamError.value = null;
    focusParamInput();
  }

  function onParamEditInput(cmdId: string, argKey: string, value: string): void {
    if (editingParam.value) {
      editingParam.value.currentValue = value;
    }
    editingParamError.value = validateEditingValue(cmdId, argKey, value);
  }

  function commitParamEdit(cmdId: string, argKey: string): void {
    if (!editingParam.value) {
      return;
    }
    const newValue = editingParam.value.currentValue;
    const message = validateEditingValue(cmdId, argKey, newValue);
    if (message) {
      editingParamError.value = message;
      focusParamInput();
      return;
    }
    editingParamError.value = null;
    editingParam.value = null;
    deps.emitUpdateStagedArg(cmdId, argKey, newValue);
  }

  function cancelParamEdit(): void {
    if (!editingParam.value) {
      return;
    }
    const { cmdId, argKey, originalValue } = editingParam.value;
    editingParamError.value = null;
    editingParam.value = null;
    deps.emitUpdateStagedArg(cmdId, argKey, originalValue);
  }

  function onExecuteStagedClick(): void {
    if (guardInvalidDraft()) {
      return;
    }
    if (deps.props.flowOpen) {
      deps.emitExecutionFeedback("neutral", deps.t("execution.flowInProgress"));
      return;
    }
    deps.emitExecuteStaged();
  }

  async function copyCommand(command: string): Promise<void> {
    if (guardInvalidDraft()) {
      return;
    }
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("clipboard API unavailable");
      }
      await navigator.clipboard.writeText(command);
      deps.emitExecutionFeedback("success", deps.t("common.copied"));
    } catch (error) {
      console.error("copy command failed:", error);
      deps.emitExecutionFeedback("error", deps.t("common.copyFailed"));
    }
  }

  return {
    editingParam,
    editingParamError,
    paramEditInputRef,
    guardInvalidDraft,
    focusParamInput,
    startParamEdit,
    onParamEditInput,
    commitParamEdit,
    cancelParamEdit,
    onExecuteStagedClick,
    copyCommand
  };
}
