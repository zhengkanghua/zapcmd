<script setup lang="ts">
import type { SettingsGeneralProps } from "../types";
import SettingsSelectControl from "./SettingsSelectControl.vue";
import { useI18nText, type AppLocale } from "../../../i18n";

const props = defineProps<SettingsGeneralProps>();
const { t } = useI18nText();

const emit = defineEmits<{
  (e: "toggle-terminal-dropdown"): void;
  (e: "select-terminal", id: string): void;
  (e: "select-language", locale: AppLocale): void;
  (e: "set-auto-check-update", value: boolean): void;
  (e: "set-launch-at-login", value: boolean): void;
}>();

function onLanguageSelect(value: string): void {
  emit("select-language", value as AppLocale);
}

function onAutoCheckUpdateChange(event: Event): void {
  const target = event.target as HTMLInputElement | null;
  emit("set-auto-check-update", target?.checked ?? false);
}

function onLaunchAtLoginChange(event: Event): void {
  const target = event.target as HTMLInputElement | null;
  emit("set-launch-at-login", target?.checked ?? false);
}
</script>

<template>
  <section class="settings-group">
    <h2>{{ t("settings.general.title") }}</h2>
    <div class="settings-grid">
      <div class="settings-field">
        <label for="default-terminal-select">{{ t("settings.general.defaultTerminal") }}</label>
        <div class="settings-select-wrap">
          <button
            id="default-terminal-select"
            type="button"
            class="settings-select"
            :disabled="props.terminalLoading || props.availableTerminals.length === 0"
            :aria-expanded="props.terminalDropdownOpen"
            @click="emit('toggle-terminal-dropdown')"
          >
            <span class="settings-select__value">
              {{
                props.terminalLoading
                  ? t("settings.general.terminalDetecting")
                  : props.selectedTerminalOption
                    ? props.selectedTerminalOption.label
                    : t("settings.general.noTerminal")
              }}
            </span>
          </button>
          <span
            class="settings-select__arrow"
            :class="{ 'settings-select__arrow--open': props.terminalDropdownOpen }"
            aria-hidden="true"
          >
            ⌄
          </span>
          <ul v-if="props.terminalDropdownOpen" class="settings-select-list" role="listbox">
            <li v-for="(item, index) in props.availableTerminals" :key="item.id">
              <button
                type="button"
                class="settings-select-list__item"
                :class="{
                  'settings-select-list__item--active': item.id === props.defaultTerminal,
                  'settings-select-list__item--focused': index === props.terminalFocusIndex
                }"
                :aria-selected="item.id === props.defaultTerminal"
                @click="emit('select-terminal', item.id)"
              >
                <span class="settings-select-list__label">{{ item.label }}</span>
                <span class="settings-select-list__path">{{ item.path }}</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
      <div class="settings-field">
        <label for="language-select">{{ t("settings.general.language") }}</label>
        <SettingsSelectControl
          id="language-select"
          :model-value="props.language"
          :options="props.languageOptions"
          @update:model-value="onLanguageSelect"
        />
      </div>
      <div class="settings-field settings-field--full">
        <label class="settings-command-list__toggle" for="auto-check-update-toggle">
          <input
            id="auto-check-update-toggle"
            type="checkbox"
            :checked="props.autoCheckUpdate"
            @change="onAutoCheckUpdateChange"
          />
          <span>{{ t("settings.general.autoCheckUpdate") }}</span>
        </label>
        <p class="settings-hint">{{ t("settings.general.autoCheckUpdateHint") }}</p>
      </div>
      <div class="settings-field settings-field--full">
        <label class="settings-command-list__toggle" for="launch-at-login-toggle">
          <input
            id="launch-at-login-toggle"
            type="checkbox"
            :checked="props.launchAtLogin"
            @change="onLaunchAtLoginChange"
          />
          <span>{{ t("settings.general.launchAtLogin") }}</span>
        </label>
        <p class="settings-hint">{{ t("settings.general.launchAtLoginHint") }}</p>
      </div>
      <div class="settings-field settings-field--full">
        <label>{{ t("settings.general.currentTerminalPath") }}</label>
        <input class="settings-readonly" type="text" :value="props.selectedTerminalPath" readonly />
      </div>
    </div>
    <p>{{ t("settings.general.terminalHint") }}</p>
  </section>
</template>
