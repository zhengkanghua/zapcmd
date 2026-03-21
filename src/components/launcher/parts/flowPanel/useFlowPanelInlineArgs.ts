import { nextTick, ref } from "vue";
import type { LauncherFlowPanelProps } from "../../types";

interface FlowPanelInlineArgsDeps {
  props: LauncherFlowPanelProps;
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
  const paramEditInputRef = ref<HTMLInputElement | HTMLInputElement[] | null>(null);

  function startParamEdit(cmdId: string, argKey: string, currentValue: string): void {
    editingParam.value = { cmdId, argKey, currentValue, originalValue: currentValue };
    void nextTick(() => {
      const el = paramEditInputRef.value;
      const input = Array.isArray(el) ? el[0] : el;
      if (input instanceof HTMLInputElement) {
        input.focus();
      }
    });
  }

  function onParamEditInput(cmdId: string, argKey: string, value: string): void {
    if (editingParam.value) {
      editingParam.value.currentValue = value;
    }
    deps.emitUpdateStagedArg(cmdId, argKey, value);
  }

  function commitParamEdit(cmdId: string, argKey: string): void {
    if (!editingParam.value) {
      return;
    }
    const newValue = editingParam.value.currentValue;
    editingParam.value = null;
    deps.emitUpdateStagedArg(cmdId, argKey, newValue);
  }

  function cancelParamEdit(): void {
    if (!editingParam.value) {
      return;
    }
    const { cmdId, argKey, originalValue } = editingParam.value;
    editingParam.value = null;
    deps.emitUpdateStagedArg(cmdId, argKey, originalValue);
  }

  function onExecuteStagedClick(): void {
    if (deps.props.flowOpen) {
      deps.emitExecutionFeedback("neutral", deps.t("execution.flowInProgress"));
      return;
    }
    deps.emitExecuteStaged();
  }

  async function copyCommand(command: string): Promise<void> {
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
    paramEditInputRef,
    startParamEdit,
    onParamEditInput,
    commitParamEdit,
    cancelParamEdit,
    onExecuteStagedClick,
    copyCommand
  };
}
