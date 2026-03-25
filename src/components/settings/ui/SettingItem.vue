<script setup lang="ts">
interface SettingItemProps {
  label: string;
  description?: string;
}

const props = defineProps<SettingItemProps>();
</script>

<template>
  <div
    class="setting-item grid grid-cols-[minmax(0,1fr)_auto] items-center gap-[18px] px-[16px] py-[14px] border-b [border-bottom-color:var(--ui-settings-row-border)] transition-[background] duration-[120ms] hover:bg-[var(--ui-settings-row-hover)] last:border-b-0"
  >
    <div class="setting-item__body min-w-0 grid gap-[4px]">
      <p class="setting-item__label m-0 text-[13px] font-medium leading-[1.35] text-[rgba(var(--ui-text-rgb),0.9)]">
        {{ props.label }}
      </p>
      <p
        v-if="props.description"
        class="setting-item__description m-0 text-[12px] leading-[1.5] text-[var(--ui-settings-hint)]"
      >
        {{ props.description }}
      </p>
    </div>
    <div class="setting-item__control min-w-0 flex items-center justify-end">
      <slot />
    </div>
  </div>
</template>
