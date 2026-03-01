import { invoke, isTauri } from "@tauri-apps/api/core";
import { computed } from "vue";
import type { CommandArg } from "../../../features/commands/commandTemplates";
import { t } from "../../../i18n";
import { getCommandArgs } from "../../../features/launcher/commandRuntime";
import { isTypingElement, useMainWindowShell } from "../../launcher/useMainWindowShell";
import { useAppLifecycleBridge } from "../useAppLifecycleBridge";
import { useAppWindowKeydown } from "../useAppWindowKeydown";
import {
  STAGING_TRANSITION_MS,
  WINDOW_SIZING_CONSTANTS,
  useLauncherLayoutMetrics
} from "../../launcher/useLauncherLayoutMetrics";
import { useLauncherVisibility } from "../../launcher/useLauncherVisibility";
import { useLauncherWatcherBindings } from "../../launcher/useLauncherWatcherBindings";
import { useLauncherSessionState } from "../../launcher/useLauncherSessionState";
import { useCommandExecution } from "../../execution/useCommandExecution";
import { useStagingQueue } from "../../launcher/useStagingQueue";
import { useWindowSizing } from "../../launcher/useWindowSizing";
import {
  readLauncherHotkey,
  requestHideMainWindow,
  requestSetMainWindowSize
} from "../../../services/tauriBridge";
import type { createAppCompositionContext } from "./context";
import { SETTINGS_STORAGE_KEYS } from "./constants";
import { maybeCheckForUpdateAtStartup } from "../../../services/startupUpdateCheck";

type AppCompositionContext = ReturnType<typeof createAppCompositionContext>;

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
    openStagingDrawer: stagingQueue.openStagingDrawer
  });

  const layoutMetrics = useLauncherLayoutMetrics({
    query: context.search.query,
    filteredResults: context.search.filteredResults,
    stagedCommands: context.stagedCommands,
    stagingExpanded: stagingQueue.stagingExpanded
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
    runCommandsInTerminal: context.runCommandsInTerminal
  });
  context.shouldBlockSearchInputFocusRef.value = () =>
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
    layoutMetrics,
    visibility,
    commandExecution,
    pendingArgs,
    pendingSubmitHint
  };
}

function bindAppRuntime(
  context: AppCompositionContext,
  launcherRuntime: ReturnType<typeof createLauncherRuntime>
) {
  const windowSizing = useWindowSizing({
    constants: WINDOW_SIZING_CONSTANTS,
    isSettingsWindow: context.isSettingsWindow,
    isTauriRuntime: isTauri,
    resolveAppWindow: context.resolveAppWindow,
    requestSetMainWindowSize,
    searchShellRef: context.domBridge.searchShellRef,
    stagingPanelRef: context.domBridge.stagingPanelRef,
    stagingExpanded: launcherRuntime.stagingQueue.stagingExpanded,
    pendingCommand: launcherRuntime.commandExecution.pendingCommand,
    drawerOpen: launcherRuntime.layoutMetrics.drawerOpen,
    drawerViewportHeight: launcherRuntime.layoutMetrics.drawerViewportHeight,
    stagingVisibleRows: launcherRuntime.layoutMetrics.stagingVisibleRows,
    searchMainWidth: launcherRuntime.layoutMetrics.searchMainWidth,
    minShellWidth: launcherRuntime.layoutMetrics.minShellWidth,
    windowWidthCap: launcherRuntime.layoutMetrics.windowWidthCap,
    windowHeightCap: launcherRuntime.layoutMetrics.windowHeightCap,
    scheduleSearchInputFocus: context.scheduleSearchInputFocus,
    loadSettings: context.settingsWindow.loadSettings
  });
  const { closeSettingsWindow, hideMainWindow, handleMainEscape } = useMainWindowShell({
    isSettingsWindow: context.isSettingsWindow,
    cancelHotkeyRecording: context.settingsWindow.cancelHotkeyRecording,
    resolveAppWindow: context.resolveAppWindow,
    isTauriRuntime: isTauri,
    requestHideMainWindow,
    pendingCommand: launcherRuntime.commandExecution.pendingCommand,
    cancelParamInput: launcherRuntime.commandExecution.cancelParamInput,
    safetyDialog: launcherRuntime.commandExecution.safetyDialog,
    cancelSafetyExecution: launcherRuntime.commandExecution.cancelSafetyExecution,
    query: context.search.query,
    stagingExpanded: launcherRuntime.stagingQueue.stagingExpanded,
    closeStagingDrawer: launcherRuntime.stagingQueue.closeStagingDrawer
  });
  const onWindowKeydown = useAppWindowKeydown({
    isSettingsWindow: context.isSettingsWindow,
    settingsWindow: context.settingsWindow,
    closeSettingsWindow,
    stagingQueue: launcherRuntime.stagingQueue,
    commandExecution: launcherRuntime.commandExecution,
    searchInputRef: context.domBridge.searchInputRef,
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

  useAppLifecycleBridge({
    runtime: {
      isSettingsWindow: context.isSettingsWindow,
      isTauriRuntime: isTauri,
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
    readLauncherHotkey,
    launcherHotkey: context.hotkeyBindings.launcherHotkey,
    scheduleSearchInputFocus: context.scheduleSearchInputFocus,
    onMainReady: () => {
      if (!isTauri()) {
        return;
      }

      void maybeCheckForUpdateAtStartup({
        enabled: context.autoCheckUpdate.value,
        storage: window.localStorage
      }).then((result) => {
        if (!result.available) {
          return;
        }

        const version = result.version?.trim() || "";
        launcherRuntime.commandExecution.setExecutionFeedback(
          "neutral",
          t("settings.about.updateAvailable", { version })
        );
      });
    },
    onSettingsReady: () => {
      if (!isTauri()) return;
      invoke("open_settings_window").catch((error) => {
        console.error("open_settings_window invoke failed", {
          windowLabel: context.currentWindowLabel.value,
          error
        });
      });
    }
  });

  useLauncherWatcherBindings({
    drawerOpen: launcherRuntime.layoutMetrics.drawerOpen,
    drawerVisibleRows: launcherRuntime.layoutMetrics.drawerVisibleRows,
    stagingVisibleRows: launcherRuntime.layoutMetrics.stagingVisibleRows,
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
    closeSettingsWindow,
    hideMainWindow
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
