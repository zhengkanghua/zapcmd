<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { currentLocale, setAppLocale } from "./i18n";
import { useSettingsStore } from "./stores/settingsStore";
import { useTheme } from "./composables/app/useTheme";
import { createAppCompositionRootPorts } from "./composables/app/useAppCompositionRoot/ports";
import { fallbackTerminalOptions } from "./features/terminals/fallbackTerminals";
import {
  HOTKEY_DEFINITIONS,
  SETTINGS_HASH_PREFIX,
  SETTINGS_STORAGE_KEYS
} from "./composables/app/useAppCompositionRoot/constants";
import { useHotkeyBindings } from "./composables/settings/useHotkeyBindings";
import { useSettingsWindow } from "./composables/settings/useSettingsWindow";
import { useCommandCatalog } from "./composables/launcher/useCommandCatalog";
import { useCommandManagement } from "./composables/settings/useCommandManagement";
import { useUpdateManager } from "./composables/update/useUpdateManager";
import { THEME_REGISTRY } from "./features/themes/themeRegistry";
import type { CommandManagementViewState } from "./features/settings/types";
import type { HotkeyFieldId } from "./stores/settingsStore";
import SettingsWindow from "./components/settings/SettingsWindow.vue";

const FALLBACK_APP_VERSION = "";

function resolveAppVersion(): string {
  return typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : FALLBACK_APP_VERSION;
}

function resolveHomepageUrl(): string | null {
  const owner = typeof __GITHUB_OWNER__ === "string" ? __GITHUB_OWNER__.trim() : "";
  const repo = typeof __GITHUB_REPO__ === "string" ? __GITHUB_REPO__.trim() : "";
  return owner && repo ? `https://github.com/${owner}/${repo}` : null;
}

const ports = createAppCompositionRootPorts();
const settingsStore = useSettingsStore();
settingsStore.hydrateFromStorage();
const settingsStorageKeys: readonly string[] = SETTINGS_STORAGE_KEYS;

const {
  hotkeys,
  defaultTerminal,
  language,
  autoCheckUpdate,
  launchAtLogin,
  disabledCommandIds,
  commandView,
  windowOpacity,
  theme,
  blurEnabled
} = storeToRefs(settingsStore);

watch(
  language,
  (value) => {
    setAppLocale(value);
  },
  { immediate: true }
);

watch(
  windowOpacity,
  (value) => {
    document.documentElement.style.setProperty("--ui-opacity", String(value));
  },
  { immediate: true }
);

useTheme({ themeId: theme, blurEnabled });

const isSettingsWindow = ref(true);
const settingsSyncChannel = ref<BroadcastChannel | null>(null);
const updateManager = useUpdateManager();
const appVersion = ref(resolveAppVersion());

const hotkeyBindings = useHotkeyBindings({
  hotkeys,
  setHotkey: (field, value) => {
    settingsStore.setHotkey(field, value);
  }
});

const settingsWindow = useSettingsWindow({
  settingsHashPrefix: SETTINGS_HASH_PREFIX,
  hotkeyDefinitions: HOTKEY_DEFINITIONS,
  isSettingsWindow,
  defaultTerminal,
  language,
  autoCheckUpdate,
  launchAtLogin,
  settingsStore,
  getHotkeyValue: hotkeyBindings.getHotkeyValue,
  setHotkeyValue: hotkeyBindings.setHotkeyValue,
  isTauriRuntime: ports.isTauriRuntime,
  readAvailableTerminals: ports.readAvailableTerminals,
  readAutoStartEnabled: ports.readAutoStartEnabled,
  writeAutoStartEnabled: ports.writeAutoStartEnabled,
  writeLauncherHotkey: ports.writeLauncherHotkey,
  fallbackTerminalOptions,
  broadcastSettingsUpdated: () => {
    settingsSyncChannel.value?.postMessage({ type: "settings-updated" });
  }
});

const {
  settingsNavItems,
  settingsRoute,
  hotkeyGlobalFields,
  hotkeySearchFields,
  hotkeyQueueFields,
  settingsErrorHotkeyFieldIds,
  settingsError,
  availableTerminals,
  terminalLoading,
  terminalDropdownOpen,
  terminalFocusIndex,
  selectedTerminalOption,
  selectedTerminalPath,
  languageOptions,
  navigateSettings,
  applySettingsRouteFromHash,
  onSettingsHashChange,
  selectTerminalOption,
  selectLanguageOption,
  setAutoCheckUpdate: setAutoCheckUpdateSetting,
  setLaunchAtLogin: setLaunchAtLoginSetting,
  loadSettings: loadSettingsSetting,
  loadAvailableTerminals: loadAvailableTerminalsSetting,
  persistSetting: persistSettingSetting,
  applyHotkeyChange: applyHotkeyChangeSetting
} = settingsWindow;

const commandCatalog = useCommandCatalog({
  isTauriRuntime: ports.isTauriRuntime,
  readUserCommandFiles: ports.readUserCommandFiles,
  readRuntimePlatform: ports.readRuntimePlatform,
  disabledCommandIds,
  locale: currentLocale
});

const commandManagement = useCommandManagement({
  allCommandTemplates: commandCatalog.allCommandTemplates,
  disabledCommandIds,
  commandSourceById: commandCatalog.commandSourceById,
  userCommandSourceById: commandCatalog.userCommandSourceById,
  overriddenCommandIds: commandCatalog.overriddenCommandIds,
  loadIssues: commandCatalog.loadIssues,
  commandView,
  setCommandEnabled: settingsStore.setCommandEnabled.bind(settingsStore),
  setDisabledCommandIds: settingsStore.setDisabledCommandIds.bind(settingsStore),
  setCommandViewState: settingsStore.setCommandViewState.bind(settingsStore)
});

const {
  commandRows,
  commandSummary,
  commandLoadIssues,
  commandFilteredCount,
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
  persistImmediate();
}

function resetCommandFilters(): void {
  resetCommandFiltersAction();
  persistImmediate();
}

function updateOpacity(value: number): void {
  settingsStore.setWindowOpacity(value);
  persistImmediate();
}

function updateTheme(value: string): void {
  settingsStore.setTheme(value);
  persistImmediate();
}

function updateBlurEnabled(value: boolean): void {
  settingsStore.setBlurEnabled(value);
  persistImmediate();
}

async function openHomepage(): Promise<void> {
  const url = resolveHomepageUrl();
  if (!url) {
    ports.logError("homepage url is not configured");
    return;
  }
  await ports.openExternalUrl(url);
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
    :get-hotkey-value="hotkeyBindings.getHotkeyValue"
    :hotkey-error-fields="settingsErrorHotkeyFieldIds"
    :hotkey-error-message="settingsError"
    :available-terminals="availableTerminals"
    :terminal-loading="terminalLoading"
    :terminal-dropdown-open="terminalDropdownOpen"
    :terminal-focus-index="terminalFocusIndex"
    :default-terminal="defaultTerminal"
    :selected-terminal-option="selectedTerminalOption"
    :selected-terminal-path="selectedTerminalPath"
    :language="language"
    :language-options="languageOptions"
    :auto-check-update="autoCheckUpdate"
    :launch-at-login="launchAtLogin"
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
    :themes="THEME_REGISTRY"
    @navigate="navigateSettings"
    @update-hotkey="onUpdateHotkey"
    @select-terminal="selectTerminalOption"
    @select-language="selectLanguageOption"
    @set-auto-check-update="setAutoCheckUpdateSetting"
    @set-launch-at-login="setLaunchAtLoginSetting"
    @toggle-command-enabled="toggleCommandEnabled"
    @set-filtered-commands-enabled="setFilteredCommandsEnabled"
    @update-command-view="updateCommandView"
    @reset-command-filters="resetCommandFilters"
    @update-opacity="updateOpacity"
    @update-theme="updateTheme"
    @update-blur-enabled="updateBlurEnabled"
    @check-update="checkUpdate"
    @download-update="downloadUpdate"
    @open-homepage="openHomepage"
  />
</template>
