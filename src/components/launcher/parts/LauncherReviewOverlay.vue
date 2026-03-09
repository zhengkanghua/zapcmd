<script setup lang="ts">
import { useI18nText } from "../../../i18n";
import { summarizeCommandForFeedback } from "../../../composables/execution/useCommandExecution/helpers";
import type { LauncherReviewOverlayProps } from "../types";

const props = defineProps<LauncherReviewOverlayProps>();
const { t } = useI18nText();

const emit = defineEmits<{
  (e: "toggle-staging"): void;
  (e: "staging-drag-start", index: number, event: DragEvent): void;
  (e: "staging-drag-over", index: number, event: DragEvent): void;
  (e: "staging-drag-end"): void;
  (e: "focus-staging-index", index: number): void;
  (e: "remove-staged-command", id: string): void;
  (e: "update-staged-arg", id: string, key: string, value: string): void;
  (e: "clear-staging"): void;
  (e: "execute-staged"): void;
}>();

function closeReview(): void {
  emit("toggle-staging");
}

function onStagingDragStart(index: number, event: DragEvent): void {
  emit("staging-drag-start", index, event);
}

function onStagingDragOver(index: number, event: DragEvent): void {
  emit("staging-drag-over", index, event);
}

function onStagingArgInput(id: string, key: string, event: Event): void {
  emit("update-staged-arg", id, key, (event.target as HTMLInputElement).value);
}

async function copyCommand(command: string): Promise<void> {
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error("clipboard API unavailable");
    }
    await navigator.clipboard.writeText(command);
  } catch (error) {
    console.error("copy command failed:", error);
  }
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
        <div class="review-panel__heading">
          <h2>{{ t("launcher.queueTitle", { count: props.stagedCommands.length }) }}</h2>
          <span class="review-panel__hint">{{ props.stagingHintText }}</span>
        </div>
        <button type="button" class="btn-muted btn-small" @click="closeReview">
          {{ t("common.close") }}
        </button>
      </header>

      <p v-if="props.stagedCommands.length === 0" class="review-panel__empty">{{ t("launcher.queueEmpty") }}</p>
      <ul
        v-else
        :ref="props.setStagingListRef"
        class="staging-list review-list"
        :class="{ 'staging-list--scrollable': props.stagingListShouldScroll }"
        :style="{
          maxHeight: props.stagingListMaxHeight,
          minHeight: props.drawerFloorViewportHeight > 0 ? `${props.drawerFloorViewportHeight}px` : undefined
        }"
      >
        <li
          v-for="(cmd, index) in props.stagedCommands"
          :key="cmd.id"
          :data-staging-index="index"
          class="review-list__item"
          draggable="true"
          @dragstart="onStagingDragStart(index, $event)"
          @dragover="onStagingDragOver(index, $event)"
          @dragend="emit('staging-drag-end')"
          @click="emit('focus-staging-index', index)"
        >
          <article
            class="staging-card review-card"
            :class="{ 'staging-card--active': props.focusZone === 'staging' && index === props.stagingActiveIndex }"
          >
            <header class="staging-card__head">
              <h3>{{ cmd.title }}</h3>
              <div class="review-card__actions">
                <button
                  type="button"
                  class="btn-muted btn-small"
                  :disabled="props.executing"
                  @click.stop="copyCommand(cmd.renderedCommand)"
                >
                  {{ t("common.copy") }}
                </button>
                <button
                  type="button"
                  class="btn-danger btn-small"
                  :disabled="props.executing"
                  @click.stop="emit('remove-staged-command', cmd.id)"
                >
                  {{ t("common.remove") }}
                </button>
              </div>
            </header>
            <div v-if="cmd.args.length > 0" class="staging-card__args">
              <div v-for="arg in cmd.args" :key="`${cmd.id}-${arg.key}`" class="staging-card__arg">
                <label>{{ arg.label }}</label>
                <input
                  type="text"
                  :value="cmd.argValues[arg.key] ?? ''"
                  :placeholder="arg.placeholder"
                  autocomplete="off"
                  @input="onStagingArgInput(cmd.id, arg.key, $event)"
                />
              </div>
            </div>
            <code class="review-card__command" :title="cmd.renderedCommand">
              {{ summarizeCommandForFeedback(cmd.renderedCommand) }}
            </code>
          </article>
        </li>
      </ul>

      <footer class="review-panel__footer">
        <button type="button" class="btn-muted" :disabled="props.executing" @click="emit('clear-staging')">
          {{ t("common.clear") }}
        </button>
        <button
          type="button"
          class="btn-primary"
          :disabled="props.executing || props.stagedCommands.length === 0"
          @click="emit('execute-staged')"
        >
          {{ props.executing ? t("launcher.executing") : t("launcher.executeAll") }}
        </button>
      </footer>
    </section>
  </aside>
</template>
