import { ref } from "vue";
import type { CommandManagementViewState } from "../../../features/settings/types";
import type { HotkeyFieldId } from "../../../stores/settingsStore";
import type { createAppCompositionContext } from "./context";
import type { createAppCompositionRuntime } from "./runtime";

type AppCompositionContext = ReturnType<typeof createAppCompositionContext>;
type AppCompositionRuntime = ReturnType<typeof createAppCompositionRuntime>;

const SETTINGS_SAVED_TOAST_DISMISS_DELAY_MS = 2200;

function createSettingsMutationHandlers(context: AppCompositionContext) {
  let settingsSavedTimer: ReturnType<typeof setTimeout> | null = null;
  const settingsSaved = ref(false);

  function clearSettingsSavedTimer(): void {
    if (!settingsSavedTimer) {
      return;
    }
    clearTimeout(settingsSavedTimer);
    settingsSavedTimer = null;
  }

  function resetSavedToast(): void {
    settingsSaved.value = false;
    clearSettingsSavedTimer();
  }

  function markSavedToast(): void {
    resetSavedToast();
    settingsSaved.value = true;
    settingsSavedTimer = setTimeout(() => {
      settingsSaved.value = false;
      settingsSavedTimer = null;
    }, SETTINGS_SAVED_TOAST_DISMISS_DELAY_MS);
  }

  function persistImmediate(): void {
    resetSavedToast();
    void context.settingsWindow.persistSetting().then(() => {
      if (!context.settingsWindow.settingsError.value) {
        markSavedToast();
      }
    });
  }

  return {
    settingsSaved,
    clearSettingsSavedTimer,
    applyHotkeyChange(fieldId: HotkeyFieldId, value: string): void {
      resetSavedToast();
      void context.settingsWindow.applyHotkeyChange(fieldId, value).then(() => {
        if (!context.settingsWindow.settingsError.value) {
          markSavedToast();
        }
      });
    },
    toggleCommandEnabled(commandId: string, enabled: boolean): void {
      context.commandManagement.toggleCommandEnabled(commandId, enabled);
      persistImmediate();
    },
    setFilteredCommandsEnabled(enabled: boolean): void {
      context.commandManagement.setFilteredCommandsEnabled(enabled);
      persistImmediate();
    },
    updateCommandView(patch: Partial<CommandManagementViewState>): void {
      context.commandManagement.updateCommandView(patch);
    },
    resetCommandFilters(): void {
      context.commandManagement.resetCommandFilters();
    },
    setWindowOpacity(value: number): void {
      context.setWindowOpacity(value);
      persistImmediate();
    },
    setTheme(value: string): void {
      context.setTheme(value);
      persistImmediate();
    },
    setBlurEnabled(value: boolean): void {
      context.setBlurEnabled(value);
      persistImmediate();
    },
    async saveSettings(): Promise<void> {
      resetSavedToast();
      await context.settingsWindow.persistSetting();
      if (!context.settingsWindow.settingsError.value) {
        markSavedToast();
      }
    }
  };
}

function createSettingsWindowProps(context: AppCompositionContext) {
  const closeConfirmOpen = ref(false);

  return {
    settingsNavItems: context.settingsWindow.settingsNavItems,
    settingsRoute: context.settingsWindow.settingsRoute,
    settingsErrorRoute: context.settingsWindow.settingsErrorRoute,
    hotkeyGlobalFields: context.settingsWindow.hotkeyGlobalFields,
    hotkeySearchFields: context.settingsWindow.hotkeySearchFields,
    hotkeyQueueFields: context.settingsWindow.hotkeyQueueFields,
    getHotkeyValue: context.hotkeyBindings.getHotkeyValue,
    isHotkeyRecording: context.settingsWindow.isHotkeyRecording,
    getHotkeyDisplay: context.settingsWindow.getHotkeyDisplay,
    hotkeyErrorFields: context.settingsWindow.settingsErrorHotkeyFieldIds,
    hotkeyErrorPrimaryField: context.settingsWindow.settingsErrorPrimaryHotkeyField,
    hotkeyErrorMessage: context.settingsWindow.settingsError,
    availableTerminals: context.settingsWindow.availableTerminals,
    terminalLoading: context.settingsWindow.terminalLoading,
    defaultTerminal: context.defaultTerminal,
    language: context.language,
    autoCheckUpdate: context.autoCheckUpdate,
    launchAtLogin: context.launchAtLogin,
    alwaysElevatedTerminal: context.alwaysElevatedTerminal,
    selectedTerminalPath: context.settingsWindow.selectedTerminalPath,
    languageOptions: context.settingsWindow.languageOptions,
    appVersion: context.appVersion,
    runtimePlatform: context.runtimePlatform,
    updateStatus: context.updateStatus,
    commandRows: context.commandManagement.commandRows,
    commandSummary: context.commandManagement.commandSummary,
    commandLoadIssues: context.commandManagement.commandLoadIssues,
    commandFilteredCount: context.commandManagement.commandFilteredCount,
    commandView: context.commandManagement.commandView,
    commandSourceOptions: context.commandManagement.commandSourceOptions,
    commandStatusOptions: context.commandManagement.commandStatusOptions,
    commandCategoryOptions: context.commandManagement.commandCategoryOptions,
    commandOverrideOptions: context.commandManagement.commandOverrideOptions,
    commandIssueOptions: context.commandManagement.commandIssueOptions,
    commandSortOptions: context.commandManagement.commandSortOptions,
    commandDisplayModeOptions: context.commandManagement.commandDisplayModeOptions,
    commandSourceFileOptions: context.commandManagement.commandSourceFileOptions,
    commandGroups: context.commandManagement.commandGroups,
    settingsError: context.settingsWindow.settingsError,
    settingsCloseConfirmOpen: closeConfirmOpen,
    cancelSettingsCloseConfirm: () => {},
    discardUnsavedSettingsChanges: () => {},
    navigateSettings: context.settingsWindow.navigateSettings,
    startHotkeyRecording: context.settingsWindow.startHotkeyRecording,
    selectTerminalOption: context.settingsWindow.selectTerminalOption,
    selectLanguageOption: context.settingsWindow.selectLanguageOption,
    setAutoCheckUpdate: context.settingsWindow.setAutoCheckUpdate,
    setLaunchAtLogin: context.settingsWindow.setLaunchAtLogin,
    setAlwaysElevatedTerminal: context.settingsWindow.setAlwaysElevatedTerminal,
    windowOpacity: context.windowOpacity,
    theme: context.theme,
    blurEnabled: context.blurEnabled,
    themes: context.themeManager.themes,
    checkUpdate: context.checkUpdate,
    downloadUpdate: context.downloadUpdate,
    openHomepage: context.openHomepage
  };
}

export function createAppCompositionViewModel(
  context: AppCompositionContext,
  runtime: AppCompositionRuntime
) {
  const settingsMutationHandlers = createSettingsMutationHandlers(context);
  const settingsWindowProps = createSettingsWindowProps(context);

  function submitParamInput(): boolean {
    return runtime.commandExecution.submitParamInput();
  }

  return {
    isSettingsWindow: context.isSettingsWindow,
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
    setStagingGripReorderActive: (value: boolean) => {
      context.stagingGripReorderActive.value = value;
    },
    onQueryInput: context.search.onQueryInput,
    stageResult: runtime.commandExecution.stageResult, executeResult: runtime.commandExecution.executeResult,
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
    notifyFlowPanelHeightChange: runtime.notifyFlowPanelHeightChange,
    notifyFlowPanelSettled: runtime.notifyFlowPanelSettled,
    notifySearchPageSettled: runtime.notifySearchPageSettled,
    updatePendingArgValue: runtime.commandExecution.updatePendingArgValue,
    confirmSafetyExecution: runtime.commandExecution.confirmSafetyExecution,
    cancelSafetyExecution: runtime.commandExecution.cancelSafetyExecution,
    ...settingsWindowProps,
    settingsSaved: settingsMutationHandlers.settingsSaved,
    applyHotkeyChange: settingsMutationHandlers.applyHotkeyChange,
    toggleCommandEnabled: settingsMutationHandlers.toggleCommandEnabled,
    setFilteredCommandsEnabled: settingsMutationHandlers.setFilteredCommandsEnabled,
    updateCommandView: settingsMutationHandlers.updateCommandView,
    resetCommandFilters: settingsMutationHandlers.resetCommandFilters,
    closeSettingsWindow: runtime.closeSettingsWindow,
    forceCloseSettingsWindow: runtime.forceCloseSettingsWindow,
    hideMainWindow: runtime.hideMainWindow,
    setWindowOpacity: settingsMutationHandlers.setWindowOpacity,
    setTheme: settingsMutationHandlers.setTheme,
    setBlurEnabled: settingsMutationHandlers.setBlurEnabled,
    saveSettings: settingsMutationHandlers.saveSettings,
    setExecutionFeedback: runtime.commandExecution.setExecutionFeedback
  };
}
