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
    class="queue-summary-pill"
    :aria-label="t('launcher.queueToggleAria', { count: props.count })"
    :title="t('launcher.queueTitle', { count: props.count })"
    @click="emit('toggle-staging')"
  >
    <LauncherIcon name="queue" />
    <span v-if="props.count > 0" class="queue-summary-pill__badge" aria-hidden="true">
      {{ formatCount(props.count) }}
    </span>
    <span class="visually-hidden">{{ t("launcher.queueTitle", { count: props.count }) }}</span>
  </button>
</template>
