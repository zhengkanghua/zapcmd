<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18nText } from "../../../i18n";
import type { CommandManagementViewState } from "../../../features/settings/types";
import SettingsSelectControl from "./SettingsSelectControl.vue";
import type { SettingsCommandsProps } from "../types";
import { hasNonDefaultFilters, buildActiveFilterChips } from "./commandFilterHelpers";

const props = defineProps<SettingsCommandsProps>();
const { t } = useI18nText();

const emit = defineEmits<{
  (e: "toggle-command-enabled", commandId: string, enabled: boolean): void;
  (e: "set-filtered-enabled", enabled: boolean): void;
  (e: "update-view", patch: Partial<CommandManagementViewState>): void;
  (e: "reset-filters"): void;
}>();

const filtersExpanded = ref(false);
const hasToggledOnce = ref(false);

function toggleFiltersExpanded(): void {
  hasToggledOnce.value = true;
  filtersExpanded.value = !filtersExpanded.value;
}

const hasActiveFilters = computed(() => hasNonDefaultFilters(props.commandView));

const activeFilterChips = computed(() =>
  buildActiveFilterChips(props.commandView, {
    sourceOptions: props.commandSourceOptions,
    statusOptions: props.commandStatusOptions,
    overrideOptions: props.commandOverrideOptions,
    issueOptions: props.commandIssueOptions,
    sortOptions: props.commandSortOptions
  })
);

function onToggleCommand(commandId: string, event: Event): void {
  const target = event.target as HTMLInputElement | null;
  emit("toggle-command-enabled", commandId, target?.checked ?? true);
}

function onTextInput(key: keyof CommandManagementViewState, event: Event): void {
  const target = event.target as HTMLInputElement | null;
  emit("update-view", {
    [key]: target?.value ?? ""
  });
}

function onSelectValue(key: keyof CommandManagementViewState, value: string): void {
  emit("update-view", {
    [key]: value
  });
}

const commandFileFilterOptions = computed(() => [
  {
    value: "all",
    label: t("settings.commands.allFiles")
  },
  ...props.commandSourceFileOptions.map((item) => ({
    value: item.value,
    label: item.label,
    description: t("settings.commands.fileCount", { count: item.count })
  }))
]);

const overrideBadgeHint = computed(() => t("settings.commands.overrideBadgeHint"));
const issueBadgeHint = computed(() => t("settings.commands.issueBadgeHint"));

function isDisplayModeActive(mode: CommandManagementViewState["displayMode"]): boolean {
  return props.commandView.displayMode === mode;
}
</script>

<template>
  <section class="settings-group">
    <h2>{{ t("settings.commands.title") }}</h2>

    <div class="settings-commands-chips">
      <span class="settings-commands-chip">
        {{ t("settings.commands.summaryTotal", { total: props.commandSummary.total }) }}
      </span>
      <span class="settings-commands-chip">
        {{ t("settings.commands.summaryFiltered", { filtered: props.commandFilteredCount }) }}
      </span>
      <span class="settings-commands-chip settings-commands-chip--accent">
        {{ t("settings.commands.summaryEnabled", { enabled: props.commandSummary.enabled }) }}
      </span>
      <span v-if="props.commandSummary.disabled > 0" class="settings-commands-chip settings-commands-chip--warn">
        {{ t("settings.commands.summaryDisabled", { disabled: props.commandSummary.disabled }) }}
      </span>
      <span v-if="props.commandSummary.userDefined > 0" class="settings-commands-chip">
        {{ t("settings.commands.summaryUserDefined", { userDefined: props.commandSummary.userDefined }) }}
      </span>
      <span v-if="props.commandSummary.overridden > 0" class="settings-commands-chip settings-commands-chip--warn">
        {{ t("settings.commands.summaryOverridden", { overridden: props.commandSummary.overridden }) }}
      </span>
    </div>

    <form class="settings-commands-filters" aria-label="command-management-filters" @submit.prevent>
      <div class="settings-commands-filters__primary">
        <div class="settings-field settings-field--grow">
          <label for="command-query-input">{{ t("settings.commands.queryLabel") }}</label>
          <div class="settings-search-input">
            <svg class="settings-search-input__icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M10.5 3a7.5 7.5 0 0 1 5.98 12.03l4.24 4.24a1 1 0 0 1-1.42 1.42l-4.24-4.24A7.5 7.5 0 1 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11a5.5 5.5 0 0 0 0-11Z"
              />
            </svg>
            <input
              id="command-query-input"
              class="settings-readonly settings-search-input__control"
              :value="props.commandView.query"
              type="text"
              :placeholder="t('settings.commands.queryPlaceholder')"
              @input="onTextInput('query', $event)"
            />
          </div>
        </div>

        <div class="settings-commands-filters__actions">
          <button type="button" class="btn-muted btn-small" @click="emit('set-filtered-enabled', true)">
            {{ t("settings.commands.enableFiltered", { count: props.commandFilteredCount }) }}
          </button>
          <button type="button" class="btn-muted btn-small" @click="emit('set-filtered-enabled', false)">
            {{ t("settings.commands.disableFiltered", { count: props.commandFilteredCount }) }}
          </button>
          <button type="button" class="btn-muted btn-small" @click="emit('reset-filters')">{{ t("settings.commands.resetFilters") }}</button>
          <button
            type="button"
            class="settings-commands-filters__toggle"
            :title="t('settings.commands.toggleFilters')"
            @click="toggleFiltersExpanded"
          >
            <span
              class="settings-commands-filters__arrow"
              :class="{ 'settings-commands-filters__arrow--open': filtersExpanded }"
            >▾</span>
          </button>
        </div>
      </div>

      <div
        v-if="!filtersExpanded && hasActiveFilters"
        class="settings-commands-filter-chips"
      >
        <span
          v-for="chip in activeFilterChips"
          :key="chip.key"
          class="settings-commands-chip"
        >{{ chip.label }}</span>
      </div>

      <div
        class="settings-commands-filters__advanced"
        :class="{
          'settings-commands-filters__advanced--open': filtersExpanded,
          'settings-commands-filters__advanced--closing': hasToggledOnce && !filtersExpanded
        }"
      >
        <div class="settings-commands-filters__grid">
          <div class="settings-field">
            <label for="command-source-filter">{{ t("settings.commands.sourceFilter") }}</label>
            <SettingsSelectControl
              id="command-source-filter"
              :model-value="props.commandView.sourceFilter"
              :options="props.commandSourceOptions"
              @update:model-value="onSelectValue('sourceFilter', $event)"
            />
          </div>

          <div class="settings-field">
            <label for="command-status-filter">{{ t("settings.commands.statusFilter") }}</label>
            <SettingsSelectControl
              id="command-status-filter"
              :model-value="props.commandView.statusFilter"
              :options="props.commandStatusOptions"
              @update:model-value="onSelectValue('statusFilter', $event)"
            />
          </div>

          <div class="settings-field">
            <label for="command-override-filter">{{ t("settings.commands.overrideFilter") }}</label>
            <SettingsSelectControl
              id="command-override-filter"
              :model-value="props.commandView.overrideFilter"
              :options="props.commandOverrideOptions"
              @update:model-value="onSelectValue('overrideFilter', $event)"
            />
          </div>

          <div class="settings-field">
            <label for="command-issue-filter">{{ t("settings.commands.issueFilter") }}</label>
            <SettingsSelectControl
              id="command-issue-filter"
              :model-value="props.commandView.issueFilter"
              :options="props.commandIssueOptions"
              @update:model-value="onSelectValue('issueFilter', $event)"
            />
          </div>

          <div class="settings-field settings-field--span-2">
            <label for="command-file-filter">{{ t("settings.commands.fileFilter") }}</label>
            <SettingsSelectControl
              id="command-file-filter"
              :model-value="props.commandView.fileFilter"
              :options="commandFileFilterOptions"
              @update:model-value="onSelectValue('fileFilter', $event)"
            />
          </div>

          <div class="settings-field settings-field--span-2 settings-field--sort-display">
            <div class="settings-field__control">
              <label for="command-sort-select">{{ t("settings.commands.sortLabel") }}</label>
              <SettingsSelectControl
                id="command-sort-select"
                :model-value="props.commandView.sortBy"
                :options="props.commandSortOptions"
                @update:model-value="onSelectValue('sortBy', $event)"
              />
            </div>

            <div class="settings-field__control settings-display-mode">
              <span class="settings-display-mode__label">{{ t("settings.commands.displayMode") }}</span>
              <div class="settings-display-mode__group" role="group" aria-label="command-display-mode-toggle">
                <button
                  id="command-display-mode-list"
                  type="button"
                  class="settings-display-mode__button"
                  :class="{ 'settings-display-mode__button--active': isDisplayModeActive('list') }"
                  :title="t('settings.commands.displayListTitle')"
                  :aria-label="t('settings.commands.displayListAria')"
                  @click="onSelectValue('displayMode', 'list')"
                >
                  ≡
                </button>
                <button
                  id="command-display-mode-grouped"
                  type="button"
                  class="settings-display-mode__button"
                  :class="{ 'settings-display-mode__button--active': isDisplayModeActive('groupedByFile') }"
                  :title="t('settings.commands.displayGroupedTitle')"
                  :aria-label="t('settings.commands.displayGroupedAria')"
                  @click="onSelectValue('displayMode', 'groupedByFile')"
                >
                  ⊟
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  </section>

  <section v-if="props.commandLoadIssues.length > 0" class="settings-group">
    <h2>{{ t("settings.commands.loadIssuesTitle") }}</h2>
    <ul class="settings-command-issues" aria-label="command-load-issues">
      <li
        v-for="issue in props.commandLoadIssues"
        :key="`${issue.code}:${issue.sourceId}:${issue.commandId ?? ''}`"
        class="settings-command-issues__item"
      >
        <span class="settings-command-issues__icon" aria-hidden="true">⚠</span>
        <span>{{ issue.message }}</span>
      </li>
    </ul>
  </section>

  <section class="settings-group">
    <h2>{{ t("settings.commands.commandListTitle") }}</h2>
    <ul v-if="props.commandView.displayMode === 'list'" class="settings-command-list" aria-label="command-management-list">
      <li v-for="item in props.commandRows" :key="item.id" class="settings-command-list__item">
        <div class="settings-command-list__meta">
          <p class="settings-command-list__title">{{ item.title }}</p>
          <p class="settings-command-list__desc">
            <code>{{ item.id }}</code>
            <span class="settings-command-list__separator">·</span>
            <span>{{ item.category }}</span>
            <span class="settings-command-list__separator">·</span>
            <span>{{ item.source === "user" ? t("settings.commands.sourceUser") : t("settings.commands.sourceBuiltin") }}</span>
            <span v-if="item.overridesBuiltin" class="settings-command-list__badge" :title="overrideBadgeHint">
              {{ t("settings.commands.badgeOverride") }}
            </span>
            <span
              v-if="item.hasLoadIssue"
              class="settings-command-list__badge settings-command-list__badge--warn"
              :title="issueBadgeHint"
            >
              {{ t("settings.commands.badgeIssue") }}
            </span>
          </p>
          <p v-if="item.sourcePath" class="settings-command-list__path">{{ item.sourcePath }}</p>
        </div>
        <label class="settings-command-list__toggle">
          <input
            :id="`command-toggle-${item.id}`"
            type="checkbox"
            :checked="item.enabled"
            @change="onToggleCommand(item.id, $event)"
          />
          <span>{{ item.enabled ? t("settings.commands.enabled") : t("settings.commands.disabled") }}</span>
        </label>
      </li>
    </ul>

    <div v-else class="settings-command-groups" aria-label="command-management-groups">
      <section
        v-for="group in props.commandGroups"
        :key="group.key"
        class="settings-command-group"
        :aria-label="`command-group-${group.key}`"
      >
        <header class="settings-command-group__header">
          <p class="settings-command-group__title">{{ group.title }}</p>
          <span class="settings-command-group__count">{{ t("settings.commands.groupCount", { count: group.count }) }}</span>
        </header>
        <p v-if="group.sourcePath" class="settings-command-list__path">{{ group.sourcePath }}</p>
        <ul class="settings-command-list">
          <li v-for="item in group.rows" :key="item.id" class="settings-command-list__item">
            <div class="settings-command-list__meta">
              <p class="settings-command-list__title">{{ item.title }}</p>
              <p class="settings-command-list__desc">
                <code>{{ item.id }}</code>
                <span class="settings-command-list__separator">·</span>
                <span>{{ item.category }}</span>
                <span class="settings-command-list__separator">·</span>
                <span>{{ item.source === "user" ? t("settings.commands.sourceUser") : t("settings.commands.sourceBuiltin") }}</span>
                <span v-if="item.overridesBuiltin" class="settings-command-list__badge" :title="overrideBadgeHint">
                  {{ t("settings.commands.badgeOverride") }}
                </span>
                <span
                  v-if="item.hasLoadIssue"
                  class="settings-command-list__badge settings-command-list__badge--warn"
                  :title="issueBadgeHint"
                >
                  {{ t("settings.commands.badgeIssue") }}
                </span>
              </p>
            </div>
            <label class="settings-command-list__toggle">
              <input
                :id="`command-toggle-${item.id}`"
                type="checkbox"
                :checked="item.enabled"
                @change="onToggleCommand(item.id, $event)"
              />
              <span>{{ item.enabled ? t("settings.commands.enabled") : t("settings.commands.disabled") }}</span>
            </label>
          </li>
        </ul>
      </section>
    </div>
  </section>
</template>
