import { computed, proxyRefs } from "vue";
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
  const scene = context.settingsScene;

  return proxyRefs({
    settingsNavItems: scene.settingsWindow.settingsNavItems,
    settingsRoute: scene.settingsWindow.settingsRoute,
    hotkeyGlobalFields: scene.settingsWindow.hotkeyGlobalFields,
    hotkeySearchFields: scene.settingsWindow.hotkeySearchFields,
    hotkeyQueueFields: scene.settingsWindow.hotkeyQueueFields,
    getHotkeyValue: scene.hotkeyBindings.getHotkeyValue,
    hotkeyErrorFields: scene.settingsWindow.settingsErrorHotkeyFieldIds,
    hotkeyErrorMessage: scene.settingsWindow.settingsError,
    availableTerminals: scene.settingsWindow.availableTerminals,
    terminalLoading: scene.settingsWindow.terminalLoading,
    defaultTerminal: scene.defaultTerminal,
    terminalReusePolicy: scene.terminalReusePolicy,
    language: scene.language,
    autoCheckUpdate: scene.autoCheckUpdate,
    launchAtLogin: scene.launchAtLogin,
    alwaysElevatedTerminal: scene.alwaysElevatedTerminal,
    showAlwaysElevatedTerminal: computed(() => scene.updateManager.runtimePlatform.value === "win"),
    selectedTerminalPath: scene.settingsWindow.selectedTerminalPath,
    languageOptions: scene.settingsWindow.languageOptions,
    appVersion: scene.appVersion,
    runtimePlatform: scene.updateManager.runtimePlatform,
    updateStatus: scene.updateManager.updateStatus,
    commandRows: scene.commandManagement.commandRows,
    commandSummary: scene.commandManagement.commandSummary,
    commandLoadIssues: scene.commandManagement.commandLoadIssues,
    commandFilteredCount: scene.commandManagement.commandFilteredCount,
    commandView: scene.commandManagement.commandView,
    commandSourceOptions: scene.commandManagement.commandSourceOptions,
    commandStatusOptions: scene.commandManagement.commandStatusOptions,
    commandCategoryOptions: scene.commandManagement.commandCategoryOptions,
    commandOverrideOptions: scene.commandManagement.commandOverrideOptions,
    commandIssueOptions: scene.commandManagement.commandIssueOptions,
    commandSortOptions: scene.commandManagement.commandSortOptions,
    commandDisplayModeOptions: scene.commandManagement.commandDisplayModeOptions,
    commandSourceFileOptions: scene.commandManagement.commandSourceFileOptions,
    commandGroups: scene.commandManagement.commandGroups,
    navigateSettings: scene.settingsWindow.navigateSettings,
    applyHotkeyChange: settingsMutationHandlers.applyHotkeyChange,
    selectTerminalOption: scene.settingsWindow.selectTerminalOption,
    selectLanguageOption: scene.settingsWindow.selectLanguageOption,
    setAutoCheckUpdate: scene.settingsWindow.setAutoCheckUpdate,
    setLaunchAtLogin: scene.settingsWindow.setLaunchAtLogin,
    setAlwaysElevatedTerminal: scene.settingsWindow.setAlwaysElevatedTerminal,
    setTerminalReusePolicy: scene.settingsWindow.setTerminalReusePolicy,
    toggleCommandEnabled: settingsMutationHandlers.toggleCommandEnabled,
    setFilteredCommandsEnabled: settingsMutationHandlers.setFilteredCommandsEnabled,
    updateCommandView: settingsMutationHandlers.updateCommandView,
    resetCommandFilters: settingsMutationHandlers.resetCommandFilters,
    windowOpacity: scene.windowOpacity,
    theme: scene.theme,
    blurEnabled: scene.blurEnabled,
    themes: scene.themeManager.themes,
    setWindowOpacity: settingsMutationHandlers.setWindowOpacity,
    setTheme: settingsMutationHandlers.setTheme,
    setBlurEnabled: settingsMutationHandlers.setBlurEnabled,
    checkUpdate: scene.updateManager.checkUpdate,
    downloadUpdate: scene.updateManager.downloadUpdate,
    openHomepage: scene.openHomepage
  });
}
