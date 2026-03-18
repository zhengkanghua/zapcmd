<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";

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
import SDropdown from "../ui/SDropdown.vue";
import SToggle from "../ui/SToggle.vue";

const props = defineProps<SettingsCommandsProps>();
const { t } = useI18nText();

const emit = defineEmits<{
  (e: "toggle-command-enabled", commandId: string, enabled: boolean): void;
  (e: "set-filtered-enabled", enabled: boolean): void;
  (e: "update-view", patch: Partial<CommandManagementViewState>): void;
  (e: "reset-filters"): void;
}>();

const moreFiltersOpen = ref(false);
const moreFiltersTriggerRef = ref<HTMLButtonElement | null>(null);
const moreFiltersPanelRef = ref<HTMLElement | null>(null);

const fileFilterOptions = computed(() => [
  { value: "all", label: t("settings.commands.allFiles") },
  ...props.commandSourceFileOptions.map((item) => ({
    value: item.value,
    label: `${item.label} (${item.count})`
  }))
]);

const primaryFilters = computed(() => [
  {
    key: "sourceFilter",
    label: t("settings.commands.sourceFilter"),
    modelValue: props.commandView.sourceFilter,
    options: props.commandSourceOptions,
    onUpdate: setSourceFilter
  },
  {
    key: "categoryFilter",
    label: t("settings.commands.tableHeaderCategory"),
    modelValue: props.commandView.categoryFilter,
    options: props.commandCategoryOptions,
    onUpdate: setCategoryFilter
  },
  {
    key: "statusFilter",
    label: t("settings.commands.statusFilter"),
    modelValue: props.commandView.statusFilter,
    options: props.commandStatusOptions,
    onUpdate: setStatusFilter
  },
  {
    key: "sortBy",
    label: t("settings.commands.sortLabel"),
    modelValue: props.commandView.sortBy,
    options: props.commandSortOptions,
    onUpdate: setSortBy
  }
]);

const secondaryFilters = computed(() => [
  {
    key: "fileFilter",
    label: t("settings.commands.fileFilter"),
    modelValue: props.commandView.fileFilter,
    options: fileFilterOptions.value,
    onUpdate: setFileFilter
  },
  {
    key: "overrideFilter",
    label: t("settings.commands.overrideFilter"),
    modelValue: props.commandView.overrideFilter,
    options: props.commandOverrideOptions,
    onUpdate: setOverrideFilter
  },
  {
    key: "issueFilter",
    label: t("settings.commands.issueFilter"),
    modelValue: props.commandView.issueFilter,
    options: props.commandIssueOptions,
    onUpdate: setIssueFilter
  }
]);

const activeSecondaryFilterCount = computed(() => {
  let count = 0;
  if (props.commandView.fileFilter !== "all") {
    count += 1;
  }
  if (props.commandView.overrideFilter !== "all") {
    count += 1;
  }
  if (props.commandView.issueFilter !== "all") {
    count += 1;
  }
  return count;
});

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

function closeMoreFilters(): void {
  moreFiltersOpen.value = false;
}

function toggleMoreFilters(): void {
  moreFiltersOpen.value = !moreFiltersOpen.value;
}

function onResetFilters(): void {
  emit("reset-filters");
  closeMoreFilters();
}

function isMoreFiltersEventInside(event: PointerEvent): boolean {
  if (!(event.target instanceof Element)) {
    return false;
  }

  return (
    moreFiltersTriggerRef.value?.contains(event.target) === true ||
    moreFiltersPanelRef.value?.contains(event.target) === true
  );
}

function onGlobalPointerDown(event: PointerEvent): void {
  if (moreFiltersOpen.value && !isMoreFiltersEventInside(event)) {
    closeMoreFilters();
  }
}

watch(
  moreFiltersOpen,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener("pointerdown", onGlobalPointerDown);
      return;
    }

    document.removeEventListener("pointerdown", onGlobalPointerDown);
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onGlobalPointerDown);
});
</script>

<template>
  <section class="settings-commands" aria-label="command-management">
    <div
      class="settings-commands-toolbar settings-commands-toolbar--sticky settings-commands-toolbar--underlap"
      aria-label="command-management-toolbar"
    >
      <div class="settings-commands-toolbar__search-row">
        <input
          class="settings-commands-toolbar__search"
          type="search"
          :value="props.commandView.query"
          :placeholder="t('settings.commands.queryPlaceholder')"
          @input="onQueryInput"
        />
      </div>
      <div
        class="settings-commands-toolbar__summary settings-commands-toolbar__summary-row"
        aria-label="command-management-summary"
        aria-live="polite"
      >
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
      <div class="settings-commands-toolbar__filters-row" aria-label="command-management-filters">
        <SDropdown
          v-for="filter in primaryFilters"
          :key="filter.key"
          class="settings-commands-toolbar__primary-filter"
          :model-value="filter.modelValue"
          :options="filter.options"
          variant="ghost"
          :aria-label="filter.label"
          @update:model-value="filter.onUpdate"
        />

        <div class="settings-commands-toolbar__more-filters-wrap">
          <button
            ref="moreFiltersTriggerRef"
            type="button"
            class="settings-commands-toolbar__more-filters"
            :class="{ 'settings-commands-toolbar__more-filters--active': activeSecondaryFilterCount > 0 }"
            :aria-expanded="moreFiltersOpen"
            aria-haspopup="dialog"
            aria-controls="settings-commands-more-filters"
            @click="toggleMoreFilters"
          >
            <span>{{ t("settings.commands.moreFilters") }}</span>
            <span
              v-if="activeSecondaryFilterCount > 0"
              class="settings-commands-toolbar__more-filters-count"
            >
              {{ activeSecondaryFilterCount }}
            </span>
          </button>

          <div
            v-if="moreFiltersOpen"
            id="settings-commands-more-filters"
            ref="moreFiltersPanelRef"
            class="settings-commands-toolbar__more-filters-panel"
            role="dialog"
            :aria-label="t('settings.commands.moreFilters')"
          >
            <div class="settings-commands-toolbar__secondary-grid">
              <div
                v-for="filter in secondaryFilters"
                :key="filter.key"
                class="settings-commands-toolbar__secondary-group"
              >
                <span class="settings-commands-toolbar__secondary-label">{{ filter.label }}</span>
                <SDropdown
                  class="settings-commands-toolbar__secondary-filter"
                  :model-value="filter.modelValue"
                  :options="filter.options"
                  variant="ghost"
                  @update:model-value="filter.onUpdate"
                />
              </div>
            </div>
            <div class="settings-commands-toolbar__actions">
              <button
                type="button"
                class="settings-commands-toolbar__reset"
                :disabled="!hasActiveFilters"
                @click="onResetFilters"
              >
                {{ t("settings.commands.resetFilters") }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-commands-table">
      <div class="settings-commands-table__container" role="table" aria-label="command-management-table">
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
            <span class="settings-commands-table__badge">{{ row.category }}</span>
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
