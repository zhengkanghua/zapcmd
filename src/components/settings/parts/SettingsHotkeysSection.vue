<script setup lang="ts">
import type { HotkeyFieldId } from "../../../stores/settingsStore";
import type { SettingsHotkeysProps } from "../types";
import { useI18nText } from "../../../i18n";

const props = defineProps<SettingsHotkeysProps>();
const { t } = useI18nText();

const emit = defineEmits<{
  (e: "start-recording", field: HotkeyFieldId): void;
}>();
</script>

<template>
  <section class="settings-group" aria-labelledby="settings-group-global">
    <h2 id="settings-group-global">{{ t("settings.hotkeys.sectionGlobal") }}</h2>
    <div class="settings-grid">
      <div v-for="field in props.hotkeyGlobalFields" :key="field.id" class="settings-field">
        <label>{{ t(`settings.hotkeys.fields.${field.id}`) }}</label>
        <button
          type="button"
          class="hotkey-recorder"
          :class="{ 'hotkey-recorder--recording': props.isHotkeyRecording(field.id) }"
          @click="emit('start-recording', field.id)"
        >
          {{ props.getHotkeyDisplay(field.id) }}
        </button>
      </div>
    </div>
  </section>

  <section class="settings-group" aria-labelledby="settings-group-search">
    <h2 id="settings-group-search">{{ t("settings.hotkeys.sectionSearch") }}</h2>
    <div class="settings-grid">
      <div v-for="field in props.hotkeySearchFields" :key="field.id" class="settings-field">
        <label>{{ t(`settings.hotkeys.fields.${field.id}`) }}</label>
        <button
          type="button"
          class="hotkey-recorder"
          :class="{ 'hotkey-recorder--recording': props.isHotkeyRecording(field.id) }"
          @click="emit('start-recording', field.id)"
        >
          {{ props.getHotkeyDisplay(field.id) }}
        </button>
      </div>
    </div>
  </section>

  <section class="settings-group" aria-labelledby="settings-group-queue">
    <h2 id="settings-group-queue">{{ t("settings.hotkeys.sectionQueue") }}</h2>
    <div class="settings-grid">
      <div v-for="field in props.hotkeyQueueFields" :key="field.id" class="settings-field">
        <label>{{ t(`settings.hotkeys.fields.${field.id}`) }}</label>
        <button
          type="button"
          class="hotkey-recorder"
          :class="{ 'hotkey-recorder--recording': props.isHotkeyRecording(field.id) }"
          @click="emit('start-recording', field.id)"
        >
          {{ props.getHotkeyDisplay(field.id) }}
        </button>
      </div>
    </div>
  </section>
</template>
