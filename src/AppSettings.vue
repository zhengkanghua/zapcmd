<script setup lang="ts">
import { computed } from "vue";
import { useSettingsEntry } from "./composables/app/useAppCompositionRoot/settingsEntry";
import SettingsWindow from "./components/settings/SettingsWindow.vue";

const { settingsVm } = useSettingsEntry();

const availableTerminals = computed({
  get: () => settingsVm.availableTerminals,
  set: (value) => {
    settingsVm.availableTerminals = value;
  }
});

const terminalLoading = computed({
  get: () => settingsVm.terminalLoading,
  set: (value) => {
    settingsVm.terminalLoading = value;
  }
});

defineExpose({
  availableTerminals,
  terminalLoading
});
</script>

<template>
  <SettingsWindow
    :settings-nav-items="settingsVm.settingsNavItems"
    :settings-route="settingsVm.settingsRoute"
    :hotkey-global-fields="settingsVm.hotkeyGlobalFields"
    :hotkey-search-fields="settingsVm.hotkeySearchFields"
    :hotkey-queue-fields="settingsVm.hotkeyQueueFields"
    :pointer-action-fields="settingsVm.pointerActionFields"
    :pointer-action-options="settingsVm.pointerActionOptions"
    :get-hotkey-value="settingsVm.getHotkeyValue"
    :get-pointer-action-value="settingsVm.getPointerActionValue"
    :hotkey-error-fields="settingsVm.hotkeyErrorFields"
    :hotkey-error-message="settingsVm.hotkeyErrorMessage"
    :available-terminals="settingsVm.availableTerminals"
    :terminal-loading="settingsVm.terminalLoading"
    :default-terminal="settingsVm.defaultTerminal"
    :terminal-reuse-policy="settingsVm.terminalReusePolicy"
    :selected-terminal-path="settingsVm.selectedTerminalPath"
    :language="settingsVm.language"
    :language-options="settingsVm.languageOptions"
    :auto-check-update="settingsVm.autoCheckUpdate"
    :launch-at-login="settingsVm.launchAtLogin"
    :always-elevated-terminal="settingsVm.alwaysElevatedTerminal"
    :general-error-message="settingsVm.generalErrorMessage"
    :show-always-elevated-terminal="settingsVm.showAlwaysElevatedTerminal"
    :command-rows="settingsVm.commandRows"
    :visible-command-rows="settingsVm.visibleCommandRows"
    :command-summary="settingsVm.commandSummary"
    :command-load-issues="settingsVm.commandLoadIssues"
    :command-filtered-count="settingsVm.commandFilteredCount"
    :rendered-command-row-count="settingsVm.renderedCommandRowCount"
    :command-view="settingsVm.commandView"
    :command-source-options="settingsVm.commandSourceOptions"
    :command-status-options="settingsVm.commandStatusOptions"
    :command-category-options="settingsVm.commandCategoryOptions"
    :command-override-options="settingsVm.commandOverrideOptions"
    :command-issue-options="settingsVm.commandIssueOptions"
    :command-sort-options="settingsVm.commandSortOptions"
    :command-source-file-options="settingsVm.commandSourceFileOptions"
    :advance-visible-command-rows="settingsVm.advanceVisibleCommandRows"
    :app-version="settingsVm.appVersion"
    :runtime-platform="settingsVm.runtimePlatform"
    :update-status="settingsVm.updateStatus"
    :homepage-action-status="settingsVm.homepageActionStatus"
    :window-opacity="settingsVm.windowOpacity"
    :theme="settingsVm.theme"
    :blur-enabled="settingsVm.blurEnabled"
    :motion-preset="settingsVm.motionPreset"
    :themes="settingsVm.themes"
    :motion-presets="settingsVm.motionPresets"
    @navigate="settingsVm.navigateSettings"
    @update-hotkey="settingsVm.applyHotkeyChange"
    @update-pointer-action="settingsVm.applyPointerActionChange"
    @select-terminal="settingsVm.selectTerminalOption"
    @select-language="settingsVm.selectLanguageOption"
    @set-auto-check-update="settingsVm.setAutoCheckUpdate"
    @set-launch-at-login="settingsVm.setLaunchAtLogin"
    @set-always-elevated-terminal="settingsVm.setAlwaysElevatedTerminal"
    @set-terminal-reuse-policy="settingsVm.setTerminalReusePolicy"
    @refresh-terminals="settingsVm.refreshAvailableTerminals"
    @toggle-command-enabled="settingsVm.toggleCommandEnabled"
    @set-filtered-commands-enabled="settingsVm.setFilteredCommandsEnabled"
    @update-command-view="settingsVm.updateCommandView"
    @reset-command-filters="settingsVm.resetCommandFilters"
    @update-opacity="settingsVm.setWindowOpacity"
    @update-theme="settingsVm.setTheme"
    @update-motion-preset="settingsVm.setMotionPreset"
    @update-blur-enabled="settingsVm.setBlurEnabled"
    @check-update="settingsVm.checkUpdate"
    @download-update="settingsVm.downloadUpdate"
    @open-homepage="settingsVm.openHomepage"
  />
</template>
