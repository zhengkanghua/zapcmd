import { proxyRefs } from "vue";
import type { createAppCompositionContext } from "./context";
import type { createAppCompositionRuntime } from "./runtime";

type AppCompositionContext = ReturnType<typeof createAppCompositionContext>;
type AppCompositionRuntime = ReturnType<typeof createAppCompositionRuntime>;

export function createLauncherVm(
  context: AppCompositionContext,
  runtime: AppCompositionRuntime
) {
  function submitParamInput(): boolean {
    return runtime.commandExecution.submitParamInput();
  }

  return proxyRefs({
    query: context.search.query,
    executing: runtime.commandExecution.executing,
    executionFeedbackMessage: runtime.commandExecution.executionFeedbackMessage,
    executionFeedbackTone: runtime.commandExecution.executionFeedbackTone,
    searchShellStyle: runtime.layoutMetrics.searchShellStyle,
    stagingExpanded: runtime.stagingQueue.stagingExpanded,
    drawerOpen: runtime.layoutMetrics.drawerOpen,
    drawerViewportHeight: runtime.layoutMetrics.drawerViewportHeight,
    keyboardHints: context.hotkeyBindings.keyboardHints,
    filteredResults: context.search.filteredResults,
    activeIndex: context.search.activeIndex,
    stagedFeedbackCommandId: context.stagedFeedback.stagedFeedbackCommandId,
    stagedCommands: context.stagedCommands,
    stagingDrawerState: runtime.stagingQueue.stagingDrawerState,
    stagingHints: context.hotkeyBindings.stagingHints,
    focusZone: runtime.stagingQueue.focusZone,
    stagingActiveIndex: runtime.stagingQueue.stagingActiveIndex,
    pendingCommand: runtime.commandExecution.pendingCommand,
    pendingArgs: runtime.pendingArgs,
    pendingArgValues: runtime.commandExecution.pendingArgValues,
    pendingSubmitHint: runtime.pendingSubmitHint,
    pendingSubmitMode: runtime.commandExecution.pendingSubmitMode,
    safetyDialog: runtime.commandExecution.safetyDialog,
    navCurrentPage: runtime.navStack.currentPage,
    navCanGoBack: runtime.navStack.canGoBack,
    navPushPage: runtime.navStack.pushPage,
    navPopPage: runtime.navStack.popPage,
    navResetToSearch: runtime.navStack.resetToSearch,
    navStack: runtime.navStack.stack,
    setSearchShellRef: context.domBridge.setSearchShellRef,
    setSearchInputRef: context.domBridge.setSearchInputRef,
    setDrawerRef: context.domBridge.setDrawerRef,
    setStagingPanelRef: context.domBridge.setStagingPanelRef,
    setStagingListRef: context.domBridge.setStagingListRef,
    setResultButtonRef: context.domBridge.setResultButtonRef,
    setParamInputRef: context.domBridge.setParamInputRef,
    setStagingGripReorderActive(value: boolean): void {
      context.stagingGripReorderActive.value = value;
    },
    onQueryInput: context.search.onQueryInput,
    stageResult: runtime.commandExecution.stageResult,
    executeResult: runtime.commandExecution.executeResult,
    toggleStaging: runtime.stagingQueue.toggleStaging,
    onStagingDragStart: runtime.stagingQueue.onStagingDragStart,
    onStagingDragOver: runtime.stagingQueue.onStagingDragOver,
    onStagingDragEnd: runtime.stagingQueue.onStagingDragEnd,
    onFocusStagingIndex: runtime.stagingQueue.onFocusStagingIndex,
    removeStagedCommand: runtime.commandExecution.removeStagedCommand,
    updateStagedArg: runtime.commandExecution.updateStagedArg,
    clearStaging: runtime.commandExecution.clearStaging,
    executeStaged: runtime.commandExecution.executeStaged,
    submitParamInput,
    requestCommandPanelExit: runtime.requestCommandPanelExit,
    notifyCommandPageSettled: runtime.notifyCommandPageSettled,
    notifyFlowPanelPrepared: runtime.notifyFlowPanelPrepared,
    notifyFlowPanelHeightChange: runtime.notifyFlowPanelHeightChange,
    notifyFlowPanelSettled: runtime.notifyFlowPanelSettled,
    notifySearchPageSettled: runtime.notifySearchPageSettled,
    updatePendingArgValue: runtime.commandExecution.updatePendingArgValue,
    confirmSafetyExecution: runtime.commandExecution.confirmSafetyExecution,
    cancelSafetyExecution: runtime.commandExecution.cancelSafetyExecution
  });
}
