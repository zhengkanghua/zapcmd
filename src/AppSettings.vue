<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "./stores/settingsStore";
import { useTheme } from "./composables/app/useTheme";
import SettingsWindow from "./components/settings/SettingsWindow.vue";
import type { SettingsRoute } from "./features/settings/types";
import { APP_LOCALES, t } from "./i18n";
import { THEME_REGISTRY } from "./features/themes/themeRegistry";

const settingsStore = useSettingsStore();
const {
  theme,
  blurEnabled,
  windowOpacity,
  language,
  defaultTerminal,
  autoCheckUpdate,
  launchAtLogin,
  commandView
} = storeToRefs(settingsStore);

useTheme({ themeId: theme, blurEnabled });

// TODO: Task 11 将在此处集成即时保存版 useSettingsWindow

const settingsRoute = ref<SettingsRoute>("appearance");
const settingsErrorRoute = ref<SettingsRoute | null>(null);

const settingsNavItems = computed(() => [
  { route: "hotkeys" as const, label: t("settings.nav.hotkeys") },
  { route: "general" as const, label: t("settings.nav.general") },
  { route: "commands" as const, label: t("settings.nav.commands") },
  { route: "appearance" as const, label: t("settings.nav.appearance") },
  { route: "about" as const, label: t("settings.nav.about") }
]);

const languageOptions = computed(() =>
  APP_LOCALES.map((locale) => ({
    value: locale,
    label:
      locale === "zh-CN"
        ? t("settings.general.languageOptionZhCn")
        : t("settings.general.languageOptionEnUs")
  }))
);
</script>

<template>
  <SettingsWindow
    :settings-nav-items="settingsNavItems"
    :settings-route="settingsRoute"
    :settings-error-route="settingsErrorRoute"
    :hotkey-global-fields="[]"
    :hotkey-search-fields="[]"
    :hotkey-queue-fields="[]"
    :is-hotkey-recording="() => false"
    :get-hotkey-display="() => ''"
    :hotkey-error-fields="[]"
    :hotkey-error-primary-field="null"
    :available-terminals="[]"
    :terminal-loading="false"
    :terminal-dropdown-open="false"
    :terminal-focus-index="-1"
    :default-terminal="defaultTerminal"
    :selected-terminal-option="null"
    selected-terminal-path=""
    :language="language"
    :language-options="languageOptions"
    :auto-check-update="autoCheckUpdate"
    :launch-at-login="launchAtLogin"
    :command-rows="[]"
    :command-summary="{ total: 0, enabled: 0, disabled: 0, userDefined: 0, overridden: 0 }"
    :command-load-issues="[]"
    :command-filtered-count="0"
    :command-view="commandView"
    :command-source-options="[]"
    :command-status-options="[]"
    :command-override-options="[]"
    :command-issue-options="[]"
    :command-sort-options="[]"
    :command-display-mode-options="[]"
    :command-source-file-options="[]"
    :command-groups="[]"
    app-version=""
    runtime-platform=""
    :update-status="{ state: 'idle' }"
    settings-error=""
    :settings-saved="false"
    :close-confirm-open="false"
    :window-opacity="windowOpacity"
    :theme="theme"
    :blur-enabled="blurEnabled"
    :themes="THEME_REGISTRY"
  />
</template>
