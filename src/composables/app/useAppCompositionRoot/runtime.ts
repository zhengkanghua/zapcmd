import { computed } from "vue";
import type { CommandArg, CommandTemplate } from "../../../features/commands/commandTemplates";
import { t } from "../../../i18n";
import { getCommandArgs } from "../../../features/launcher/commandRuntime";
import {
  restorePersistedLauncherSessionCommandSnapshot,
  type PersistedLauncherSessionCommand,
  resolveStagedCommandSourceId
} from "../../../features/launcher/stagedCommands";
import { cleanExpiredDismissals } from "../../../features/security/dangerDismiss";
import { isTypingElement, useMainWindowShell } from "../../launcher/useMainWindowShell";
import { useAppWindowKeydown } from "../useAppWindowKeydown";
import {
  STAGING_TRANSITION_MS,
  WINDOW_SIZING_CONSTANTS,
  useLauncherLayoutMetrics
} from "../../launcher/useLauncherLayoutMetrics";
import { createCommandPreflightService } from "../../../services/commandPreflight";
import { copyTextToClipboard } from "../../../services/clipboard";
import { createPanelHeightSession } from "../../launcher/useWindowSizing/panelHeightSession";
import { useLauncherVisibility } from "../../launcher/useLauncherVisibility";
import { useLauncherWatcherBindings } from "../../launcher/useLauncherWatcherBindings";
import { useLauncherSessionState } from "../../launcher/useLauncherSessionState";
import { useCommandExecution } from "../../execution/useCommandExecution";
import { useLauncherNavStack } from "../../launcher/useLauncherNavStack";
import { useCommandQueue } from "../../launcher/useCommandQueue";
import type { StagedCommand } from "../../../features/launcher/types";
import { useWindowSizing } from "../../launcher/useWindowSizing";
import type { LauncherRuntimeContext } from "./launcherContext";
import {
  bindLifecycleBridge,
  createWindowSizingSettleNotifiers
} from "./launcherRuntimeBindings";
import { bindStagedCatalogSync } from "./stagedCatalogSync";

type LauncherRuntime = ReturnType<typeof createLauncherRuntime>;

function restoreLauncherSessionCommands(
  context: LauncherRuntimeContext,
  commands: PersistedLauncherSessionCommand[]
): StagedCommand[] {
  // 只有在 catalog ready 之后才恢复，并按当前模板重建队列项；找不到模板时保留为 stale 条目并阻断执行。
  const templatesById = new Map(
    context.commandCatalog.allCommandTemplates.value.map((item) => [item.id, item])
  );

  return commands.map((item) =>
    restorePersistedLauncherSessionCommandSnapshot(
      item,
      templatesById.get(resolveStagedCommandSourceId(item))
    )
  );
}

function createLauncherRuntime(context: LauncherRuntimeContext) {
  const prepareDrawerRevealRef = {
    value: async () => {}
  };
  const stagingQueue = useCommandQueue({
    queuedCommands: context.stagedCommands,
    transitionMs: STAGING_TRANSITION_MS,
    scheduleSearchInputFocus: context.scheduleSearchInputFocus,
    preparePanelReveal: () => prepareDrawerRevealRef.value(),
    ensureActiveQueueVisible: () => {
      context.ensureActiveStagingVisibleRef.value();
    }
  });
  useLauncherSessionState({
    enabled: computed(
      () => !context.isSettingsWindow.value && context.commandCatalog.catalogReady.value
    ),
    stagedCommands: context.stagedCommands,
    stagingExpanded: stagingQueue.queueOpen,
    suspendPersistence: context.stagingGripReorderActive,
    restoreStagedCommands: (commands) => restoreLauncherSessionCommands(context, commands),
    openStagingDrawer: stagingQueue.openQueuePanel
  });
  bindStagedCatalogSync({
    stagedCommands: context.stagedCommands,
    allCommandTemplates: context.commandCatalog.allCommandTemplates
  });

  const navStack = useLauncherNavStack();
  cleanExpiredDismissals();
  const commandPreflight = createCommandPreflightService();

  function openActionPanel(command: CommandTemplate): void {
    navStack.pushPage({
      type: "command-action",
      props: { command, panel: "actions" }
    });
  }

  const commandExecution = useCommandExecution({
    stagedCommands: context.stagedCommands,
    focusZone: stagingQueue.focusZone,
    stagingActiveIndex: stagingQueue.queueActiveIndex,
    openStagingDrawer: stagingQueue.openQueuePanel,
    ensureActiveStagingVisible: () => context.ensureActiveStagingVisibleRef.value(),
    clearSearchQueryAndSelection: context.search.clearSearchQueryAndSelection,
    triggerStagedFeedback: context.stagedFeedback.triggerStagedFeedback,
    scheduleSearchInputFocus: context.scheduleSearchInputFocus,
    runCommandInTerminal: context.runCommandInTerminal,
    runCommandsInTerminal: context.runCommandsInTerminal,
    runCommandPreflight: commandPreflight.check.bind(commandPreflight),
    queueAutoClearOnSuccess: context.queueAutoClearOnSuccess,
    copyTextToClipboard,
    resolveCommandTitle: (commandId) =>
      context.commandCatalog.commandTemplates.value.find((item) => item.id === commandId)?.title ?? null,
    onNeedPanel: (command, intent) => {
      const nextPage = {
        type: "command-action" as const,
        props: {
          command,
          panel: "params" as const,
          intent,
          isDangerous: intent === "execute" && command.dangerous === true
        }
      };
      if (
        navStack.currentPage.value.type === "command-action" &&
        navStack.currentPage.value.props?.panel === "actions"
      ) {
        navStack.replaceTopPage(nextPage);
        return;
      }
      navStack.pushPage(nextPage);
    }
  });
  const commandPageOpen = computed(
    () => navStack.currentPage.value.type === "command-action"
  );

  const layoutMetrics = useLauncherLayoutMetrics({
    query: context.search.query,
    filteredResults: context.search.filteredResults,
    stagedCommands: context.stagedCommands,
    stagingExpanded: stagingQueue.queueOpen,
    commandPageOpen
  });
  const visibility = useLauncherVisibility({
    drawerOpen: layoutMetrics.drawerOpen,
    activeIndex: context.search.activeIndex,
    stagingExpanded: stagingQueue.queueOpen,
    stagingActiveIndex: stagingQueue.queueActiveIndex,
    ensureResultVisible: context.domBridge.ensureResultVisible,
    ensureStagingVisible: context.domBridge.ensureStagingVisible
  });
  context.ensureActiveStagingVisibleRef.value = visibility.ensureActiveStagingVisible;
  context.shouldBlockSearchInputFocusRef.value = () =>
    stagingQueue.queueOpen.value ||
    commandExecution.executing.value ||
    commandPageOpen.value ||
    commandExecution.safetyDialog.value !== null;

  const pendingArgs = computed<CommandArg[]>(() =>
    commandExecution.pendingCommand.value ? getCommandArgs(commandExecution.pendingCommand.value) : []
  );
  const pendingSubmitHint = computed(() =>
    commandExecution.pendingSubmitIntent.value === "execute"
      ? t("runtime.submitExecuteHint")
      : commandExecution.pendingSubmitIntent.value === "copy"
        ? t("common.copy")
        : t("runtime.submitStageHint")
  );

  return {
    prepareDrawerRevealRef,
    stagingQueue,
    navStack,
    layoutMetrics,
    visibility,
    commandExecution,
    openActionPanel,
    pendingArgs,
    pendingSubmitHint
  };
}

function createWindowSizingOptions(
  context: LauncherRuntimeContext,
  launcherRuntime: LauncherRuntime,
  panelHeightSession: ReturnType<typeof createPanelHeightSession>
): Parameters<typeof useWindowSizing>[0] {
  return {
    constants: WINDOW_SIZING_CONSTANTS,
    isSettingsWindow: context.isSettingsWindow,
    isTauriRuntime: context.ports.isTauriRuntime,
    resolveAppWindow: context.resolveAppWindow,
    requestSetMainWindowSize: context.ports.requestSetMainWindowSize,
    requestAnimateMainWindowSize: context.ports.requestAnimateMainWindowSize,
    requestResizeMainWindowForReveal: context.ports.requestResizeMainWindowForReveal,
    searchShellRef: context.domBridge.searchShellRef,
    stagingPanelRef: context.domBridge.stagingPanelRef,
    stagingExpanded: launcherRuntime.stagingQueue.queueOpen,
    commandPageOpen: computed(() => launcherRuntime.navStack.currentPage.value.type === "command-action"),
    pendingCommand: launcherRuntime.commandExecution.pendingCommand,
    commandPanelInheritedHeight: panelHeightSession.commandPanelInheritedHeight,
    commandPanelLockedHeight: panelHeightSession.commandPanelLockedHeight,
    flowPanelInheritedHeight: panelHeightSession.flowPanelInheritedHeight,
    flowPanelLockedHeight: panelHeightSession.flowPanelLockedHeight,
    drawerOpen: launcherRuntime.layoutMetrics.drawerOpen,
    drawerViewportHeight: launcherRuntime.layoutMetrics.drawerViewportHeight,
    searchPanelEffectiveHeight: launcherRuntime.layoutMetrics.searchPanelEffectiveHeight,
    sharedPanelMaxHeight: launcherRuntime.layoutMetrics.sharedPanelMaxHeight,
    searchMainWidth: launcherRuntime.layoutMetrics.searchMainWidth,
    minShellWidth: launcherRuntime.layoutMetrics.minShellWidth,
    windowWidthCap: launcherRuntime.layoutMetrics.windowWidthCap,
    windowHeightCap: launcherRuntime.layoutMetrics.windowHeightCap,
    scheduleSearchInputFocus: context.scheduleSearchInputFocus,
    reloadSettings: context.settingsWindow.reloadSettings
  };
}

function createWindowKeydownOptions(
  context: LauncherRuntimeContext,
  launcherRuntime: LauncherRuntime,
  handleMainEscape: () => void,
  closeSettingsWindow: () => void,
  isTypingElement: (target: EventTarget | null) => boolean
) {
  return {
    isSettingsWindow: context.isSettingsWindow,
    settingsWindow: context.settingsWindow,
    closeSettingsWindow,
    queue: launcherRuntime.stagingQueue,
    commandExecution: {
      executeQueue: launcherRuntime.commandExecution.executeStaged,
      clearQueue: launcherRuntime.commandExecution.clearStaging,
      executeResult: launcherRuntime.commandExecution.executeResult,
      enqueueResult: launcherRuntime.commandExecution.stageResult,
      openActionPanel: launcherRuntime.openActionPanel,
      copySelected: (command: CommandTemplate) => {
        void launcherRuntime.commandExecution.dispatchCommandIntent(command, "copy");
      },
      removeQueuedCommand: launcherRuntime.commandExecution.removeStagedCommand,
      pendingCommand: launcherRuntime.commandExecution.pendingCommand,
      safetyDialog: launcherRuntime.commandExecution.safetyDialog,
      confirmSafetyExecution: launcherRuntime.commandExecution.confirmSafetyExecution,
      cancelSafetyExecution: launcherRuntime.commandExecution.cancelSafetyExecution
    },
    commandPageOpen: computed(
      () => launcherRuntime.navStack.currentPage.value.type === "command-action"
    ),
    searchInputRef: context.domBridge.searchInputRef,
    drawerRef: context.domBridge.drawerRef,
    drawerOpen: launcherRuntime.layoutMetrics.drawerOpen,
    filteredResults: context.search.filteredResults,
    activeIndex: context.search.activeIndex,
    ensureActiveResultVisible: launcherRuntime.visibility.ensureActiveResultVisible,
    queuedCommands: context.stagedCommands,
    ensureActiveQueueVisible: launcherRuntime.visibility.ensureActiveStagingVisible,
    handleMainEscape,
    hotkeyBindings: {
      ...context.hotkeyBindings,
      normalizedEnqueueSelectedHotkey: context.hotkeyBindings.normalizedStageSelectedHotkey
    },
    isTypingElement
  };
}

function bindAppRuntime(
  context: LauncherRuntimeContext,
  launcherRuntime: LauncherRuntime
) {
  const panelHeightSession = createPanelHeightSession();
  const windowSizing = useWindowSizing(
    createWindowSizingOptions(context, launcherRuntime, panelHeightSession)
  );
  const {
    notifySearchPageSettled,
    notifyCommandPageSettled,
    notifyFlowPanelPrepared,
    notifyFlowPanelHeightChange,
    notifyFlowPanelSettled
  } =
    createWindowSizingSettleNotifiers(windowSizing);
  launcherRuntime.prepareDrawerRevealRef.value = () => windowSizing.prepareFlowPanelReveal();
  function requestCommandPanelExit(): void {
    const onCommandActionPage = launcherRuntime.navStack.currentPage.value.type === "command-action";
    if (!onCommandActionPage && launcherRuntime.commandExecution.pendingCommand.value === null) {
      if (launcherRuntime.navStack.canGoBack.value) {
        launcherRuntime.navStack.popPage();
      }
      return;
    }

    windowSizing.requestCommandPanelExit();
    if (launcherRuntime.commandExecution.pendingCommand.value !== null) {
      launcherRuntime.commandExecution.cancelParamInput();
    }

    if (launcherRuntime.navStack.canGoBack.value) {
      launcherRuntime.navStack.popPage();
      return;
    }
    launcherRuntime.navStack.resetToSearch();
  }

  const { closeSettingsWindow: closeSettingsWindowImmediately, hideMainWindow, handleMainEscape } = useMainWindowShell({
    isSettingsWindow: context.isSettingsWindow,
    resolveAppWindow: context.resolveAppWindow,
    isTauriRuntime: context.ports.isTauriRuntime,
    requestHideMainWindow: context.ports.requestHideMainWindow,
    commandPanelOpen: computed(() => launcherRuntime.commandExecution.pendingCommand.value !== null),
    requestCommandPanelExit,
    query: context.search.query,
    stagingExpanded: computed(
      () =>
        launcherRuntime.stagingQueue.queueOpen.value ||
        launcherRuntime.commandExecution.safetyDialog.value !== null
    ),
    closeStagingDrawer: () => {
      if (launcherRuntime.commandExecution.safetyDialog.value !== null) {
        launcherRuntime.commandExecution.cancelSafetyExecution();
        return;
      }
      launcherRuntime.stagingQueue.closeQueuePanel();
    },
    navStackCanGoBack: launcherRuntime.navStack.canGoBack,
    navStackPopPage: launcherRuntime.navStack.popPage
  });
  function requestCloseSettingsWindow(): void {
    closeSettingsWindowImmediately();
  }
  const onWindowKeydown = useAppWindowKeydown(
    createWindowKeydownOptions(
      context,
      launcherRuntime,
      handleMainEscape,
      requestCloseSettingsWindow,
      isTypingElement
    )
  );

  bindLifecycleBridge(context, launcherRuntime, windowSizing, onWindowKeydown);

  useLauncherWatcherBindings({
    drawerOpen: launcherRuntime.layoutMetrics.drawerOpen,
    drawerVisibleRows: launcherRuntime.layoutMetrics.drawerVisibleRows,
    pendingCommand: launcherRuntime.commandExecution.pendingCommand,
    stagingDrawerState: launcherRuntime.stagingQueue.queuePanelState,
    filteredResults: context.search.filteredResults,
    resultButtons: context.domBridge.resultButtons,
    activeIndex: context.search.activeIndex,
    drawerRef: context.domBridge.drawerRef,
    ensureActiveResultVisible: launcherRuntime.visibility.ensureActiveResultVisible,
    paramInputRef: context.domBridge.paramInputRef,
    windowSizing
  });

  return {
    closeSettingsWindow: requestCloseSettingsWindow,
    forceCloseSettingsWindow: closeSettingsWindowImmediately,
    hideMainWindow,
    requestCommandPanelExit,
    notifySearchPageSettled,
    notifyCommandPageSettled,
    notifyFlowPanelPrepared,
    notifyFlowPanelHeightChange,
    notifyFlowPanelSettled
  };
}

export function createAppCompositionRuntime(context: LauncherRuntimeContext) {
  const launcherRuntime = createLauncherRuntime(context);
  const appRuntime = bindAppRuntime(context, launcherRuntime);

  return {
    ...launcherRuntime,
    ...appRuntime
  };
}
