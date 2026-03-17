<script setup lang="ts">
import { computed } from "vue";

import type { SettingsGeneralProps } from "../types";
import SSelect from "../ui/SSelect.vue";
import SToggle from "../ui/SToggle.vue";
import { useI18nText, type AppLocale } from "../../../i18n";

const props = defineProps<SettingsGeneralProps>();
const { t } = useI18nText();

const emit = defineEmits<{
  (e: "select-terminal", id: string): void;
  (e: "select-language", locale: AppLocale): void;
  (e: "set-auto-check-update", value: boolean): void;
  (e: "set-launch-at-login", value: boolean): void;
}>();

const terminalSelectDisabled = computed(
  () => props.terminalLoading || props.availableTerminals.length === 0
);

const terminalSelectOptions = computed(() => {
  if (props.terminalLoading) {
    return [
      {
        value: props.defaultTerminal || "__loading__",
        label: t("settings.general.terminalDetecting")
      }
    ];
  }

  if (props.availableTerminals.length === 0) {
    return [
      {
        value: "",
        label: t("settings.general.noTerminal")
      }
    ];
  }

  return props.availableTerminals.map((item) => ({
    value: item.id,
    label: item.label,
    description: item.path
  }));
});

const terminalSelectValue = computed(() => {
  if (!terminalSelectDisabled.value) {
    return props.defaultTerminal;
  }

  return terminalSelectOptions.value[0]?.value ?? "";
});

function onLanguageSelect(value: string): void {
  emit("select-language", value as AppLocale);
}
</script>

<template>
  <section aria-label="settings-general">
    <h2>{{ t("settings.general.title") }}</h2>

    <section class="settings-card" aria-labelledby="settings-general-startup">
      <h3 id="settings-general-startup" class="settings-card__title">
        {{ t("settings.general.sectionStartup") }}
      </h3>

      <div class="settings-card__row">
        <div class="settings-card__label">{{ t("settings.general.autoCheckUpdate") }}</div>
        <SToggle
          :model-value="props.autoCheckUpdate"
          @update:model-value="emit('set-auto-check-update', $event)"
        />
      </div>
      <p class="settings-hint">{{ t("settings.general.autoCheckUpdateHint") }}</p>

      <div class="settings-card__row">
        <div class="settings-card__label">{{ t("settings.general.launchAtLogin") }}</div>
        <SToggle
          :model-value="props.launchAtLogin"
          @update:model-value="emit('set-launch-at-login', $event)"
        />
      </div>
      <p class="settings-hint">{{ t("settings.general.launchAtLoginHint") }}</p>
    </section>

    <section class="settings-card" aria-labelledby="settings-general-terminal">
      <h3 id="settings-general-terminal" class="settings-card__title">
        {{ t("settings.general.sectionTerminal") }}
      </h3>

      <div class="settings-card__row">
        <div class="settings-card__label">{{ t("settings.general.defaultTerminal") }}</div>
        <SSelect
          :model-value="terminalSelectValue"
          :options="terminalSelectOptions"
          :disabled="terminalSelectDisabled"
          @update:model-value="emit('select-terminal', $event)"
        />
      </div>

      <p
        v-if="props.terminalLoading"
        class="settings-status settings-status--loading"
        role="status"
        aria-live="polite"
      >
        {{ t("settings.general.terminalDetectingHint") }}
      </p>

      <div class="settings-card__row">
        <div class="settings-card__label">{{ t("settings.general.currentTerminalPath") }}</div>
        <code class="settings-card__mono">{{ props.selectedTerminalPath }}</code>
      </div>

      <p class="settings-hint">{{ t("settings.general.terminalHint") }}</p>
    </section>

    <section class="settings-card" aria-labelledby="settings-general-interface">
      <h3 id="settings-general-interface" class="settings-card__title">
        {{ t("settings.general.sectionInterface") }}
      </h3>

      <div class="settings-card__row">
        <div class="settings-card__label">{{ t("settings.general.language") }}</div>
        <SSelect
          :model-value="props.language"
          :options="props.languageOptions"
          @update:model-value="onLanguageSelect"
        />
      </div>
    </section>
  </section>
</template>
