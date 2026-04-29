import { computed, proxyRefs } from "vue";
import type { CommandManagementViewState } from "../../../features/settings/types";
import type {
  HotkeyFieldId,
  PointerActionFieldId,
  SearchResultPointerAction
} from "../../../stores/settingsStore";
import type { createAppCompositionContext } from "./context";

export type SettingsVmContext = Pick<
  ReturnType<typeof createAppCompositionContext>,
  "settingsScene"
>;

interface SettingsMutationHandlers {
  applyHotkeyChange: (fieldId: HotkeyFieldId, value: string) => void;
  applyPointerActionChange: (
    fieldId: PointerActionFieldId,
    action: SearchResultPointerAction
  ) => void;
  toggleCommandEnabled: (commandId: string, enabled: boolean) => void;
  setFilteredCommandsEnabled: (enabled: boolean) => void;
  updateCommandView: (patch: Partial<CommandManagementViewState>) => void;
  resetCommandFilters: () => void;
  setWindowOpacity: (value: number) => void;
  setTheme: (value: string) => void;
  setMotionPreset: (value: string) => void;
  setBlurEnabled: (value: boolean) => void;
}

export function createSettingsVm(
  context: SettingsVmContext,
  settingsMutationHandlers: SettingsMutationHandlers
) {
  const scene = context.settingsScene;

  return proxyRefs({
    settingsNavItems: scene.settingsWindow.settingsNavItems,
    settingsRoute: scene.settingsWindow.settingsRoute,
    hotkeyGlobalFields: scene.settingsWindow.hotkeyGlobalFields,
    hotkeySearchFields: scene.settingsWindow.hotkeySearchFields,
    hotkeyQueueFields: scene.settingsWindow.hotkeyQueueFields,
    pointerActionFields: scene.settingsWindow.pointerActionFields,
    pointerActionOptions: scene.settingsWindow.pointerActionOptions,
    getHotkeyValue: scene.hotkeyBindings.getHotkeyValue,
    getPointerActionValue: scene.settingsWindow.getPointerActionValue,
    hotkeyErrorFields: scene.settingsWindow.settingsErrorHotkeyFieldIds,
    hotkeyErrorMessage: scene.settingsWindow.settingsError,
    availableTerminals: scene.settingsWindow.availableTerminals,
    terminalLoading: scene.settingsWindow.terminalLoading,
    refreshAvailableTerminals: scene.settingsWindow.refreshAvailableTerminals,
    defaultTerminal: scene.defaultTerminal,
    language: scene.language,
    autoCheckUpdate: scene.autoCheckUpdate,
    launchAtLogin: scene.launchAtLogin,
    alwaysElevatedTerminal: scene.alwaysElevatedTerminal,
    generalErrorMessage: scene.settingsWindow.generalErrorMessage,
    showAlwaysElevatedTerminal: computed(() => scene.updateManager.runtimePlatform.value === "win"),
    selectedTerminalPath: scene.settingsWindow.selectedTerminalPath,
    languageOptions: scene.settingsWindow.languageOptions,
    appVersion: scene.appVersion,
    runtimePlatform: scene.updateManager.runtimePlatform,
    updateStatus: scene.updateManager.updateStatus,
    homepageActionStatus: scene.homepageActionStatus,
    commandRows: scene.commandManagement.commandRows,
    visibleCommandRows: scene.commandManagement.visibleCommandRows,
    commandSummary: scene.commandManagement.commandSummary,
    commandLoadIssues: scene.commandManagement.commandLoadIssues,
    commandFilteredCount: scene.commandManagement.commandFilteredCount,
    renderedCommandRowCount: scene.commandManagement.renderedCommandRowCount,
    commandView: scene.commandManagement.commandView,
    commandSourceOptions: scene.commandManagement.commandSourceOptions,
    commandStatusOptions: scene.commandManagement.commandStatusOptions,
    commandCategoryOptions: scene.commandManagement.commandCategoryOptions,
    commandOverrideOptions: scene.commandManagement.commandOverrideOptions,
    commandIssueOptions: scene.commandManagement.commandIssueOptions,
    commandSortOptions: scene.commandManagement.commandSortOptions,
    commandSourceFileOptions: scene.commandManagement.commandSourceFileOptions,
    advanceVisibleCommandRows: scene.commandManagement.advanceVisibleCommandRows,
    navigateSettings: scene.settingsWindow.navigateSettings,
    applyHotkeyChange: settingsMutationHandlers.applyHotkeyChange,
    applyPointerActionChange: settingsMutationHandlers.applyPointerActionChange,
    selectTerminalOption: scene.settingsWindow.selectTerminalOption,
    selectLanguageOption: scene.settingsWindow.selectLanguageOption,
    setAutoCheckUpdate: scene.settingsWindow.setAutoCheckUpdate,
    setLaunchAtLogin: scene.settingsWindow.setLaunchAtLogin,
    setAlwaysElevatedTerminal: scene.settingsWindow.setAlwaysElevatedTerminal,
    toggleCommandEnabled: settingsMutationHandlers.toggleCommandEnabled,
    setFilteredCommandsEnabled: settingsMutationHandlers.setFilteredCommandsEnabled,
    updateCommandView: settingsMutationHandlers.updateCommandView,
    resetCommandFilters: settingsMutationHandlers.resetCommandFilters,
    windowOpacity: scene.windowOpacity,
    theme: scene.theme,
    blurEnabled: scene.blurEnabled,
    motionPreset: scene.motionPreset,
    themes: scene.themeManager.themes,
    motionPresets: scene.motionPresetManager.motionPresets,
    setWindowOpacity: settingsMutationHandlers.setWindowOpacity,
    setTheme: settingsMutationHandlers.setTheme,
    setMotionPreset: settingsMutationHandlers.setMotionPreset,
    setBlurEnabled: settingsMutationHandlers.setBlurEnabled,
    checkUpdate: scene.updateManager.checkUpdate,
    downloadUpdate: scene.updateManager.downloadUpdate,
    openHomepage: scene.openHomepage
  });
}
