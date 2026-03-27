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
  <section class="settings-commands grid gap-3.5 content-start" aria-label="command-management">
    <div
      class="settings-commands-toolbar settings-commands-toolbar--sticky settings-commands-toolbar--underlap relative grid gap-3 p-3.5 border border-settings-card-border rounded-[18px] bg-settings-toolbar-sticky bg-gradient-to-b from-ui-text/[0.03] to-ui-text/0 shadow-[0_18px_40px_var(--tw-shadow-color)] shadow-ui-black/18 overflow-visible sticky top-[-12px] z-settings-toolbar backdrop-blur-ui-70"
      aria-label="command-management-toolbar"
    >
      <div class="settings-commands-toolbar__search-row min-w-0 grid gap-2.5">
        <input
          class="settings-commands-toolbar__search w-full h-[38px] px-3.5 border border-settings-dropdown-border rounded-[11px] bg-ui-text/[0.045] text-ui-text text-[13px] outline-none transition-[border-color,box-shadow,background] duration-120 placeholder:text-ui-text/28 focus-visible:border-ui-brand/22 focus-visible:shadow-settings-focus focus-visible:bg-ui-text/[0.055]"
          type="search"
          :value="props.commandView.query"
          :placeholder="t('settings.commands.queryPlaceholder')"
          @input="onQueryInput"
        />
      </div>
      <div
        class="settings-commands-toolbar__summary settings-commands-toolbar__summary-row flex flex-wrap items-center justify-start gap-2 settings-narrow:flex-col settings-narrow:items-start"
        aria-label="command-management-summary"
        aria-live="polite"
      >
        <span
          class="settings-commands-toolbar__badge px-2.5 py-[5px] border border-ui-text/7 rounded-full bg-settings-badge text-settings-badge-text text-[11.5px] [font-variant-numeric:tabular-nums] tracking-[0.01em]"
        >
          {{ t("settings.commands.summaryFiltered", { filtered: props.commandFilteredCount }) }}
        </span>
        <span
          class="settings-commands-toolbar__badge px-2.5 py-[5px] border border-ui-text/7 rounded-full bg-settings-badge text-settings-badge-text text-[11.5px] [font-variant-numeric:tabular-nums] tracking-[0.01em]"
        >
          {{ t("settings.commands.summaryTotal", { total: props.commandSummary.total }) }}
        </span>
        <span
          class="settings-commands-toolbar__badge settings-commands-toolbar__badge--accent px-2.5 py-[5px] border border-ui-brand/24 rounded-full bg-ui-brand/10 text-ui-brand text-[11.5px] [font-variant-numeric:tabular-nums] tracking-[0.01em]"
        >
          {{ t("settings.commands.summaryEnabled", { enabled: props.commandSummary.enabled }) }}
        </span>
      </div>
      <div
        class="settings-commands-toolbar__filters-row flex flex-wrap items-center gap-2"
        aria-label="command-management-filters"
      >
        <SDropdown
          v-for="filter in primaryFilters"
          :key="filter.key"
          class="settings-commands-toolbar__primary-filter flex-none"
          :model-value="filter.modelValue"
          :options="filter.options"
          variant="ghost"
          :aria-label="filter.label"
          @update:model-value="filter.onUpdate"
        />

        <div class="settings-commands-toolbar__more-filters-wrap relative ml-auto flex-none settings-narrow:ml-0">
          <button
            ref="moreFiltersTriggerRef"
            type="button"
            class="settings-commands-toolbar__more-filters min-h-[34px] inline-flex items-center gap-2 px-3 py-1.5 border border-transparent rounded-full bg-settings-badge text-settings-badge-text text-[12px] cursor-pointer transition-[background,border-color,color,box-shadow] duration-150 ease-[cubic-bezier(0.33,1,0.68,1)] hover:border-settings-dropdown-border hover:bg-settings-dropdown-hover hover:text-ui-text focus-visible:outline-none focus-visible:shadow-settings-focus"
            :class="{
              'settings-commands-toolbar__more-filters--active text-ui-brand':
                activeSecondaryFilterCount > 0 && !moreFiltersOpen,
              'border-settings-dropdown-border bg-settings-dropdown-hover text-ui-text':
                moreFiltersOpen
            }"
            :aria-expanded="moreFiltersOpen"
            aria-haspopup="dialog"
            aria-controls="settings-commands-more-filters"
            @click="toggleMoreFilters"
          >
            <span>{{ t("settings.commands.moreFilters") }}</span>
            <span
              v-if="activeSecondaryFilterCount > 0"
              class="settings-commands-toolbar__more-filters-count min-w-[18px] px-1.5 py-[1px] rounded-full bg-ui-brand/18 text-ui-brand text-[11px] leading-[1.4] text-center"
            >
              {{ activeSecondaryFilterCount }}
            </span>
          </button>

          <div
            v-if="moreFiltersOpen"
            id="settings-commands-more-filters"
            ref="moreFiltersPanelRef"
            class="settings-commands-toolbar__more-filters-panel absolute top-[calc(100%+8px)] right-0 w-[min(360px,calc(100vw-56px))] p-3 border border-settings-dropdown-border rounded-[16px] bg-settings-dropdown shadow-ui backdrop-blur-ui z-settings-popover settings-narrow:left-0 settings-narrow:right-auto settings-narrow:w-[min(100%,360px)]"
            role="dialog"
            :aria-label="t('settings.commands.moreFilters')"
          >
            <div class="settings-commands-toolbar__secondary-grid grid gap-2.5">
              <div
                v-for="filter in secondaryFilters"
                :key="filter.key"
                class="settings-commands-toolbar__secondary-group grid gap-1.5"
              >
                <span
                  class="settings-commands-toolbar__secondary-label text-[11px] font-semibold tracking-[0.04em] uppercase text-settings-hint"
                  >{{ filter.label }}</span
                >
                <SDropdown
                  class="settings-commands-toolbar__secondary-filter w-full [&_.s-dropdown__trigger]:w-full [&_.s-dropdown__trigger]:justify-between"
                  :model-value="filter.modelValue"
                  :options="filter.options"
                  variant="ghost"
                  @update:model-value="filter.onUpdate"
                />
              </div>
            </div>
            <div class="settings-commands-toolbar__actions mt-3 flex justify-end">
              <button
                type="button"
                class="settings-commands-toolbar__reset border-0 bg-transparent px-2 py-[5px] text-[12px] text-ui-text/52 underline cursor-pointer transition-colors duration-120 hover:text-ui-text/78 disabled:opacity-[0.35] disabled:text-ui-text/30 disabled:cursor-not-allowed disabled:no-underline"
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

    <div class="settings-commands-table min-w-0 grid gap-2.5">
      <div
        class="settings-commands-table__container grid gap-1.5 pt-1"
        role="table"
        aria-label="command-management-table"
      >
        <div
          class="settings-commands-table__header grid grid-cols-12 items-center gap-x-3 px-3.5 pt-0 pb-0.5 text-[11px] uppercase tracking-[0.6px] text-ui-text/30 settings-narrow:gap-x-2.5"
          role="row"
        >
          <div
            class="settings-commands-table__cell settings-commands-table__cell--command min-w-0 col-span-6 settings-narrow:col-span-7"
            role="columnheader"
          >
            {{ t("settings.commands.tableHeaderCommand") }}
          </div>
          <div
            class="settings-commands-table__cell settings-commands-table__cell--category min-w-0 col-span-3 settings-narrow:col-span-3"
            role="columnheader"
          >
            {{ t("settings.commands.tableHeaderCategory") }}
          </div>
          <div
            class="settings-commands-table__cell settings-commands-table__cell--source min-w-0 col-span-2 settings-narrow:col-start-1 settings-narrow:col-span-8 settings-narrow:mt-1"
            role="columnheader"
          >
            {{ t("settings.commands.tableHeaderSource") }}
          </div>
          <div
            class="settings-commands-table__cell settings-commands-table__cell--toggle min-w-0 col-span-1 text-right settings-narrow:col-start-11 settings-narrow:col-span-2"
            role="columnheader"
          >
            {{ t("settings.commands.tableHeaderEnabled") }}
          </div>
        </div>

        <div
          v-for="row in props.commandRows"
          :key="row.id"
          :class="[
            'settings-commands-table__row grid grid-cols-12 items-center gap-x-3 px-3.5 py-3 border border-ui-text/6 rounded-panel bg-ui-text/[0.025] transition-[background,border-color,transform] duration-120 hover:bg-settings-table-row-hover hover:border-ui-text/11 hover:-translate-y-[1px] settings-narrow:gap-x-2.5',
            {
              'settings-commands-table__row--disabled': !row.enabled,
              'opacity-[0.58]': !row.enabled
            }
          ]"
          role="row"
          :title="row.sourcePath ?? undefined"
        >
          <div
            class="settings-commands-table__cell settings-commands-table__cell--command min-w-0 col-span-6 settings-narrow:col-span-7"
            role="cell"
          >
            <div class="settings-commands-table__title text-[13px] text-ui-text/88 font-[450]">
              {{ row.title }}
            </div>
            <code
              class="settings-commands-table__id block mt-[3px] text-[11px] text-ui-text/30 font-mono truncate"
              >{{ row.id }}</code
            >
          </div>

          <div
            class="settings-commands-table__cell settings-commands-table__cell--category min-w-0 col-span-3 settings-narrow:col-span-3"
            role="cell"
          >
            <span
              class="settings-commands-table__badge inline-flex items-center max-w-full min-w-0 px-2.5 py-[5px] border border-ui-text/7 rounded-full bg-ui-text/5 text-ui-text/68 text-[11.5px] whitespace-nowrap overflow-hidden [text-overflow:ellipsis]"
              >{{ row.category }}</span
            >
          </div>

          <div
            class="settings-commands-table__cell settings-commands-table__cell--source min-w-0 col-span-2 inline-flex items-center settings-narrow:col-start-1 settings-narrow:col-span-8 settings-narrow:mt-1"
            role="cell"
          >
            <span
              class="settings-commands-table__source-dot inline-block w-[7px] h-[7px] rounded-full mr-1.5 bg-ui-text/25"
              :class="{
                'settings-commands-table__source-dot--user': row.source === 'user',
                'bg-ui-brand': row.source === 'user',
                'settings-commands-table__source-dot--builtin': row.source === 'builtin',
                'bg-ui-text/24': row.source === 'builtin'
              }"
              aria-hidden="true"
            />
            <span class="settings-commands-table__source-text text-[12px] text-ui-text/44 whitespace-nowrap">
              {{ row.source === "user" ? t("settings.commands.sourceUser") : t("settings.commands.sourceBuiltin") }}
            </span>
          </div>

          <div
            class="settings-commands-table__cell settings-commands-table__cell--toggle min-w-0 col-span-1 flex justify-end settings-narrow:col-start-11 settings-narrow:col-span-2"
            role="cell"
          >
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

  <section
    v-if="props.commandLoadIssues.length > 0"
    class="settings-card rounded-2xl border border-settings-card-border bg-settings-card overflow-hidden"
    aria-label="command-load-issues"
  >
    <h2
      class="settings-card__title m-0 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.8px] text-settings-card-title bg-ui-text/[0.015] border-b border-b-settings-row-border"
    >
      {{ t("settings.commands.loadIssuesTitle") }}
    </h2>
    <p class="settings-hint m-0 px-4 pt-2.5 pb-3 text-[12px] text-settings-hint leading-[1.5]">
      {{ t("settings.commands.loadIssuesHint") }}
    </p>
    <ul class="settings-command-issues m-0 p-0 list-none grid gap-2 text-[12px] text-ui-danger">
      <li
        v-for="issue in props.commandLoadIssues"
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
