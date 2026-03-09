<script setup lang="ts">
import { useI18nText } from "../../../i18n";

const props = defineProps<{
  count: number;
}>();

const emit = defineEmits<{
  (e: "toggle-staging"): void;
}>();

const { t } = useI18nText();
</script>

<template>
  <button
    type="button"
    class="queue-summary-pill"
    :aria-label="t('launcher.queueToggleAria', { count: props.count })"
    @click="emit('toggle-staging')"
  >
    {{ t("launcher.queueTitle", { count: props.count }) }}
  </button>
</template>

