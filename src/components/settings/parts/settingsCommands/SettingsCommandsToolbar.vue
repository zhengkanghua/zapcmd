<script setup lang="ts">
import { nextTick, ref } from "vue";
import { useI18nText } from "../../../../i18n";
import type { CommandManagementViewState } from "../../../../features/settings/types";
import SDropdown from "../../ui/SDropdown.vue";
import SettingsCommandsMoreFiltersDialog from "./SettingsCommandsMoreFiltersDialog.vue";
import SettingsCommandsSummary from "./SettingsCommandsSummary.vue";
import {
  createToolbarFilters,
  type SettingsCommandsToolbarProps
} from "./toolbarFilters";

const props = defineProps<SettingsCommandsToolbarProps>();

const emit = defineEmits<{
  (e: "update-view", patch: Partial<CommandManagementViewState>): void;
  (e: "set-more-filters-open", value: boolean): void;
  (e: "reset-filters"): void;
}>();

const { t } = useI18nText();
const moreFiltersTriggerRef = ref<HTMLButtonElement | null>(null);

function onQueryInput(event: Event): void {
  const target = event.target as HTMLInputElement | null;
  emit("update-view", { query: target?.value ?? "" });
}

const { primaryFilters, secondaryFilters, activeSecondaryFilterCount, hasActiveFilters } =
  createToolbarFilters({
    props,
    t,
    updateView: (patch: Partial<CommandManagementViewState>) => {
      emit("update-view", patch);
    }
  });

function closeMoreFilters(): void {
  emit("set-more-filters-open", false);
  void nextTick(() => {
    moreFiltersTriggerRef.value?.focus({ preventScroll: true });
  });
}

function toggleMoreFilters(): void {
  emit("set-more-filters-open", !props.moreFiltersOpen);
}

function onResetFilters(): void {
  emit("reset-filters");
  closeMoreFilters();
}
</script>

<template>
  <div
    class="settings-commands-toolbar settings-commands-toolbar--sticky settings-commands-toolbar--underlap relative grid gap-3 p-3.5 border border-settings-card-border rounded-[18px] bg-settings-toolbar-sticky bg-gradient-to-b from-ui-text/[0.03] to-ui-text/0 shadow-settings-toolbar shadow-ui-black/18 overflow-visible sticky top-[-12px] z-settings-toolbar backdrop-blur-ui-70"
    :aria-labelledby="toolbarHeadingId"
  >
    <h3 :id="toolbarHeadingId" class="sr-only">
      {{ t("settings.aria.commandsToolbar") }}
    </h3>
    <div class="settings-commands-toolbar__search-row min-w-0 grid gap-2.5">
      <input
        class="settings-commands-toolbar__search w-full h-[38px] px-3.5 border border-settings-dropdown-border rounded-[11px] bg-ui-text/[0.045] text-ui-text text-[13px] outline-none transition-settings-field duration-120 placeholder:text-ui-text/28 focus-visible:border-ui-brand/22 focus-visible:shadow-settings-focus focus-visible:bg-ui-text/[0.055]"
        type="search"
        :value="commandView.query"
        :aria-label="t('settings.commands.queryLabel')"
        :placeholder="t('settings.commands.queryPlaceholder')"
        @input="onQueryInput"
      />
    </div>

    <SettingsCommandsSummary
      :command-filtered-count="commandFilteredCount"
      :command-summary="commandSummary"
      :toolbar-heading-id="toolbarHeadingId"
    />

    <div class="settings-commands-toolbar__filters-row flex flex-wrap items-center gap-2">
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
          class="settings-commands-toolbar__more-filters min-h-[36px] inline-flex items-center gap-2 px-3 py-1.5 border border-transparent rounded-full bg-settings-badge text-settings-badge-text text-[12px] cursor-pointer transition-settings-interactive duration-150 ease-settings-emphasized hover:border-settings-dropdown-border hover:bg-settings-dropdown-hover hover:text-ui-text focus-visible:outline-none focus-visible:shadow-settings-focus"
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

        <SettingsCommandsMoreFiltersDialog
          v-if="moreFiltersOpen"
          :filters="secondaryFilters"
          :has-active-filters="hasActiveFilters"
          :trigger-element="moreFiltersTriggerRef"
          @close="closeMoreFilters"
          @reset-filters="onResetFilters"
        />
      </div>
    </div>
  </div>
</template>
