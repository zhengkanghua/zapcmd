<script setup lang="ts">
import type { HotkeyFieldId } from "../../../stores/settingsStore";
import type { SettingsHotkeysProps } from "../types";
import { useI18nText } from "../../../i18n";
import SHotkeyRecorder from "../ui/SHotkeyRecorder.vue";

const props = defineProps<SettingsHotkeysProps>();
const { t } = useI18nText();

const emit = defineEmits<{
  (e: "update-hotkey", field: HotkeyFieldId, value: string): void;
}>();

function getFieldConflict(fieldId: HotkeyFieldId): string | undefined {
  if (!props.hotkeyErrorFields.includes(fieldId)) {
    return undefined;
  }

  const message = props.hotkeyErrorMessage.trim();
  return message.length > 0 ? message : undefined;
}
</script>

<template>
  <section class="settings-card" aria-labelledby="settings-hotkeys-global">
    <h2 id="settings-hotkeys-global" class="settings-card__title">
      {{ t("settings.hotkeys.sectionGlobal") }}
    </h2>
    <div v-for="field in props.hotkeyGlobalFields" :key="field.id" class="settings-card__row">
      <SHotkeyRecorder
        :model-value="props.getHotkeyValue(field.id)"
        :label="t(`settings.hotkeys.fields.${field.id}`)"
        :conflict="getFieldConflict(field.id)"
        @update:model-value="emit('update-hotkey', field.id, $event)"
      />
    </div>
  </section>

  <section class="settings-card" aria-labelledby="settings-hotkeys-search">
    <h2 id="settings-hotkeys-search" class="settings-card__title">
      {{ t("settings.hotkeys.sectionSearch") }}
    </h2>
    <div v-for="field in props.hotkeySearchFields" :key="field.id" class="settings-card__row">
      <SHotkeyRecorder
        :model-value="props.getHotkeyValue(field.id)"
        :label="t(`settings.hotkeys.fields.${field.id}`)"
        :conflict="getFieldConflict(field.id)"
        @update:model-value="emit('update-hotkey', field.id, $event)"
      />
    </div>
  </section>

  <section class="settings-card" aria-labelledby="settings-hotkeys-queue">
    <h2 id="settings-hotkeys-queue" class="settings-card__title">
      {{ t("settings.hotkeys.sectionQueue") }}
    </h2>
    <div v-for="field in props.hotkeyQueueFields" :key="field.id" class="settings-card__row">
      <SHotkeyRecorder
        :model-value="props.getHotkeyValue(field.id)"
        :label="t(`settings.hotkeys.fields.${field.id}`)"
        :conflict="getFieldConflict(field.id)"
        @update:model-value="emit('update-hotkey', field.id, $event)"
      />
    </div>
  </section>
</template>
