<script setup lang="ts">
import type { CommandManagementViewState, SettingsRoute } from "../../features/settings/types";
import type { HotkeyFieldId } from "../../stores/settingsStore";
import { useI18nText, type AppLocale } from "../../i18n";
import SettingsAppearanceSection from "./parts/SettingsAppearanceSection.vue";
import SettingsAboutSection from "./parts/SettingsAboutSection.vue";
import SettingsCommandsSection from "./parts/SettingsCommandsSection.vue";
import SettingsGeneralSection from "./parts/SettingsGeneralSection.vue";
import SettingsHotkeysSection from "./parts/SettingsHotkeysSection.vue";
import SettingsNav from "./parts/SettingsNav.vue";
import type {
  SettingsAboutProps,
  SettingsAppearanceProps,
  SettingsCommandsProps,
  SettingsGeneralProps,
  SettingsHotkeysProps,
  SettingsNavProps
} from "./types";

type SettingsWindowProps = SettingsNavProps &
  SettingsHotkeysProps &
  SettingsCommandsProps &
  SettingsGeneralProps &
  SettingsAppearanceProps &
  SettingsAboutProps & {
  settingsError: string;
  settingsSaved: boolean;
};

const props = defineProps<SettingsWindowProps>();
const { t } = useI18nText();

const emit = defineEmits<{
  (e: "navigate", route: SettingsRoute): void;
  (e: "start-recording", field: HotkeyFieldId): void;
  (e: "toggle-terminal-dropdown"): void;
  (e: "select-terminal", id: string): void;
  (e: "select-language", locale: AppLocale): void;
  (e: "set-auto-check-update", value: boolean): void;
  (e: "set-launch-at-login", value: boolean): void;
  (e: "toggle-command-enabled", commandId: string, enabled: boolean): void;
  (e: "set-filtered-commands-enabled", enabled: boolean): void;
  (e: "update-command-view", patch: Partial<CommandManagementViewState>): void;
  (e: "reset-command-filters"): void;
  (e: "update-opacity", value: number): void;
  (e: "check-update"): void;
  (e: "download-update"): void;
  (e: "open-homepage"): void;
  (e: "close"): void;
  (e: "apply"): void;
  (e: "confirm"): void;
}>();
</script>

<template>
  <main class="settings-window-root">
    <p
      v-if="props.settingsSaved && !props.settingsError"
      class="settings-ok execution-feedback execution-toast execution-feedback--success"
      role="status"
      aria-live="polite"
    >
      {{ t("settings.saved") }}
    </p>
    <div class="settings-window__body">
      <SettingsNav
        :settings-nav-items="props.settingsNavItems"
        :settings-route="props.settingsRoute"
        @navigate="emit('navigate', $event)"
      />

      <section class="settings-content" aria-label="settings-content">
        <SettingsHotkeysSection
          v-if="props.settingsRoute === 'hotkeys'"
          :hotkey-global-fields="props.hotkeyGlobalFields"
          :hotkey-search-fields="props.hotkeySearchFields"
          :hotkey-queue-fields="props.hotkeyQueueFields"
          :is-hotkey-recording="props.isHotkeyRecording"
          :get-hotkey-display="props.getHotkeyDisplay"
          @start-recording="emit('start-recording', $event)"
        />
        <SettingsGeneralSection
          v-else-if="props.settingsRoute === 'general'"
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
          @toggle-terminal-dropdown="emit('toggle-terminal-dropdown')"
          @select-terminal="emit('select-terminal', $event)"
          @select-language="emit('select-language', $event)"
          @set-auto-check-update="emit('set-auto-check-update', $event)"
          @set-launch-at-login="emit('set-launch-at-login', $event)"
        />
        <SettingsCommandsSection
          v-else-if="props.settingsRoute === 'commands'"
          :command-rows="props.commandRows"
          :command-summary="props.commandSummary"
          :command-load-issues="props.commandLoadIssues"
          :command-filtered-count="props.commandFilteredCount"
          :command-view="props.commandView"
          :command-source-options="props.commandSourceOptions"
          :command-status-options="props.commandStatusOptions"
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
          v-else-if="props.settingsRoute === 'about'"
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
          @update-opacity="emit('update-opacity', $event)"
        />
      </section>
    </div>

    <p v-if="props.settingsRoute === 'hotkeys'" class="settings-hint">
      {{ t("settings.hotkeys.hint") }}
    </p>
    <p v-if="props.settingsError" class="settings-error">{{ props.settingsError }}</p>
    <footer class="settings-window__footer">
      <button type="button" class="btn-muted" @click="emit('close')">{{ t("common.cancel") }}</button>
      <button type="button" class="btn-muted" @click="emit('apply')">{{ t("common.apply") }}</button>
      <button type="button" class="btn-primary" @click="emit('confirm')">{{ t("common.confirm") }}</button>
    </footer>
  </main>
</template>
