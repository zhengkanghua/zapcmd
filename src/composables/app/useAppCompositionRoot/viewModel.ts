import type { CommandManagementViewState } from "../../../features/settings/types";
import type { createAppCompositionContext } from "./context";
import type { createAppCompositionRuntime } from "./runtime";

type AppCompositionContext = ReturnType<typeof createAppCompositionContext>;
type AppCompositionRuntime = ReturnType<typeof createAppCompositionRuntime>;

function createSettingsMutationHandlers(context: AppCompositionContext) {
  function markDirty(): void {
    context.settingsWindow.settingsDirty.value = true;
    context.settingsWindow.settingsSaved.value = false;
  }

  return {
    toggleCommandEnabled(commandId: string, enabled: boolean): void {
      markDirty();
      context.commandManagement.toggleCommandEnabled(commandId, enabled);
    },
    setFilteredCommandsEnabled(enabled: boolean): void {
      markDirty();
      context.commandManagement.setFilteredCommandsEnabled(enabled);
    },
    updateCommandView(patch: Partial<CommandManagementViewState>): void {
      markDirty();
      context.commandManagement.updateCommandView(patch);
    },
    resetCommandFilters(): void {
      markDirty();
      context.commandManagement.resetCommandFilters();
    },
    setWindowOpacity(value: number): void {
      markDirty();
      context.setWindowOpacity(value);
    }
  };
}

export function createAppCompositionViewModel(
  context: AppCompositionContext,
  runtime: AppCompositionRuntime
) {
  const settingsMutationHandlers = createSettingsMutationHandlers(context);

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
    keyboardHintText: context.hotkeyBindings.keyboardHintText,
    filteredResults: context.search.filteredResults,
    activeIndex: context.search.activeIndex,
    stagedFeedbackCommandId: context.stagedFeedback.stagedFeedbackCommandId,
    stagedCommands: context.stagedCommands,
    stagingDrawerState: runtime.stagingQueue.stagingDrawerState,
    stagingHintText: context.hotkeyBindings.stagingHintText,
    stagingListShouldScroll: runtime.layoutMetrics.stagingListShouldScroll,
    stagingListMaxHeight: runtime.layoutMetrics.stagingListMaxHeight,
    focusZone: runtime.stagingQueue.focusZone,
    stagingActiveIndex: runtime.stagingQueue.stagingActiveIndex,
    pendingCommand: runtime.commandExecution.pendingCommand,
    pendingArgs: runtime.pendingArgs,
    pendingArgValues: runtime.commandExecution.pendingArgValues,
    pendingSubmitHint: runtime.pendingSubmitHint,
    pendingSubmitMode: runtime.commandExecution.pendingSubmitMode,
    safetyDialog: runtime.commandExecution.safetyDialog,
    setSearchShellRef: context.domBridge.setSearchShellRef,
    setSearchInputRef: context.domBridge.setSearchInputRef,
    setDrawerRef: context.domBridge.setDrawerRef,
    setStagingPanelRef: context.domBridge.setStagingPanelRef,
    setStagingListRef: context.domBridge.setStagingListRef,
    setResultButtonRef: context.domBridge.setResultButtonRef,
    setParamInputRef: context.domBridge.setParamInputRef,
    onQueryInput: context.search.onQueryInput,
    stageResult: runtime.commandExecution.stageResult,
    toggleStaging: runtime.stagingQueue.toggleStaging,
    onStagingDragStart: runtime.stagingQueue.onStagingDragStart,
    onStagingDragOver: runtime.stagingQueue.onStagingDragOver,
    onStagingDragEnd: runtime.stagingQueue.onStagingDragEnd,
    onFocusStagingIndex: runtime.stagingQueue.onFocusStagingIndex,
    removeStagedCommand: runtime.commandExecution.removeStagedCommand,
    updateStagedArg: runtime.commandExecution.updateStagedArg,
    clearStaging: runtime.commandExecution.clearStaging,
    executeStaged: runtime.commandExecution.executeStaged,
    submitParamInput: runtime.commandExecution.submitParamInput,
    cancelParamInput: runtime.commandExecution.cancelParamInput,
    updatePendingArgValue: runtime.commandExecution.updatePendingArgValue,
    confirmSafetyExecution: runtime.commandExecution.confirmSafetyExecution,
    cancelSafetyExecution: runtime.commandExecution.cancelSafetyExecution,
    settingsNavItems: context.settingsWindow.settingsNavItems,
    settingsRoute: context.settingsWindow.settingsRoute,
    settingsErrorRoute: context.settingsWindow.settingsErrorRoute,
    hotkeyGlobalFields: context.settingsWindow.hotkeyGlobalFields,
    hotkeySearchFields: context.settingsWindow.hotkeySearchFields,
    hotkeyQueueFields: context.settingsWindow.hotkeyQueueFields,
    isHotkeyRecording: context.settingsWindow.isHotkeyRecording,
    getHotkeyDisplay: context.settingsWindow.getHotkeyDisplay,
    hotkeyErrorFields: context.settingsWindow.settingsErrorHotkeyFields,
    hotkeyErrorPrimaryField: context.settingsWindow.settingsErrorPrimaryHotkeyField,
    availableTerminals: context.settingsWindow.availableTerminals,
    terminalLoading: context.settingsWindow.terminalLoading,
    terminalDropdownOpen: context.settingsWindow.terminalDropdownOpen,
    terminalFocusIndex: context.settingsWindow.terminalFocusIndex,
    defaultTerminal: context.defaultTerminal,
    language: context.language,
    autoCheckUpdate: context.autoCheckUpdate,
    launchAtLogin: context.launchAtLogin,
    selectedTerminalOption: context.settingsWindow.selectedTerminalOption,
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
    commandOverrideOptions: context.commandManagement.commandOverrideOptions,
    commandIssueOptions: context.commandManagement.commandIssueOptions,
    commandSortOptions: context.commandManagement.commandSortOptions,
    commandDisplayModeOptions: context.commandManagement.commandDisplayModeOptions,
    commandSourceFileOptions: context.commandManagement.commandSourceFileOptions,
    commandGroups: context.commandManagement.commandGroups,
    settingsError: context.settingsWindow.settingsError,
    settingsSaved: context.settingsWindow.settingsSaved,
    navigateSettings: context.settingsWindow.navigateSettings,
    startHotkeyRecording: context.settingsWindow.startHotkeyRecording,
    toggleTerminalDropdown: context.settingsWindow.toggleTerminalDropdown,
    selectTerminalOption: context.settingsWindow.selectTerminalOption,
    selectLanguageOption: context.settingsWindow.selectLanguageOption,
    setAutoCheckUpdate: context.settingsWindow.setAutoCheckUpdate,
    setLaunchAtLogin: context.settingsWindow.setLaunchAtLogin,
    toggleCommandEnabled: settingsMutationHandlers.toggleCommandEnabled,
    setFilteredCommandsEnabled: settingsMutationHandlers.setFilteredCommandsEnabled,
    updateCommandView: settingsMutationHandlers.updateCommandView,
    resetCommandFilters: settingsMutationHandlers.resetCommandFilters,
    checkUpdate: context.checkUpdate,
    downloadUpdate: context.downloadUpdate,
    openHomepage: context.openHomepage,
    closeSettingsWindow: runtime.closeSettingsWindow,
    forceCloseSettingsWindow: runtime.forceCloseSettingsWindow,
    hideMainWindow: runtime.hideMainWindow,
    saveSettings: context.settingsWindow.saveSettings,
    windowOpacity: context.windowOpacity,
    setWindowOpacity: settingsMutationHandlers.setWindowOpacity
  };
}
