<script setup lang="ts">
import type { CommandLoadIssueView } from "../../../../features/settings/types";
import { useI18nText } from "../../../../i18n";

defineProps<{
  commandLoadIssues: CommandLoadIssueView[];
  headingId: string;
}>();

const { t } = useI18nText();
</script>

<template>
  <section
    class="settings-card rounded-2xl border border-settings-card-border bg-settings-card overflow-hidden"
    :aria-labelledby="headingId"
  >
    <h2
      :id="headingId"
      class="settings-card__title m-0 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.8px] text-settings-card-title bg-ui-text/[0.015] border-b border-b-settings-row-border"
    >
      {{ t("settings.commands.loadIssuesTitle") }}
    </h2>
    <p class="settings-hint m-0 px-4 pt-2.5 pb-3 text-[12px] text-settings-hint leading-[1.5]">
      {{ t("settings.commands.loadIssuesHint") }}
    </p>
    <ul class="settings-command-issues m-0 p-0 list-none grid gap-2 text-[12px] text-ui-danger">
      <li
        v-for="issue in commandLoadIssues"
        :key="`${issue.code}:${issue.stage}:${issue.sourceId}:${issue.commandId ?? ''}`"
        class="settings-command-issues__item grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 px-3 py-[9px] border border-ui-danger/28 rounded-surface bg-ui-danger/7"
      >
        <span
          class="settings-command-issues__icon text-ui-danger text-[14px] leading-[1.2]"
          aria-hidden="true"
          >⚠</span
        >
        <span>{{ issue.message }}</span>
      </li>
    </ul>
  </section>
</template>
