<script setup lang="ts">
import { useI18nText } from "../../../../i18n";
import type { CommandManagementRow } from "../../../../features/settings/types";
import SToggle from "../../ui/SToggle.vue";

defineProps<{
  commandRows: CommandManagementRow[];
  visibleCommandRows: CommandManagementRow[];
}>();

const emit = defineEmits<{
  (e: "toggle-command-enabled", commandId: string, enabled: boolean): void;
}>();

const { t } = useI18nText();
</script>

<template>
  <div class="settings-commands-table min-w-0 grid gap-2.5">
    <div
      class="settings-commands-table__container grid gap-1.5 pt-1"
      role="table"
      :aria-label="t('settings.aria.commandsTable')"
      :data-rendered-rows="visibleCommandRows.length"
      :data-total-rows="commandRows.length"
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
        v-for="row in visibleCommandRows"
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
</template>
