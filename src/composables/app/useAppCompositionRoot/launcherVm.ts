import { proxyRefs } from "vue";
import type { createAppCompositionContext } from "./context";
import type { createAppCompositionRuntime } from "./runtime";

type AppCompositionContext = ReturnType<typeof createAppCompositionContext>;
type AppCompositionRuntime = ReturnType<typeof createAppCompositionRuntime>;

function createSearchVm(
  context: AppCompositionContext,
  runtime: AppCompositionRuntime
) {
  return proxyRefs({
    query: context.search.query,
    keyboardHints: context.hotkeyBindings.keyboardHints,
    filteredResults: context.search.filteredResults,
    activeIndex: context.search.activeIndex,
    searchShellStyle: runtime.layoutMetrics.searchShellStyle,
    drawerOpen: runtime.layoutMetrics.drawerOpen,
    drawerViewportHeight: runtime.layoutMetrics.drawerViewportHeight,
    queuedFeedbackCommandId: context.stagedFeedback.stagedFeedbackCommandId
  });
}

function createCommandVm(
  context: AppCompositionContext,
  runtime: AppCompositionRuntime
) {
  return proxyRefs({
    pendingCommand: runtime.commandExecution.pendingCommand,
    pendingArgs: runtime.pendingArgs,
    pendingArgValues: runtime.commandExecution.pendingArgValues,
    submitHint: runtime.pendingSubmitHint,
    submitMode: runtime.commandExecution.pendingSubmitMode,
    safetyDialog: runtime.commandExecution.safetyDialog,
    executing: runtime.commandExecution.executing,
    executionFeedbackMessage: runtime.commandExecution.executionFeedbackMessage,
    executionFeedbackTone: runtime.commandExecution.executionFeedbackTone
  });
}

function createQueueVm(
  context: AppCompositionContext,
  runtime: AppCompositionRuntime
) {
  return proxyRefs({
    items: context.stagedCommands,
    queueOpen: runtime.stagingQueue.queueOpen,
    panelState: runtime.stagingQueue.queuePanelState,
    hints: context.hotkeyBindings.stagingHints,
    focusZone: runtime.stagingQueue.focusZone,
    activeIndex: runtime.stagingQueue.queueActiveIndex,
    refreshingAllPreflight: runtime.commandExecution.refreshingAllQueuedPreflight,
    refreshingCommandIds: runtime.commandExecution.refreshingQueuedCommandIds
  });
}

function createNavVm(runtime: AppCompositionRuntime) {
  return proxyRefs({
    currentPage: runtime.navStack.currentPage,
    canGoBack: runtime.navStack.canGoBack,
    pushPage: runtime.navStack.pushPage,
    popPage: runtime.navStack.popPage,
    resetToSearch: runtime.navStack.resetToSearch,
    stack: runtime.navStack.stack
  });
}

function createDomVm(context: AppCompositionContext) {
  return {
    setSearchShellRef: context.domBridge.setSearchShellRef,
    setSearchInputRef: context.domBridge.setSearchInputRef,
    setDrawerRef: context.domBridge.setDrawerRef,
    setQueuePanelRef: context.domBridge.setStagingPanelRef,
    setQueueListRef: context.domBridge.setStagingListRef,
    setResultButtonRef: context.domBridge.setResultButtonRef,
    setParamInputRef: context.domBridge.setParamInputRef
  };
}

function createActionVm(
  context: AppCompositionContext,
  runtime: AppCompositionRuntime
) {
  function submitParamInput(): boolean {
    return runtime.commandExecution.submitParamInput();
  }

  return {
    onQueryInput: context.search.onQueryInput,
    enqueueResult: runtime.commandExecution.stageResult,
    executeResult: runtime.commandExecution.executeResult,
    toggleQueue: runtime.stagingQueue.toggleQueue,
    onQueueDragStart: runtime.stagingQueue.onQueueDragStart,
    onQueueDragOver: runtime.stagingQueue.onQueueDragOver,
    onQueueDragEnd: runtime.stagingQueue.onQueueDragEnd,
    onFocusQueueIndex: runtime.stagingQueue.onFocusQueueIndex,
    removeQueuedCommand: runtime.commandExecution.removeStagedCommand,
    updateQueuedArg: runtime.commandExecution.updateStagedArg,
    clearQueue: runtime.commandExecution.clearStaging,
    executeQueue: runtime.commandExecution.executeStaged,
    refreshQueuedCommandPreflight: runtime.commandExecution.refreshQueuedCommandPreflight,
    refreshAllQueuedPreflight: runtime.commandExecution.refreshAllQueuedPreflight,
    setQueueGripReorderActive(value: boolean): void {
      context.stagingGripReorderActive.value = value;
    },
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
  };
}

export function createLauncherVm(
  context: AppCompositionContext,
  runtime: AppCompositionRuntime
) {
  return {
    search: createSearchVm(context, runtime),
    command: createCommandVm(context, runtime),
    queue: createQueueVm(context, runtime),
    nav: createNavVm(runtime),
    dom: createDomVm(context),
    actions: createActionVm(context, runtime)
  };
}

export type LauncherVm = ReturnType<typeof createLauncherVm>;
