<script setup lang="ts">
import { useI18nText } from "../../../../i18n";

const { t } = useI18nText();
</script>

<template>
  <div
    class="flow-panel__empty m-0 p-[16px_14px] flex items-center justify-between gap-[12px] border border-dashed border-ui-text/16 rounded-[8px] text-ui-subtle text-[12px]"
  >
    <div class="flow-panel__empty-copy flex items-center gap-[8px]">
      <span class="flow-panel__empty-title text-[13px] font-semibold text-ui-text">
        {{ t("launcher.queueEmpty") }}
      </span>
      <span class="flow-panel__empty-hint text-[12px] text-ui-subtle">
        {{ t("launcher.queueEmptyHint") }}
      </span>
    </div>
    <span
      class="keyboard-hint flow-panel__empty-shortcut m-0 min-h-0 flex flex-wrap items-center gap-[6px] p-0 text-[10px] font-medium tracking-[0.03em] text-ui-subtle"
    >
      <span class="keyboard-hint__item inline-flex items-center gap-[4px]">
        <span class="keyboard-hint__keys inline-flex items-center gap-[2px]">
          <kbd class="ui-keycap">Esc</kbd>
        </span>
        <span class="keyboard-hint__action text-ui-dim">{{ t("common.cancel") }}</span>
      </span>
    </span>
  </div>
</template>
