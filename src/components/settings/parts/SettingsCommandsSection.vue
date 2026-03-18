<script setup lang="ts">
import { computed } from "vue";

import { useI18nText } from "../../../i18n";
import type {
  CommandFilterIssue,
  CommandFilterOverride,
  CommandFilterSource,
  CommandFilterStatus,
  CommandManagementViewState,
  CommandSortBy
} from "../../../features/settings/types";
import type { SettingsCommandsProps } from "../types";
import SFilterChip from "../ui/SFilterChip.vue";
import SToggle from "../ui/SToggle.vue";

const props = defineProps<SettingsCommandsProps>();
const { t } = useI18nText();

const emit = defineEmits<{
  (e: "toggle-command-enabled", commandId: string, enabled: boolean): void;
  (e: "set-filtered-enabled", enabled: boolean): void;
  (e: "update-view", patch: Partial<CommandManagementViewState>): void;
  (e: "reset-filters"): void;
}>();

const fileFilterOptions = computed(() => [
  { value: "all", label: t("settings.commands.allFiles") },
  ...props.commandSourceFileOptions.map((item) => ({
    value: item.value,
    label: `${item.label} (${item.count})`
  }))
]);

const hasActiveFilters = computed(() => {
  const view = props.commandView;
  return (
    view.query.trim().length > 0 ||
    view.sourceFilter !== "all" ||
    view.statusFilter !== "all" ||
    view.categoryFilter !== "all" ||
    view.overrideFilter !== "all" ||
    view.issueFilter !== "all" ||
    view.fileFilter !== "all" ||
    view.sortBy !== "default"
  );
});

function onQueryInput(event: Event): void {
  const target = event.target as HTMLInputElement | null;
  emit("update-view", { query: target?.value ?? "" });
}

function setSourceFilter(value: string): void {
  emit("update-view", { sourceFilter: value as CommandFilterSource });
}

function setStatusFilter(value: string): void {
  emit("update-view", { statusFilter: value as CommandFilterStatus });
}

function setCategoryFilter(value: string): void {
  emit("update-view", { categoryFilter: value });
}

function setFileFilter(value: string): void {
  emit("update-view", { fileFilter: value });
}

function setOverrideFilter(value: string): void {
  emit("update-view", { overrideFilter: value as CommandFilterOverride });
}

function setIssueFilter(value: string): void {
  emit("update-view", { issueFilter: value as CommandFilterIssue });
}

function setSortBy(value: string): void {
  emit("update-view", { sortBy: value as CommandSortBy });
}
</script>

<template>
  <section class="settings-commands" aria-label="command-management">
    <div class="settings-commands-toolbar" aria-label="command-management-toolbar">
      <input
        class="settings-commands-toolbar__search"
        type="search"
        :value="props.commandView.query"
        :placeholder="t('settings.commands.queryPlaceholder')"
        @input="onQueryInput"
      />
      <div class="settings-commands-toolbar__summary" aria-label="command-management-summary" aria-live="polite">
        <span class="settings-commands-toolbar__badge">
          {{ t("settings.commands.summaryFiltered", { filtered: props.commandFilteredCount }) }}
        </span>
        <span class="settings-commands-toolbar__badge">
          {{ t("settings.commands.summaryTotal", { total: props.commandSummary.total }) }}
        </span>
        <span class="settings-commands-toolbar__badge settings-commands-toolbar__badge--accent">
          {{ t("settings.commands.summaryEnabled", { enabled: props.commandSummary.enabled }) }}
        </span>
      </div>
    </div>

    <form class="settings-commands-filters" aria-label="command-management-filters" @submit.prevent>
      <SFilterChip
        :model-value="props.commandView.sourceFilter"
        :options="props.commandSourceOptions"
        default-value="all"
        @update:model-value="setSourceFilter"
      />
      <SFilterChip
        :model-value="props.commandView.statusFilter"
        :options="props.commandStatusOptions"
        default-value="all"
        @update:model-value="setStatusFilter"
      />
      <SFilterChip
        :model-value="props.commandView.categoryFilter"
        :options="props.commandCategoryOptions"
        default-value="all"
        @update:model-value="setCategoryFilter"
      />
      <SFilterChip
        :model-value="props.commandView.fileFilter"
        :options="fileFilterOptions"
        default-value="all"
        @update:model-value="setFileFilter"
      />
      <SFilterChip
        :model-value="props.commandView.overrideFilter"
        :options="props.commandOverrideOptions"
        default-value="all"
        @update:model-value="setOverrideFilter"
      />
      <SFilterChip
        :model-value="props.commandView.issueFilter"
        :options="props.commandIssueOptions"
        default-value="all"
        @update:model-value="setIssueFilter"
      />
      <SFilterChip
        :model-value="props.commandView.sortBy"
        :options="props.commandSortOptions"
        default-value="default"
        @update:model-value="setSortBy"
      />
      <button
        type="button"
        class="settings-commands-filters__reset"
        :disabled="!hasActiveFilters"
        @click="emit('reset-filters')"
      >
        {{ t("settings.commands.resetFilters") }}
      </button>
    </form>

    <div class="settings-commands-table" role="table" aria-label="command-management-table">
      <div class="settings-commands-table__header" role="row">
        <div class="settings-commands-table__cell settings-commands-table__cell--command" role="columnheader">
          {{ t("settings.commands.tableHeaderCommand") }}
        </div>
        <div class="settings-commands-table__cell settings-commands-table__cell--category" role="columnheader">
          {{ t("settings.commands.tableHeaderCategory") }}
        </div>
        <div class="settings-commands-table__cell settings-commands-table__cell--source" role="columnheader">
          {{ t("settings.commands.tableHeaderSource") }}
        </div>
        <div class="settings-commands-table__cell settings-commands-table__cell--toggle" role="columnheader">
          {{ t("settings.commands.tableHeaderEnabled") }}
        </div>
      </div>

      <div
        v-for="row in props.commandRows"
        :key="row.id"
        :class="[
          'settings-commands-table__row',
          {
            'settings-commands-table__row--disabled': !row.enabled
          }
        ]"
        role="row"
        :title="row.sourcePath ?? undefined"
      >
        <div class="settings-commands-table__cell settings-commands-table__cell--command" role="cell">
          <div class="settings-commands-table__title">{{ row.title }}</div>
          <code class="settings-commands-table__id">{{ row.id }}</code>
        </div>

        <div class="settings-commands-table__cell settings-commands-table__cell--category" role="cell">
          {{ row.category }}
        </div>

        <div class="settings-commands-table__cell settings-commands-table__cell--source" role="cell">
          <span
            class="settings-commands-table__source-dot"
            :class="{
              'settings-commands-table__source-dot--user': row.source === 'user',
              'settings-commands-table__source-dot--builtin': row.source === 'builtin'
            }"
            aria-hidden="true"
          />
          <span class="settings-commands-table__source-text">
            {{ row.source === "user" ? t("settings.commands.sourceUser") : t("settings.commands.sourceBuiltin") }}
          </span>
        </div>

        <div class="settings-commands-table__cell settings-commands-table__cell--toggle" role="cell">
          <SToggle
            compact
            :model-value="row.enabled"
            @update:model-value="emit('toggle-command-enabled', row.id, $event)"
          />
        </div>
      </div>
    </div>
  </section>

  <section v-if="props.commandLoadIssues.length > 0" class="settings-card" aria-label="command-load-issues">
    <h2 class="settings-card__title">{{ t("settings.commands.loadIssuesTitle") }}</h2>
    <p class="settings-hint">{{ t("settings.commands.loadIssuesHint") }}</p>
    <ul class="settings-command-issues">
      <li
        v-for="issue in props.commandLoadIssues"
        :key="`${issue.code}:${issue.stage}:${issue.sourceId}:${issue.commandId ?? ''}`"
        class="settings-command-issues__item"
      >
        <span class="settings-command-issues__icon" aria-hidden="true">⚠</span>
        <span>{{ issue.message }}</span>
      </li>
    </ul>
  </section>
</template>

