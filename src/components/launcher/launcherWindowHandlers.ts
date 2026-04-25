import type { CommandTemplate } from "../../features/commands/commandTemplates";
import type { LauncherVm } from "../../composables/app/useAppCompositionRoot/launcherVm";

interface CreateLauncherWindowHandlersOptions {
  launcherVm: LauncherVm;
  dismissDanger: (commandId: string) => void;
}

export function createLauncherWindowHandlers(options: CreateLauncherWindowHandlersOptions) {
  const { launcherVm } = options;
  return {
    ...createSearchHandlers(launcherVm),
    ...createQueueHandlers(launcherVm),
    ...createPanelHandlers(options)
  };
}

function createSearchHandlers(launcherVm: LauncherVm) {
  function onQueryInput(value: string): void {
    launcherVm.actions.onQueryInput(value);
  }

  function onEnqueueResult(command: CommandTemplate): void {
    launcherVm.actions.enqueueResult(command);
  }

  function onExecuteResult(command: CommandTemplate): void {
    launcherVm.actions.executeResult(command);
  }

  function onOpenActionPanel(command: CommandTemplate): void {
    launcherVm.actions.openActionPanel(command);
  }

  function onCopyResult(command: CommandTemplate): void {
    launcherVm.actions.dispatchCommandIntent(command, "copy");
  }

  return {
    onQueryInput,
    onEnqueueResult,
    onExecuteResult,
    onOpenActionPanel,
    onCopyResult
  };
}

function createQueueHandlers(launcherVm: LauncherVm) {
  function toggleQueue(): void {
    launcherVm.actions.toggleQueue();
  }

  function onQueueDragStart(index: number, event: DragEvent): void {
    launcherVm.actions.onQueueDragStart(index, event);
  }

  function onQueueDragOver(index: number, event: DragEvent): void {
    launcherVm.actions.onQueueDragOver(index, event);
  }

  function onQueueDragEnd(): void {
    launcherVm.actions.onQueueDragEnd();
  }

  function onQueueGripReorderActiveChange(value: boolean): void {
    launcherVm.actions.setQueueGripReorderActive(value);
  }

  function onFocusQueueIndex(index: number): void {
    launcherVm.actions.onFocusQueueIndex(index);
  }

  function onRemoveQueuedCommand(id: string): void {
    launcherVm.actions.removeQueuedCommand(id);
  }

  function onUpdateQueuedArg(id: string, key: string, value: string): void {
    launcherVm.actions.updateQueuedArg(id, key, value);
  }

  function onClearQueue(): void {
    launcherVm.actions.clearQueue();
  }

  function onExecuteQueue(): void {
    launcherVm.actions.executeQueue();
  }

  function onRefreshQueuePreflight(): void {
    launcherVm.actions.refreshAllQueuedPreflight();
  }

  function onRefreshQueuedCommandPreflight(id: string): void {
    launcherVm.actions.refreshQueuedCommandPreflight(id);
  }

  function onSearchCapsuleBack(): void {
    if (launcherVm.nav.currentPage.type === "command-action") {
      launcherVm.actions.requestCommandPanelExit();
      return;
    }
    if (launcherVm.nav.canGoBack) {
      launcherVm.nav.popPage();
      return;
    }
    if (launcherVm.queue.queueOpen) {
      toggleQueue();
    }
  }

  return {
    toggleQueue,
    onQueueDragStart,
    onQueueDragOver,
    onQueueDragEnd,
    onQueueGripReorderActiveChange,
    onFocusQueueIndex,
    onRemoveQueuedCommand,
    onUpdateQueuedArg,
    onClearQueue,
    onExecuteQueue,
    onRefreshQueuePreflight,
    onRefreshQueuedCommandPreflight,
    onSearchCapsuleBack
  };
}

function createPanelHandlers(options: CreateLauncherWindowHandlersOptions) {
  const { launcherVm } = options;

  function submitParamInput(): void {
    if (!launcherVm.actions.submitParamInput()) {
      return;
    }
    launcherVm.actions.requestCommandPanelExit();
  }

  function onCommandPanelSubmit(argValues: Record<string, string>, shouldDismiss: boolean): void {
    void argValues;
    if (shouldDismiss && launcherVm.nav.currentPage.props?.command) {
      options.dismissDanger(launcherVm.nav.currentPage.props.command.id);
    }
    submitParamInput();
  }

  function onCommandPanelCancel(): void {
    launcherVm.actions.requestCommandPanelExit();
  }

  function onActionPanelCancel(): void {
    launcherVm.actions.requestCommandPanelExit();
  }

  function onActionPanelSelect(intent: "execute" | "stage" | "copy"): void {
    launcherVm.actions.selectActionPanelIntent(intent);
  }

  function onArgInput(key: string, value: string): void {
    launcherVm.actions.updatePendingArgValue(key, value);
  }

  function onFlowPanelPrepared(): void {
    launcherVm.actions.notifyFlowPanelPrepared();
  }

  function onFlowPanelHeightChange(): void {
    launcherVm.actions.notifyFlowPanelHeightChange();
  }

  function onFlowPanelSettled(): void {
    launcherVm.actions.notifyFlowPanelSettled();
  }

  function onConfirmSafetyExecution(): void {
    launcherVm.actions.confirmSafetyExecution();
  }

  function onCancelSafetyExecution(): void {
    launcherVm.actions.cancelSafetyExecution();
  }

  return {
    onCommandPanelSubmit,
    onCommandPanelCancel,
    onActionPanelCancel,
    onActionPanelSelect,
    onArgInput,
    onFlowPanelPrepared,
    onFlowPanelHeightChange,
    onFlowPanelSettled,
    onConfirmSafetyExecution,
    onCancelSafetyExecution
  };
}
