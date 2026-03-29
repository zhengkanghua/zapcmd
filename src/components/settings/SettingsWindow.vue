<script setup lang="ts">
import { computed } from "vue";
import type { CommandManagementViewState, SettingsRoute } from "../../features/settings/types";
import type { HotkeyFieldId, TerminalReusePolicy } from "../../stores/settingsStore";
import { useI18nText, type AppLocale } from "../../i18n";
import SettingsAppearanceSection from "./parts/SettingsAppearanceSection.vue";
import SettingsAboutSection from "./parts/SettingsAboutSection.vue";
import SettingsCommandsSection from "./parts/SettingsCommandsSection.vue";
import SettingsGeneralSection from "./parts/SettingsGeneralSection.vue";
import SettingsHotkeysSection from "./parts/SettingsHotkeysSection.vue";
import SSegmentNav from "./ui/SSegmentNav.vue";
import type { SettingsSegmentNavItem, SettingsWindowProps } from "./types";

const props = defineProps<SettingsWindowProps>();

const { t } = useI18nText();

const navItems = computed<SettingsSegmentNavItem[]>(() =>
  props.settingsNavItems.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    panelId: `settings-panel-${item.id}`
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
  (e: "set-always-elevated-terminal", value: boolean): void;
  (e: "set-terminal-reuse-policy", value: TerminalReusePolicy): void;
  (e: "toggle-command-enabled", commandId: string, enabled: boolean): void;
  (e: "set-filtered-commands-enabled", enabled: boolean): void;
  (e: "update-command-view", patch: Partial<CommandManagementViewState>): void;
  (e: "reset-command-filters"): void;
  (e: "update-opacity", value: number): void;
  (e: "update-theme", value: string): void;
  (e: "update-motion-preset", value: string): void;
  (e: "update-blur-enabled", value: boolean): void;
  (e: "check-update"): void;
  (e: "download-update"): void;
  (e: "open-homepage"): void;
}>();
</script>

<template>
  <main
    class="settings-window-root h-full min-h-0 grid grid-rows-settings-window overflow-hidden text-ui-text bg-ui-bg-deep bg-settings-window-shell"
  >
    <div
      class="settings-window-topbar relative z-settings-topbar h-[52px] flex items-end justify-center px-[24px] box-border bg-settings-window-topbar backdrop-blur-ui-24"
    >
      <SSegmentNav :items="navItems" v-model="settingsRoute" :ariaLabel="t('settings.aria.sections')" />
      <div
        class="settings-window-topbar__divider pointer-events-none absolute inset-x-0 bottom-0 h-px bg-ui-text/5"
        aria-hidden="true"
      />
    </div>

    <div
      class="settings-content min-h-0 h-full overflow-y-auto overscroll-contain w-full pb-[24px] box-border scrollbar-subtle"
      :aria-label="t('settings.aria.content')"
    >
      <div
        class="settings-content__inner box-border w-full mx-auto p-[24px_32px_32px]"
        :class="
          settingsRoute === 'commands'
            ? ['settings-content__inner--commands', 'max-w-[1120px]']
            : 'max-w-[720px]'
        "
      >
        <div
          role="tabpanel"
          :id="`settings-panel-${settingsRoute}`"
          :aria-labelledby="`settings-tab-${settingsRoute}`"
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
            :default-terminal="props.defaultTerminal"
            :terminal-reuse-policy="props.terminalReusePolicy"
            :selected-terminal-path="props.selectedTerminalPath"
            :language="props.language"
            :language-options="props.languageOptions"
            :auto-check-update="props.autoCheckUpdate"
            :launch-at-login="props.launchAtLogin"
            :always-elevated-terminal="props.alwaysElevatedTerminal"
            :show-always-elevated-terminal="props.showAlwaysElevatedTerminal"
            @select-terminal="emit('select-terminal', $event)"
            @select-language="emit('select-language', $event)"
            @set-auto-check-update="emit('set-auto-check-update', $event)"
            @set-launch-at-login="emit('set-launch-at-login', $event)"
            @set-always-elevated-terminal="emit('set-always-elevated-terminal', $event)"
            @set-terminal-reuse-policy="emit('set-terminal-reuse-policy', $event)"
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
            :motion-preset="props.motionPreset"
            :themes="props.themes"
            :motion-presets="props.motionPresets"
            @update-opacity="emit('update-opacity', $event)"
            @update-theme="emit('update-theme', $event)"
            @update-motion-preset="emit('update-motion-preset', $event)"
            @update-blur-enabled="emit('update-blur-enabled', $event)"
          />
        </div>
      </div>
    </div>
  </main>
</template>
