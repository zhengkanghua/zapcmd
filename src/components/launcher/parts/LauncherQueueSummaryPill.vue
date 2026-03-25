<script setup lang="ts">
import { useI18nText } from "../../../i18n";
import LauncherIcon from "./LauncherIcon.vue";

const props = defineProps<{
  count: number;
}>();

const emit = defineEmits<{
  (e: "toggle-staging"): void;
}>();

const { t } = useI18nText();

function formatCount(count: number): string {
  if (!Number.isFinite(count) || count <= 0) {
    return "0";
  }
  return count > 99 ? "99+" : String(count);
}
</script>

<template>
  <button
    type="button"
    class="queue-summary-pill relative inline-flex items-center justify-center w-[34px] h-[34px] p-0 border border-[rgba(var(--ui-brand-rgb),0.34)] rounded-[10px] bg-[rgba(var(--ui-brand-rgb),0.12)] text-[var(--ui-text)] leading-none cursor-pointer transition-[background-color,border-color] duration-150 hover:border-[rgba(var(--ui-brand-rgb),0.44)] hover:bg-[var(--ui-brand-soft)] focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_1px_rgba(var(--ui-brand-rgb),0.24)]"
    :aria-label="t('launcher.queueToggleAria', { count: props.count })"
    :title="t('launcher.queueTitle', { count: props.count })"
    @click="emit('toggle-staging')"
  >
    <LauncherIcon name="queue" />
    <span
      v-if="props.count > 0"
      class="queue-summary-pill__badge absolute top-[-6px] right-[-6px] min-w-[18px] h-[18px] px-[5px] inline-flex items-center justify-center rounded-full border border-[rgba(var(--ui-black-rgb),0.8)] bg-[rgba(var(--ui-brand-rgb),0.95)] text-[var(--ui-accent-text)] text-[10px] font-extrabold"
      aria-hidden="true"
    >
      {{ formatCount(props.count) }}
    </span>
  </button>
</template>
