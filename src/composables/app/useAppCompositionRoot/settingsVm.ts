import { computed } from "vue";
import type { CommandManagementViewState } from "../../../features/settings/types";
import type { HotkeyFieldId } from "../../../stores/settingsStore";
import type { createAppCompositionContext } from "./context";

type AppCompositionContext = ReturnType<typeof createAppCompositionContext>;

interface SettingsMutationHandlers {
  applyHotkeyChange: (fieldId: HotkeyFieldId, value: string) => void;
  toggleCommandEnabled: (commandId: string, enabled: boolean) => void;
  setFilteredCommandsEnabled: (enabled: boolean) => void;
  updateCommandView: (patch: Partial<CommandManagementViewState>) => void;
  resetCommandFilters: () => void;
  setWindowOpacity: (value: number) => void;
  setTheme: (value: string) => void;
  setBlurEnabled: (value: boolean) => void;
}

export function createSettingsVm(
  context: AppCompositionContext,
  settingsMutationHandlers: SettingsMutationHandlers
) {
  return {
    settingsNavItems: context.settingsWindow.settingsNavItems,
    settingsRoute: context.settingsWindow.settingsRoute,
    hotkeyGlobalFields: context.settingsWindow.hotkeyGlobalFields,
    hotkeySearchFields: context.settingsWindow.hotkeySearchFields,
    hotkeyQueueFields: context.settingsWindow.hotkeyQueueFields,
    getHotkeyValue: context.hotkeyBindings.getHotkeyValue,
    hotkeyErrorFields: context.settingsWindow.settingsErrorHotkeyFieldIds,
    hotkeyErrorMessage: context.settingsWindow.settingsError,
    availableTerminals: context.settingsWindow.availableTerminals,
    terminalLoading: context.settingsWindow.terminalLoading,
    defaultTerminal: context.defaultTerminal,
    terminalReusePolicy: context.terminalReusePolicy,
    language: context.language,
    autoCheckUpdate: context.autoCheckUpdate,
    launchAtLogin: context.launchAtLogin,
    alwaysElevatedTerminal: context.alwaysElevatedTerminal,
    showAlwaysElevatedTerminal: computed(() => context.runtimePlatform.value === "win"),
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
    navigateSettings: context.settingsWindow.navigateSettings,
    applyHotkeyChange: settingsMutationHandlers.applyHotkeyChange,
    selectTerminalOption: context.settingsWindow.selectTerminalOption,
    selectLanguageOption: context.settingsWindow.selectLanguageOption,
    setAutoCheckUpdate: context.settingsWindow.setAutoCheckUpdate,
    setLaunchAtLogin: context.settingsWindow.setLaunchAtLogin,
    setAlwaysElevatedTerminal: context.settingsWindow.setAlwaysElevatedTerminal,
    setTerminalReusePolicy: context.settingsWindow.setTerminalReusePolicy,
    toggleCommandEnabled: settingsMutationHandlers.toggleCommandEnabled,
    setFilteredCommandsEnabled: settingsMutationHandlers.setFilteredCommandsEnabled,
    updateCommandView: settingsMutationHandlers.updateCommandView,
    resetCommandFilters: settingsMutationHandlers.resetCommandFilters,
    windowOpacity: context.windowOpacity,
    theme: context.theme,
    blurEnabled: context.blurEnabled,
    themes: context.themeManager.themes,
    setWindowOpacity: settingsMutationHandlers.setWindowOpacity,
    setTheme: settingsMutationHandlers.setTheme,
    setBlurEnabled: settingsMutationHandlers.setBlurEnabled,
    checkUpdate: context.checkUpdate,
    downloadUpdate: context.downloadUpdate,
    openHomepage: context.openHomepage
  };
}
