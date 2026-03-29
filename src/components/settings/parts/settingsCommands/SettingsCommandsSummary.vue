<script setup lang="ts">
import type { CommandManagementSummary } from "../../../../features/settings/types";
import { useI18nText } from "../../../../i18n";

defineProps<{
  commandFilteredCount: number;
  commandSummary: CommandManagementSummary;
  toolbarHeadingId: string;
}>();

const { t } = useI18nText();
</script>

<template>
  <div
    class="settings-commands-toolbar__summary settings-commands-toolbar__summary-row flex flex-wrap items-center justify-start gap-2 settings-narrow:flex-col settings-narrow:items-start"
    :aria-labelledby="toolbarHeadingId"
    aria-live="polite"
  >
    <span
      class="settings-commands-toolbar__badge px-2.5 py-[5px] border border-ui-text/7 rounded-full bg-settings-badge text-settings-badge-text text-[11.5px] [font-variant-numeric:tabular-nums] tracking-[0.01em]"
    >
      {{ t("settings.commands.summaryFiltered", { filtered: commandFilteredCount }) }}
    </span>
    <span
      class="settings-commands-toolbar__badge px-2.5 py-[5px] border border-ui-text/7 rounded-full bg-settings-badge text-settings-badge-text text-[11.5px] [font-variant-numeric:tabular-nums] tracking-[0.01em]"
    >
      {{ t("settings.commands.summaryTotal", { total: commandSummary.total }) }}
    </span>
    <span
      class="settings-commands-toolbar__badge settings-commands-toolbar__badge--accent px-2.5 py-[5px] border border-ui-brand/24 rounded-full bg-ui-brand/10 text-ui-brand text-[11.5px] [font-variant-numeric:tabular-nums] tracking-[0.01em]"
    >
      {{ t("settings.commands.summaryEnabled", { enabled: commandSummary.enabled }) }}
    </span>
  </div>
</template>
