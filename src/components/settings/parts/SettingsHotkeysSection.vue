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
  <section class="settings-hotkeys-group grid gap-2.5" aria-labelledby="settings-hotkeys-global">
    <h2
      id="settings-hotkeys-global"
      class="settings-hotkeys-group__title m-0 px-1 text-[11px] font-semibold tracking-[0.04em] leading-[1.4] text-[rgba(var(--ui-text-rgb),0.42)]"
    >
      {{ t("settings.hotkeys.sectionGlobal") }}
    </h2>
    <div
      class="settings-card rounded-2xl border border-settings-card-border bg-settings-card overflow-hidden"
    >
      <div
        v-for="field in props.hotkeyGlobalFields"
        :key="field.id"
        class="settings-card__row settings-hotkeys-row grid grid-cols-[minmax(0,1fr)_auto] items-start gap-[18px] px-4 py-[13px] border-b border-b-settings-row-border transition-[background] duration-120 hover:bg-settings-row-hover last:border-b-0"
      >
        <div class="settings-hotkeys-row__label min-w-0 pt-0.5">
          <span
            class="settings-card__label min-w-0 text-[13px] font-medium leading-[1.35] text-[rgba(var(--ui-text-rgb),0.9)]"
          >{{ t(`settings.hotkeys.fields.${field.id}`) }}</span>
        </div>
        <div
          class="settings-hotkeys-row__recorder flex-none max-w-[min(100%,280px)] flex justify-end [&_.s-hotkey-recorder-field]:max-w-full [&_.s-hotkey-recorder-field\\_\\_label]:sr-only [&_.s-hotkey-recorder-field\\_\\_conflict]:justify-start"
        >
          <SHotkeyRecorder
            :model-value="props.getHotkeyValue(field.id)"
            :label="t(`settings.hotkeys.fields.${field.id}`)"
            :conflict="getFieldConflict(field.id)"
            @update:model-value="emit('update-hotkey', field.id, $event)"
          />
        </div>
      </div>
    </div>
  </section>

  <section class="settings-hotkeys-group grid gap-2.5 mt-3.5" aria-labelledby="settings-hotkeys-search">
    <h2
      id="settings-hotkeys-search"
      class="settings-hotkeys-group__title m-0 px-1 text-[11px] font-semibold tracking-[0.04em] leading-[1.4] text-[rgba(var(--ui-text-rgb),0.42)]"
    >
      {{ t("settings.hotkeys.sectionSearch") }}
    </h2>
    <div
      class="settings-card rounded-2xl border border-settings-card-border bg-settings-card overflow-hidden"
    >
      <div
        v-for="field in props.hotkeySearchFields"
        :key="field.id"
        class="settings-card__row settings-hotkeys-row grid grid-cols-[minmax(0,1fr)_auto] items-start gap-[18px] px-4 py-[13px] border-b border-b-settings-row-border transition-[background] duration-120 hover:bg-settings-row-hover last:border-b-0"
      >
        <div class="settings-hotkeys-row__label min-w-0 pt-0.5">
          <span
            class="settings-card__label min-w-0 text-[13px] font-medium leading-[1.35] text-[rgba(var(--ui-text-rgb),0.9)]"
          >{{ t(`settings.hotkeys.fields.${field.id}`) }}</span>
        </div>
        <div
          class="settings-hotkeys-row__recorder flex-none max-w-[min(100%,280px)] flex justify-end [&_.s-hotkey-recorder-field]:max-w-full [&_.s-hotkey-recorder-field\\_\\_label]:sr-only [&_.s-hotkey-recorder-field\\_\\_conflict]:justify-start"
        >
          <SHotkeyRecorder
            :model-value="props.getHotkeyValue(field.id)"
            :label="t(`settings.hotkeys.fields.${field.id}`)"
            :conflict="getFieldConflict(field.id)"
            @update:model-value="emit('update-hotkey', field.id, $event)"
          />
        </div>
      </div>
    </div>
  </section>

  <section class="settings-hotkeys-group grid gap-2.5 mt-3.5" aria-labelledby="settings-hotkeys-queue">
    <h2
      id="settings-hotkeys-queue"
      class="settings-hotkeys-group__title m-0 px-1 text-[11px] font-semibold tracking-[0.04em] leading-[1.4] text-[rgba(var(--ui-text-rgb),0.42)]"
    >
      {{ t("settings.hotkeys.sectionQueue") }}
    </h2>
    <div
      class="settings-card rounded-2xl border border-settings-card-border bg-settings-card overflow-hidden"
    >
      <div
        v-for="field in props.hotkeyQueueFields"
        :key="field.id"
        class="settings-card__row settings-hotkeys-row grid grid-cols-[minmax(0,1fr)_auto] items-start gap-[18px] px-4 py-[13px] border-b border-b-settings-row-border transition-[background] duration-120 hover:bg-settings-row-hover last:border-b-0"
      >
        <div class="settings-hotkeys-row__label min-w-0 pt-0.5">
          <span
            class="settings-card__label min-w-0 text-[13px] font-medium leading-[1.35] text-[rgba(var(--ui-text-rgb),0.9)]"
          >{{ t(`settings.hotkeys.fields.${field.id}`) }}</span>
        </div>
        <div
          class="settings-hotkeys-row__recorder flex-none max-w-[min(100%,280px)] flex justify-end [&_.s-hotkey-recorder-field]:max-w-full [&_.s-hotkey-recorder-field\\_\\_label]:sr-only [&_.s-hotkey-recorder-field\\_\\_conflict]:justify-start"
        >
          <SHotkeyRecorder
            :model-value="props.getHotkeyValue(field.id)"
            :label="t(`settings.hotkeys.fields.${field.id}`)"
            :conflict="getFieldConflict(field.id)"
            @update:model-value="emit('update-hotkey', field.id, $event)"
          />
        </div>
      </div>
    </div>
  </section>
</template>
