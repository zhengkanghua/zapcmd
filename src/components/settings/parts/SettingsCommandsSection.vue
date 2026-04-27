<script setup lang="ts">
import { ref } from "vue";
import type { CommandManagementViewState } from "../../../features/settings/types";
import { useI18nText } from "../../../i18n";
import type { SettingsCommandsProps } from "../types";
import SettingsCommandsIssues from "./settingsCommands/SettingsCommandsIssues.vue";
import SettingsCommandsTable from "./settingsCommands/SettingsCommandsTable.vue";
import SettingsCommandsToolbar from "./settingsCommands/SettingsCommandsToolbar.vue";

const props = defineProps<SettingsCommandsProps>();
const { t } = useI18nText();
const commandsRegionHeadingId = "settings-commands-region-heading";
const commandsToolbarHeadingId = "settings-commands-toolbar-heading";
const commandsIssuesHeadingId = "settings-commands-issues-heading";

const emit = defineEmits<{
  (e: "toggle-command-enabled", commandId: string, enabled: boolean): void;
  (e: "set-filtered-enabled", enabled: boolean): void;
  (e: "update-view", patch: Partial<CommandManagementViewState>): void;
  (e: "reset-filters"): void;
}>();

const moreFiltersOpen = ref(false);
</script>

<template>
  <section class="settings-commands grid gap-3.5 content-start" :aria-labelledby="commandsRegionHeadingId">
    <h2 :id="commandsRegionHeadingId" class="sr-only">
      {{ t("settings.aria.commandsRegion") }}
    </h2>

    <SettingsCommandsToolbar
      :command-filtered-count="props.commandFilteredCount"
      :command-summary="props.commandSummary"
      :command-view="props.commandView"
      :command-source-options="props.commandSourceOptions"
      :command-status-options="props.commandStatusOptions"
      :command-category-options="props.commandCategoryOptions"
      :command-override-options="props.commandOverrideOptions"
      :command-issue-options="props.commandIssueOptions"
      :command-sort-options="props.commandSortOptions"
      :command-source-file-options="props.commandSourceFileOptions"
      :more-filters-open="moreFiltersOpen"
      :toolbar-heading-id="commandsToolbarHeadingId"
      @set-more-filters-open="moreFiltersOpen = $event"
      @update-view="emit('update-view', $event)"
      @reset-filters="emit('reset-filters')"
    />

    <SettingsCommandsTable
      :command-rows="props.commandRows"
      :visible-command-rows="props.visibleCommandRows"
      @toggle-command-enabled="(commandId, enabled) => emit('toggle-command-enabled', commandId, enabled)"
    />
  </section>

  <SettingsCommandsIssues
    v-if="props.commandLoadIssues.length > 0"
    :command-load-issues="props.commandLoadIssues"
    :heading-id="commandsIssuesHeadingId"
  />
</template>
