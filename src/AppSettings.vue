<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { isTypingElement } from "./composables/launcher/useMainWindowShell";
import type {
  HotkeyFieldId,
  PointerActionFieldId,
  SearchResultPointerAction
} from "./stores/settingsStore";
import { createAppCompositionRootPorts } from "./composables/app/useAppCompositionRoot/ports";
import { createSettingsScene } from "./composables/app/useAppCompositionRoot/settingsScene";
import { shouldDeferGlobalEscape } from "./features/hotkeys/escapeOwnership";
import {
  SETTINGS_STORAGE_KEYS
} from "./composables/app/useAppCompositionRoot/constants";
import type { CommandManagementViewState } from "./features/settings/types";
import SettingsWindow from "./components/settings/SettingsWindow.vue";

const ports = createAppCompositionRootPorts();
const isSettingsWindow = ref(true);
const settingsSyncChannel = ref<BroadcastChannel | null>(null);
const settingsStorageKeys: readonly string[] = SETTINGS_STORAGE_KEYS;
const settingsScene = createSettingsScene({
  ports,
  isSettingsWindow,
  settingsSyncChannel
});
const {
  settingsStore,
  hotkeyBindings,
  defaultTerminal,
  terminalReusePolicy,
  language,
  autoCheckUpdate,
  launchAtLogin,
  alwaysElevatedTerminal,
  windowOpacity,
  theme,
  blurEnabled,
  motionPreset,
  appVersion,
  themeManager,
  motionPresetManager
} = settingsScene;
const settingsWindow = settingsScene.settingsWindow;
const commandManagement = settingsScene.commandManagement;
const updateManager = settingsScene.updateManager;

const {
  settingsNavItems,
  settingsRoute,
  hotkeyGlobalFields,
  hotkeySearchFields,
  hotkeyQueueFields,
  pointerActionFields,
  pointerActionOptions,
  settingsErrorHotkeyFieldIds,
  settingsError,
  availableTerminals,
  terminalLoading,
  selectedTerminalPath,
  languageOptions,
  navigateSettings,
  applySettingsRouteFromHash,
  onSettingsHashChange,
  selectTerminalOption,
  selectLanguageOption,
  setAutoCheckUpdate: setAutoCheckUpdateSetting,
  setLaunchAtLogin: setLaunchAtLoginSetting,
  setAlwaysElevatedTerminal: setAlwaysElevatedTerminalSetting,
  setTerminalReusePolicy: setTerminalReusePolicySetting,
  loadSettings: loadSettingsSetting,
  loadAvailableTerminals: loadAvailableTerminalsSetting,
  persistSetting: persistSettingSetting,
  applyHotkeyChange: applyHotkeyChangeSetting,
  getPointerActionValue,
  applyPointerActionChange: applyPointerActionChangeSetting
} = settingsWindow;

const {
  commandRows,
  commandSummary,
  commandLoadIssues,
  commandFilteredCount,
  commandView,
  commandSourceOptions,
  commandStatusOptions,
  commandCategoryOptions,
  commandOverrideOptions,
  commandIssueOptions,
  commandSortOptions,
  commandDisplayModeOptions,
  commandSourceFileOptions,
  commandGroups,
  toggleCommandEnabled: toggleCommandEnabledAction,
  setFilteredCommandsEnabled: setFilteredCommandsEnabledAction,
  updateCommandView: updateCommandViewAction,
  resetCommandFilters: resetCommandFiltersAction
} = commandManagement;

const {
  updateStatus,
  runtimePlatform,
  checkUpdate,
  downloadUpdate,
  loadRuntimePlatform
} = updateManager;

function persistImmediate(): void {
  void persistSettingSetting();
}

function onUpdateHotkey(fieldId: HotkeyFieldId, value: string): void {
  void applyHotkeyChangeSetting(fieldId, value);
}

function onUpdatePointerAction(
  fieldId: PointerActionFieldId,
  value: SearchResultPointerAction
): void {
  void applyPointerActionChangeSetting(fieldId, value);
}

function toggleCommandEnabled(commandId: string, enabled: boolean): void {
  toggleCommandEnabledAction(commandId, enabled);
  persistImmediate();
}

function setFilteredCommandsEnabled(enabled: boolean): void {
  setFilteredCommandsEnabledAction(enabled);
  persistImmediate();
}

function updateCommandView(patch: Partial<CommandManagementViewState>): void {
  updateCommandViewAction(patch);
}

function resetCommandFilters(): void {
  resetCommandFiltersAction();
}

function updateOpacity(value: number): void {
  settingsStore.setWindowOpacity(value);
  persistImmediate();
}

function updateTheme(value: string): void {
  settingsStore.setTheme(value);
  persistImmediate();
}

function updateMotionPreset(value: string): void {
  settingsScene.settingsStore.setMotionPreset(value);
  persistImmediate();
}

function updateBlurEnabled(value: boolean): void {
  settingsStore.setBlurEnabled(value);
  persistImmediate();
}

async function openHomepage(): Promise<void> {
  await settingsScene.openHomepage();
}

function onSettingsStorageChanged(event: StorageEvent): void {
  if (!event.key || settingsStorageKeys.includes(event.key)) {
    loadSettingsSetting();
  }
}

function onSettingsBroadcast(event: MessageEvent): void {
  if (event.data && event.data.type === "settings-updated") {
    loadSettingsSetting();
  }
}

function onWindowKeydown(event: KeyboardEvent): void {
  if (event.key !== "Escape" || event.defaultPrevented) {
    return;
  }
  if (
    shouldDeferGlobalEscape(event, {
      isTypingTarget: isTypingElement
    })
  ) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (ports.isTauriRuntime()) {
    void ports.getCurrentWindow().close();
  }
}

async function loadLauncherHotkey(): Promise<void> {
  if (!ports.isTauriRuntime()) {
    return;
  }

  try {
    const currentLauncherHotkey = await ports.readLauncherHotkey();
    if (currentLauncherHotkey) {
      hotkeyBindings.launcherHotkey.value = currentLauncherHotkey;
    }
  } catch (error) {
    console.warn("launcher hotkey read failed", error);
  }
}

async function showSettingsWindowWhenReady(): Promise<void> {
  if (!ports.isTauriRuntime()) {
    return;
  }

  try {
    await ports.invoke("show_settings_window_when_ready");
  } catch (error) {
    ports.logError("show_settings_window_when_ready invoke failed", error);
  }
}

onMounted(async () => {
  loadSettingsSetting();
  applySettingsRouteFromHash(true);
  window.addEventListener("hashchange", onSettingsHashChange);
  window.addEventListener("storage", onSettingsStorageChanged);
  window.addEventListener("keydown", onWindowKeydown);

  if (typeof BroadcastChannel !== "undefined") {
    settingsSyncChannel.value = new BroadcastChannel("zapcmd-settings-sync");
    settingsSyncChannel.value.addEventListener("message", onSettingsBroadcast);
  }

  await nextTick();
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
  await showSettingsWindowWhenReady();

  void loadRuntimePlatform();
  await loadAvailableTerminalsSetting();
  await loadLauncherHotkey();
});

onBeforeUnmount(() => {
  window.removeEventListener("hashchange", onSettingsHashChange);
  window.removeEventListener("storage", onSettingsStorageChanged);
  window.removeEventListener("keydown", onWindowKeydown);

  if (settingsSyncChannel.value) {
    settingsSyncChannel.value.removeEventListener("message", onSettingsBroadcast);
    settingsSyncChannel.value.close();
    settingsSyncChannel.value = null;
  }
});
</script>

<template>
  <SettingsWindow
    :settings-nav-items="settingsNavItems"
    :settings-route="settingsRoute"
    :hotkey-global-fields="hotkeyGlobalFields"
    :hotkey-search-fields="hotkeySearchFields"
    :hotkey-queue-fields="hotkeyQueueFields"
    :pointer-action-fields="pointerActionFields"
    :pointer-action-options="pointerActionOptions"
    :get-hotkey-value="hotkeyBindings.getHotkeyValue"
    :get-pointer-action-value="getPointerActionValue"
    :hotkey-error-fields="settingsErrorHotkeyFieldIds"
    :hotkey-error-message="settingsError"
    :available-terminals="availableTerminals"
    :terminal-loading="terminalLoading"
    :default-terminal="defaultTerminal"
    :terminal-reuse-policy="terminalReusePolicy"
    :selected-terminal-path="selectedTerminalPath"
    :language="language"
    :language-options="languageOptions"
    :auto-check-update="autoCheckUpdate"
    :launch-at-login="launchAtLogin"
    :always-elevated-terminal="alwaysElevatedTerminal"
    :show-always-elevated-terminal="runtimePlatform === 'win'"
    :command-rows="commandRows"
    :command-summary="commandSummary"
    :command-load-issues="commandLoadIssues"
    :command-filtered-count="commandFilteredCount"
    :command-view="commandView"
    :command-source-options="commandSourceOptions"
    :command-status-options="commandStatusOptions"
    :command-category-options="commandCategoryOptions"
    :command-override-options="commandOverrideOptions"
    :command-issue-options="commandIssueOptions"
    :command-sort-options="commandSortOptions"
    :command-display-mode-options="commandDisplayModeOptions"
    :command-source-file-options="commandSourceFileOptions"
    :command-groups="commandGroups"
    :app-version="appVersion"
    :runtime-platform="runtimePlatform"
    :update-status="updateStatus"
    :window-opacity="windowOpacity"
    :theme="theme"
    :blur-enabled="blurEnabled"
    :motion-preset="motionPreset"
    :themes="themeManager.themes"
    :motion-presets="motionPresetManager.motionPresets"
    @navigate="navigateSettings"
    @update-hotkey="onUpdateHotkey"
    @update-pointer-action="onUpdatePointerAction"
    @select-terminal="selectTerminalOption"
    @select-language="selectLanguageOption"
    @set-auto-check-update="setAutoCheckUpdateSetting"
    @set-launch-at-login="setLaunchAtLoginSetting"
    @set-always-elevated-terminal="setAlwaysElevatedTerminalSetting"
    @set-terminal-reuse-policy="setTerminalReusePolicySetting"
    @toggle-command-enabled="toggleCommandEnabled"
    @set-filtered-commands-enabled="setFilteredCommandsEnabled"
    @update-command-view="updateCommandView"
    @reset-command-filters="resetCommandFilters"
    @update-opacity="updateOpacity"
    @update-theme="updateTheme"
    @update-motion-preset="updateMotionPreset"
    @update-blur-enabled="updateBlurEnabled"
    @check-update="checkUpdate"
    @download-update="downloadUpdate"
    @open-homepage="openHomepage"
  />
</template>
