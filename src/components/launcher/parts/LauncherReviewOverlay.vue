<script setup lang="ts">
import { useI18nText } from "../../../i18n";
import type { LauncherReviewOverlayProps } from "../types";

const props = defineProps<LauncherReviewOverlayProps>();
const { t } = useI18nText();

const emit = defineEmits<{
  (e: "toggle-staging"): void;
}>();

function closeReview(): void {
  emit("toggle-staging");
}
</script>

<template>
  <aside class="review-overlay" data-hit-zone="overlay" :class="`review-overlay--${props.stagingDrawerState}`">
    <button
      type="button"
      class="review-overlay__scrim"
      data-hit-zone="overlay"
      :aria-label="t('common.close')"
      @click="closeReview"
    ></button>
    <section
      :ref="props.setStagingPanelRef"
      class="review-panel"
      data-hit-zone="overlay"
      role="dialog"
      aria-modal="true"
      :aria-label="t('launcher.queueTitle', { count: props.stagedCommands.length })"
    >
      <header class="review-panel__header">
        <h2>{{ t("launcher.queueTitle", { count: props.stagedCommands.length }) }}</h2>
        <button type="button" class="btn-muted btn-small" @click="closeReview">
          {{ t("common.close") }}
        </button>
      </header>

      <p class="review-panel__empty">{{ t("launcher.queueEmpty") }}</p>
    </section>
  </aside>
</template>

