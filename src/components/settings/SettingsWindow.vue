<script setup lang="ts">
import { computed } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { CommandManagementViewState, SettingsRoute } from "../../features/settings/types";
import type { HotkeyFieldId } from "../../stores/settingsStore";
import type { AppLocale } from "../../i18n";
import SettingsAppearanceSection from "./parts/SettingsAppearanceSection.vue";
import SettingsAboutSection from "./parts/SettingsAboutSection.vue";
import SettingsCommandsSection from "./parts/SettingsCommandsSection.vue";
import SettingsGeneralSection from "./parts/SettingsGeneralSection.vue";
import SettingsHotkeysSection from "./parts/SettingsHotkeysSection.vue";
import SSegmentNav from "./ui/SSegmentNav.vue";
import type { SettingsWindowProps } from "./types";

const props = defineProps<SettingsWindowProps>();
const appWindow = getCurrentWindow();
const minimizeWindow = () => appWindow.minimize();
const toggleMaximize = () => appWindow.toggleMaximize();
const closeWindow = () => appWindow.close();

const navItems = computed(() =>
  props.settingsNavItems.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon
  }))
);
const settingsRoute = computed({
  get: () => props.settingsRoute,
  set: (value) => emit("navigate", value as SettingsRoute)
});

const emit = defineEmits<{
  (e: "navigate", route: SettingsRoute): void;
  (e: "update-hotkey", field: HotkeyFieldId, value: string): void;
  (e: "select-terminal", id: string): void;
  (e: "select-language", locale: AppLocale): void;
  (e: "set-auto-check-update", value: boolean): void;
  (e: "set-launch-at-login", value: boolean): void;
  (e: "toggle-command-enabled", commandId: string, enabled: boolean): void;
  (e: "set-filtered-commands-enabled", enabled: boolean): void;
  (e: "update-command-view", patch: Partial<CommandManagementViewState>): void;
  (e: "reset-command-filters"): void;
  (e: "update-opacity", value: number): void;
  (e: "update-theme", value: string): void;
  (e: "update-blur-enabled", value: boolean): void;
  (e: "check-update"): void;
  (e: "download-update"): void;
  (e: "open-homepage"): void;
}>();
</script>

<template>
  <main class="settings-window-root">
    <div class="settings-drag-region" data-tauri-drag-region>
      <span class="settings-drag-region__title">ZapCmd Settings</span>
      <div class="settings-drag-region__controls">
        <button class="settings-drag-region__btn" aria-label="最小化" @click="minimizeWindow">─</button>
        <button class="settings-drag-region__btn" aria-label="最大化" @click="toggleMaximize">□</button>
        <button
          class="settings-drag-region__btn settings-drag-region__btn--close"
          aria-label="关闭"
          @click="closeWindow"
        >
          ×
        </button>
      </div>
    </div>

    <div class="settings-nav-bar">
      <SSegmentNav :items="navItems" v-model="settingsRoute" />
    </div>

    <div
      class="settings-content"
      :class="{ 'settings-content--full-width': settingsRoute === 'commands' }"
      aria-label="settings-content"
    >
        <SettingsHotkeysSection
          v-if="settingsRoute === 'hotkeys'"
          :hotkey-global-fields="props.hotkeyGlobalFields"
          :hotkey-search-fields="props.hotkeySearchFields"
          :hotkey-queue-fields="props.hotkeyQueueFields"
          :get-hotkey-value="props.getHotkeyValue"
          :hotkey-error-fields="props.hotkeyErrorFields"
          :hotkey-error-message="props.hotkeyErrorMessage"
          @update-hotkey="(field, value) => emit('update-hotkey', field, value)"
        />
        <SettingsGeneralSection
          v-else-if="settingsRoute === 'general'"
          :available-terminals="props.availableTerminals"
          :terminal-loading="props.terminalLoading"
          :terminal-dropdown-open="props.terminalDropdownOpen"
          :terminal-focus-index="props.terminalFocusIndex"
          :default-terminal="props.defaultTerminal"
          :selected-terminal-option="props.selectedTerminalOption"
          :selected-terminal-path="props.selectedTerminalPath"
          :language="props.language"
          :language-options="props.languageOptions"
          :auto-check-update="props.autoCheckUpdate"
          :launch-at-login="props.launchAtLogin"
          @select-terminal="emit('select-terminal', $event)"
          @select-language="emit('select-language', $event)"
          @set-auto-check-update="emit('set-auto-check-update', $event)"
          @set-launch-at-login="emit('set-launch-at-login', $event)"
        />
        <SettingsCommandsSection
          v-else-if="settingsRoute === 'commands'"
          :command-rows="props.commandRows"
          :command-summary="props.commandSummary"
          :command-load-issues="props.commandLoadIssues"
          :command-filtered-count="props.commandFilteredCount"
          :command-view="props.commandView"
          :command-source-options="props.commandSourceOptions"
          :command-status-options="props.commandStatusOptions"
          :command-category-options="props.commandCategoryOptions"
          :command-override-options="props.commandOverrideOptions"
          :command-issue-options="props.commandIssueOptions"
          :command-sort-options="props.commandSortOptions"
          :command-display-mode-options="props.commandDisplayModeOptions"
          :command-source-file-options="props.commandSourceFileOptions"
          :command-groups="props.commandGroups"
          @toggle-command-enabled="(commandId, enabled) => emit('toggle-command-enabled', commandId, enabled)"
          @set-filtered-enabled="emit('set-filtered-commands-enabled', $event)"
          @update-view="emit('update-command-view', $event)"
          @reset-filters="emit('reset-command-filters')"
        />
        <SettingsAboutSection
          v-else-if="settingsRoute === 'about'"
          :app-version="props.appVersion"
          :runtime-platform="props.runtimePlatform"
          :update-status="props.updateStatus"
          @check-update="emit('check-update')"
          @download-update="emit('download-update')"
          @open-homepage="emit('open-homepage')"
        />
        <SettingsAppearanceSection
          v-else
          :window-opacity="props.windowOpacity"
          :theme="props.theme"
          :blur-enabled="props.blurEnabled"
          :themes="props.themes"
          @update-opacity="emit('update-opacity', $event)"
          @update-theme="emit('update-theme', $event)"
          @update-blur-enabled="emit('update-blur-enabled', $event)"
        />
    </div>
  </main>
</template>
