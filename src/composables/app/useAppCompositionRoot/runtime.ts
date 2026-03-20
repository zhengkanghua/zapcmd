import { computed } from "vue";
import type { CommandArg } from "../../../features/commands/commandTemplates";
import { t } from "../../../i18n";
import { getCommandArgs } from "../../../features/launcher/commandRuntime";
import { cleanExpiredDismissals } from "../../../features/security/dangerDismiss";
import { isTypingElement, useMainWindowShell } from "../../launcher/useMainWindowShell";
import { useAppLifecycleBridge } from "../useAppLifecycleBridge";
import { useAppWindowKeydown } from "../useAppWindowKeydown";
import {
  STAGING_TRANSITION_MS,
  WINDOW_SIZING_CONSTANTS,
  useLauncherLayoutMetrics
} from "../../launcher/useLauncherLayoutMetrics";
import { createPanelHeightSession } from "../../launcher/useWindowSizing/panelHeightSession";
import { useLauncherVisibility } from "../../launcher/useLauncherVisibility";
import { useLauncherWatcherBindings } from "../../launcher/useLauncherWatcherBindings";
import { useLauncherSessionState } from "../../launcher/useLauncherSessionState";
import { useCommandExecution } from "../../execution/useCommandExecution";
import { useLauncherNavStack } from "../../launcher/useLauncherNavStack";
import { useStagingQueue } from "../../launcher/useStagingQueue";
import { useWindowSizing } from "../../launcher/useWindowSizing";
import type { createAppCompositionContext } from "./context";
import { SETTINGS_STORAGE_KEYS } from "./constants";
import {
  evaluateSettingsWindowOpenPolicy,
  evaluateStartupUpdateFeedbackPolicy,
  evaluateStartupUpdatePolicy
} from "./policies";

type AppCompositionContext = ReturnType<typeof createAppCompositionContext>;
type LauncherRuntime = ReturnType<typeof createLauncherRuntime>;

function createLauncherRuntime(context: AppCompositionContext) {
  const stagingQueue = useStagingQueue({
    stagedCommands: context.stagedCommands,
    transitionMs: STAGING_TRANSITION_MS,
    scheduleSearchInputFocus: context.scheduleSearchInputFocus,
    ensureActiveStagingVisible: () => {
      context.ensureActiveStagingVisibleRef.value();
    }
  });
  useLauncherSessionState({
    enabled: computed(() => !context.isSettingsWindow.value),
    stagedCommands: context.stagedCommands,
    stagingExpanded: stagingQueue.stagingExpanded,
    suspendPersistence: context.stagingGripReorderActive,
    openStagingDrawer: stagingQueue.openStagingDrawer
  });

  const navStack = useLauncherNavStack();
  cleanExpiredDismissals();

  const commandExecution = useCommandExecution({
    stagedCommands: context.stagedCommands,
    focusZone: stagingQueue.focusZone,
    stagingActiveIndex: stagingQueue.stagingActiveIndex,
    openStagingDrawer: stagingQueue.openStagingDrawer,
    ensureActiveStagingVisible: () => context.ensureActiveStagingVisibleRef.value(),
    clearSearchQueryAndSelection: context.search.clearSearchQueryAndSelection,
    triggerStagedFeedback: context.stagedFeedback.triggerStagedFeedback,
    scheduleSearchInputFocus: context.scheduleSearchInputFocus,
    runCommandInTerminal: context.runCommandInTerminal,
    runCommandsInTerminal: context.runCommandsInTerminal,
    onNeedPanel: (command, mode) => {
      navStack.pushPage({
        type: "command-action",
        props: { command, mode, isDangerous: command.dangerous === true }
      });
    }
  });
  const flowOpen = computed(
    () => commandExecution.pendingCommand.value !== null || commandExecution.safetyDialog.value !== null
  );

  const layoutMetrics = useLauncherLayoutMetrics({
    query: context.search.query,
    filteredResults: context.search.filteredResults,
    stagedCommands: context.stagedCommands,
    stagingExpanded: stagingQueue.stagingExpanded,
    flowOpen
  });
  const visibility = useLauncherVisibility({
    drawerOpen: layoutMetrics.drawerOpen,
    activeIndex: context.search.activeIndex,
    stagingExpanded: stagingQueue.stagingExpanded,
    stagingActiveIndex: stagingQueue.stagingActiveIndex,
    ensureResultVisible: context.domBridge.ensureResultVisible,
    ensureStagingVisible: context.domBridge.ensureStagingVisible
  });
  context.ensureActiveStagingVisibleRef.value = visibility.ensureActiveStagingVisible;
  context.shouldBlockSearchInputFocusRef.value = () =>
    stagingQueue.stagingExpanded.value ||
    commandExecution.executing.value ||
    commandExecution.pendingCommand.value !== null ||
    commandExecution.safetyDialog.value !== null;

  const pendingArgs = computed<CommandArg[]>(() =>
    commandExecution.pendingCommand.value ? getCommandArgs(commandExecution.pendingCommand.value) : []
  );
  const pendingSubmitHint = computed(() =>
    commandExecution.pendingSubmitMode.value === "execute"
      ? t("runtime.submitExecuteHint")
      : t("runtime.submitStageHint")
  );

  return {
    stagingQueue,
    navStack,
    layoutMetrics,
    visibility,
    commandExecution,
    pendingArgs,
    pendingSubmitHint
  };
}

function createOnMainReady(context: AppCompositionContext, launcherRuntime: LauncherRuntime) {
  return () => {
    const startupPolicy = evaluateStartupUpdatePolicy({
      isTauriRuntime: context.ports.isTauriRuntime(),
      autoCheckUpdateEnabled: context.autoCheckUpdate.value
    });
    if (!startupPolicy.shouldCheck) {
      return;
    }

    void context.ports
      .checkStartupUpdate({
        enabled: startupPolicy.enabled,
        storage: context.ports.getLocalStorage()
      })
      .then((updateResult) => {
        const feedbackPolicy = evaluateStartupUpdateFeedbackPolicy(updateResult);
        if (!feedbackPolicy.shouldNotify) {
          return;
        }
        launcherRuntime.commandExecution.setExecutionFeedback(
          "neutral",
          t("settings.about.updateAvailable", { version: feedbackPolicy.version })
        );
      })
      .catch((error) => {
        context.ports.logError("startup update check failed", error);
      });
  };
}

function createOnSettingsReady(context: AppCompositionContext) {
  return () => {
    const openPolicy = evaluateSettingsWindowOpenPolicy({
      isTauriRuntime: context.ports.isTauriRuntime()
    });
    if (!openPolicy.shouldOpen) {
      return;
    }
    context.ports.invoke("open_settings_window").catch((error) => {
      context.ports.logError("open_settings_window invoke failed", {
        windowLabel: context.currentWindowLabel.value,
        error
      });
    });
  };
}

function bindLifecycleBridge(
  context: AppCompositionContext,
  launcherRuntime: LauncherRuntime,
  windowSizing: ReturnType<typeof useWindowSizing>,
  onWindowKeydown: (event: KeyboardEvent) => void
): void {
  useAppLifecycleBridge({
    runtime: {
      isSettingsWindow: context.isSettingsWindow,
      isTauriRuntime: context.ports.isTauriRuntime,
      resolveAppWindow: context.resolveAppWindow,
      currentWindowLabel: context.currentWindowLabel,
      settingsSyncChannel: context.settingsSyncChannel,
      settingsStorageKeys: SETTINGS_STORAGE_KEYS
    },
    settingsWindow: context.settingsWindow,
    windowSizing,
    queue: launcherRuntime.stagingQueue,
    stagedFeedback: context.stagedFeedback,
    execution: launcherRuntime.commandExecution,
    onWindowKeydown,
    readLauncherHotkey: context.ports.readLauncherHotkey,
    launcherHotkey: context.hotkeyBindings.launcherHotkey,
    scheduleSearchInputFocus: context.scheduleSearchInputFocus,
    onMainReady: createOnMainReady(context, launcherRuntime),
    onSettingsReady: createOnSettingsReady(context)
  });
}

function createWindowSizingSettleNotifiers(windowSizing: ReturnType<typeof useWindowSizing>) {
  return {
    notifySearchPageSettled(): void {
      windowSizing.notifySearchPageSettled();
    },
    notifyCommandPageSettled(): void {
      windowSizing.notifyCommandPageSettled();
    },
    notifyFlowPanelSettled(): void {
      windowSizing.notifyFlowPanelSettled();
    }
  };
}

function bindAppRuntime(
  context: AppCompositionContext,
  launcherRuntime: LauncherRuntime
) {
  const panelHeightSession = createPanelHeightSession();
  const windowSizing = useWindowSizing({
    constants: WINDOW_SIZING_CONSTANTS,
    isSettingsWindow: context.isSettingsWindow,
    isTauriRuntime: context.ports.isTauriRuntime,
    resolveAppWindow: context.resolveAppWindow,
    requestSetMainWindowSize: context.ports.requestSetMainWindowSize,
    requestAnimateMainWindowSize: context.ports.requestAnimateMainWindowSize,
    searchShellRef: context.domBridge.searchShellRef,
    stagingPanelRef: context.domBridge.stagingPanelRef,
    stagingExpanded: launcherRuntime.stagingQueue.stagingExpanded,
    pendingCommand: launcherRuntime.commandExecution.pendingCommand,
    commandPanelInheritedHeight: panelHeightSession.commandPanelInheritedHeight,
    commandPanelLockedHeight: panelHeightSession.commandPanelLockedHeight,
    flowPanelInheritedHeight: panelHeightSession.flowPanelInheritedHeight,
    flowPanelLockedHeight: panelHeightSession.flowPanelLockedHeight,
    drawerOpen: launcherRuntime.layoutMetrics.drawerOpen,
    drawerViewportHeight: launcherRuntime.layoutMetrics.drawerViewportHeight,
    searchMainWidth: launcherRuntime.layoutMetrics.searchMainWidth,
    minShellWidth: launcherRuntime.layoutMetrics.minShellWidth,
    windowWidthCap: launcherRuntime.layoutMetrics.windowWidthCap,
    windowHeightCap: launcherRuntime.layoutMetrics.windowHeightCap,
    scheduleSearchInputFocus: context.scheduleSearchInputFocus,
    loadSettings: context.settingsWindow.loadSettings
  });
  const { notifySearchPageSettled, notifyCommandPageSettled, notifyFlowPanelSettled } =
    createWindowSizingSettleNotifiers(windowSizing);
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
    cancelHotkeyRecording: context.settingsWindow.cancelHotkeyRecording,
    resolveAppWindow: context.resolveAppWindow,
    isTauriRuntime: context.ports.isTauriRuntime,
    requestHideMainWindow: context.ports.requestHideMainWindow,
    commandPanelOpen: computed(() => launcherRuntime.commandExecution.pendingCommand.value !== null),
    requestCommandPanelExit,
    query: context.search.query,
    stagingExpanded: computed(
      () =>
        launcherRuntime.stagingQueue.stagingExpanded.value ||
        launcherRuntime.commandExecution.safetyDialog.value !== null
    ),
    closeStagingDrawer: () => {
      if (launcherRuntime.commandExecution.safetyDialog.value !== null) {
        launcherRuntime.commandExecution.cancelSafetyExecution();
        return;
      }
      launcherRuntime.stagingQueue.closeStagingDrawer();
    },
    navStackCanGoBack: launcherRuntime.navStack.canGoBack,
    navStackPopPage: launcherRuntime.navStack.popPage
  });
  function requestCloseSettingsWindow(): void {
    context.settingsWindow.cancelHotkeyRecording();
    closeSettingsWindowImmediately();
  }
  const onWindowKeydown = useAppWindowKeydown({
    isSettingsWindow: context.isSettingsWindow,
    settingsWindow: context.settingsWindow,
    closeSettingsWindow: requestCloseSettingsWindow,
    stagingQueue: launcherRuntime.stagingQueue,
    commandExecution: launcherRuntime.commandExecution,
    searchInputRef: context.domBridge.searchInputRef,
    drawerRef: context.domBridge.drawerRef,
    drawerOpen: launcherRuntime.layoutMetrics.drawerOpen,
    filteredResults: context.search.filteredResults,
    activeIndex: context.search.activeIndex,
    ensureActiveResultVisible: launcherRuntime.visibility.ensureActiveResultVisible,
    stagedCommands: context.stagedCommands,
    ensureActiveStagingVisible: launcherRuntime.visibility.ensureActiveStagingVisible,
    handleMainEscape,
    hotkeyBindings: context.hotkeyBindings,
    isTypingElement
  });

  bindLifecycleBridge(context, launcherRuntime, windowSizing, onWindowKeydown);

  useLauncherWatcherBindings({
    drawerOpen: launcherRuntime.layoutMetrics.drawerOpen,
    drawerVisibleRows: launcherRuntime.layoutMetrics.drawerVisibleRows,
    pendingCommand: launcherRuntime.commandExecution.pendingCommand,
    stagingDrawerState: launcherRuntime.stagingQueue.stagingDrawerState,
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
    notifyFlowPanelSettled
  };
}

export function createAppCompositionRuntime(context: AppCompositionContext) {
  const launcherRuntime = createLauncherRuntime(context);
  const appRuntime = bindAppRuntime(context, launcherRuntime);

  return {
    ...launcherRuntime,
    ...appRuntime
  };
}
