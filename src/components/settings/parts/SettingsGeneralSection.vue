<script setup lang="ts">
import { computed } from "vue";

import type { SettingsGeneralProps } from "../types";
import SDropdown from "../ui/SDropdown.vue";
import SettingItem from "../ui/SettingItem.vue";
import SettingSection from "../ui/SettingSection.vue";
import SToggle from "../ui/SToggle.vue";
import { useI18nText, type AppLocale } from "../../../i18n";

const props = defineProps<SettingsGeneralProps>();
const { t } = useI18nText();

const emit = defineEmits<{
  (e: "select-terminal", id: string): void;
  (e: "refresh-terminals"): void;
  (e: "select-language", locale: AppLocale): void;
  (e: "set-auto-check-update", value: boolean): void;
  (e: "set-launch-at-login", value: boolean): void;
  (e: "set-always-elevated-terminal", value: boolean): void;
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
    label: item.label
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
  <section class="settings-group settings-general grid gap-[24px]" aria-label="settings-general">
    <p
      v-if="props.generalErrorMessage.trim().length > 0"
      class="settings-status settings-status--error mt-0 mb-0 px-[12px] py-[9px] border border-ui-danger/25 rounded-[8px] bg-ui-danger/8 text-[12px] leading-[1.45] text-ui-danger"
      role="alert"
    >
      {{ props.generalErrorMessage }}
    </p>

    <SettingSection :label="t('settings.general.sectionStartup')" heading-id="settings-general-startup">
      <SettingItem
        :label="t('settings.general.autoCheckUpdate')"
        :description="t('settings.general.autoCheckUpdateHint')"
      >
        <SToggle
          :model-value="props.autoCheckUpdate"
          @update:model-value="emit('set-auto-check-update', $event)"
        />
      </SettingItem>

      <SettingItem
        :label="t('settings.general.launchAtLogin')"
        :description="t('settings.general.launchAtLoginHint')"
      >
        <SToggle
          :model-value="props.launchAtLogin"
          @update:model-value="emit('set-launch-at-login', $event)"
        />
      </SettingItem>

    </SettingSection>

    <SettingSection :label="t('settings.general.sectionTerminal')" heading-id="settings-general-terminal">
      <SettingItem
        :label="t('settings.general.defaultTerminal')"
        :description="t('settings.general.terminalHint')"
      >
        <div class="settings-general__terminal-actions flex items-center gap-2">
          <SDropdown
            class="min-w-0 flex-1"
            :model-value="terminalSelectValue"
            :options="terminalSelectOptions"
            :disabled="terminalSelectDisabled"
            @update:model-value="emit('select-terminal', $event)"
          />
          <button
            type="button"
            class="settings-general__refresh-terminals inline-flex items-center justify-center h-[34px] shrink-0 px-[10px] text-[12px] font-semibold rounded-[8px] border border-ui-text/10 bg-ui-text/5 text-ui-text/80 hover:bg-ui-text/8 hover:border-ui-text/15 transition-colors focus-visible:outline-none focus-visible:shadow-settings-focus disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="props.terminalLoading"
            @click="emit('refresh-terminals')"
          >
            {{ t("settings.general.rescanTerminals") }}
          </button>
        </div>
      </SettingItem>

      <p
        v-if="props.terminalLoading"
        class="settings-status settings-status--loading mt-0 mx-[16px] mb-[12px] px-[12px] py-[9px] border border-ui-brand/25 rounded-[8px] bg-ui-brand/8 text-[12px] leading-[1.45] text-ui-brand"
        role="status"
        aria-live="polite"
      >
        {{ t("settings.general.terminalDetectingHint") }}
      </p>

      <SettingItem :label="t('settings.general.currentTerminalPath')">
        <code
          class="settings-card__mono font-mono text-[11.5px] text-ui-text/68 truncate max-w-[min(100%,460px)] bg-ui-text/5 border border-settings-row-border rounded-[6px] px-[8px] py-[3px]"
          >{{ props.selectedTerminalPath }}</code
        >
      </SettingItem>

      <SettingItem
        v-if="props.showAlwaysElevatedTerminal"
        :label="t('settings.general.alwaysElevatedTerminal')"
        :description="t('settings.general.alwaysElevatedTerminalHint')"
      >
        <SToggle
          :model-value="props.alwaysElevatedTerminal"
          @update:model-value="emit('set-always-elevated-terminal', $event)"
        />
      </SettingItem>
    </SettingSection>

    <SettingSection :label="t('settings.general.sectionInterface')" heading-id="settings-general-interface">
      <SettingItem :label="t('settings.general.language')">
        <SDropdown
          :model-value="props.language"
          :options="props.languageOptions"
          @update:model-value="onLanguageSelect"
        />
      </SettingItem>
    </SettingSection>
  </section>
</template>
