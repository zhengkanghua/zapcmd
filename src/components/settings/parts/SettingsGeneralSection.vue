<script setup lang="ts">
import { computed } from "vue";

import type { SettingsGeneralProps } from "../types";
import SDropdown from "../ui/SDropdown.vue";
import SettingItem from "../ui/SettingItem.vue";
import SettingSection from "../ui/SettingSection.vue";
import SToggle from "../ui/SToggle.vue";
import { useI18nText, type AppLocale } from "../../../i18n";
import type { TerminalReusePolicy } from "../../../stores/settingsStore";

const props = defineProps<SettingsGeneralProps>();
const { t } = useI18nText();

const emit = defineEmits<{
  (e: "select-terminal", id: string): void;
  (e: "select-language", locale: AppLocale): void;
  (e: "set-auto-check-update", value: boolean): void;
  (e: "set-launch-at-login", value: boolean): void;
  (e: "set-always-elevated-terminal", value: boolean): void;
  (e: "set-terminal-reuse-policy", value: TerminalReusePolicy): void;
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

const terminalReusePolicyOptions = computed(() => [
  {
    value: "never",
    label: t("settings.general.terminalReusePolicyNever"),
    description: t("settings.general.terminalReusePolicyNeverHint")
  },
  {
    value: "normal-only",
    label: t("settings.general.terminalReusePolicyNormalOnly"),
    description: t("settings.general.terminalReusePolicyNormalOnlyHint")
  },
  {
    value: "normal-and-elevated",
    label: t("settings.general.terminalReusePolicyNormalAndElevated"),
    description: t("settings.general.terminalReusePolicyNormalAndElevatedHint")
  }
]);

function onLanguageSelect(value: string): void {
  emit("select-language", value as AppLocale);
}

function onTerminalReusePolicySelect(value: string): void {
  emit("set-terminal-reuse-policy", value as TerminalReusePolicy);
}
</script>

<template>
  <section class="settings-group settings-general" aria-label="settings-general">
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
        <SDropdown
          :model-value="terminalSelectValue"
          :options="terminalSelectOptions"
          :disabled="terminalSelectDisabled"
          @update:model-value="emit('select-terminal', $event)"
        />
      </SettingItem>

      <p
        v-if="props.terminalLoading"
        class="settings-status settings-status--loading"
        role="status"
        aria-live="polite"
      >
        {{ t("settings.general.terminalDetectingHint") }}
      </p>

      <SettingItem :label="t('settings.general.currentTerminalPath')">
        <code class="settings-card__mono">{{ props.selectedTerminalPath }}</code>
      </SettingItem>

      <SettingItem
        :label="t('settings.general.terminalReusePolicy')"
        :description="t('settings.general.terminalReusePolicyHint')"
      >
        <div class="settings-general__reuse-policy">
          <SDropdown
            :model-value="props.terminalReusePolicy"
            :options="terminalReusePolicyOptions"
            @update:model-value="onTerminalReusePolicySelect"
          />
          <ul class="settings-general__reuse-policy-list" aria-label="terminal-reuse-policy-hints">
            <li
              v-for="item in terminalReusePolicyOptions"
              :key="item.value"
              class="settings-general__reuse-policy-item"
            >
              <strong>{{ item.label }}</strong>
              <span>{{ item.description }}</span>
            </li>
          </ul>
        </div>
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

<style scoped>
.settings-general__reuse-policy {
  display: grid;
  gap: 8px;
}

.settings-general__reuse-policy-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.settings-general__reuse-policy-item {
  display: grid;
  gap: 2px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--ui-subtle);
}

.settings-general__reuse-policy-item strong {
  color: var(--ui-text);
  font-weight: 600;
}
</style>
