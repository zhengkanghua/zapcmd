<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { useI18nText } from "../../../i18n";
import { summarizeCommandForFeedback } from "../../../composables/execution/useCommandExecution/helpers";
import type { ElementRefArg, LauncherReviewOverlayProps } from "../types";

const props = defineProps<LauncherReviewOverlayProps>();
const { t } = useI18nText();

const reviewPanelRef = ref<HTMLElement | null>(null);
const reviewListRef = ref<HTMLElement | null>(null);
const closeButtonRef = ref<HTMLButtonElement | null>(null);

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

function setReviewPanelRef(el: ElementRefArg): void {
  props.setStagingPanelRef(el);
  reviewPanelRef.value = el instanceof HTMLElement ? el : null;
}

function setReviewListRef(el: ElementRefArg): void {
  props.setStagingListRef(el);
  reviewListRef.value = el instanceof HTMLElement ? el : null;
}

function focusActiveCardOrFallback(): void {
  const list = reviewListRef.value;
  const activeCard = list?.querySelector<HTMLElement>(
    `[data-staging-index="${props.stagingActiveIndex}"] .staging-card`
  );
  if (activeCard) {
    activeCard.focus();
    return;
  }

  closeButtonRef.value?.focus();
}

watch(
  () => props.stagingExpanded,
  async (expanded) => {
    if (!expanded) {
      return;
    }
    await nextTick();
    focusActiveCardOrFallback();
  },
  { immediate: true }
);

function onReviewPanelKeydown(event: KeyboardEvent): void {
  if (event.key !== "Tab") {
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  const root = reviewPanelRef.value;
  if (!root) {
    return;
  }

  const focusable = Array.from(
    root.querySelectorAll<HTMLElement>(
      [
        "a[href]",
        "button:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        "[tabindex]:not([tabindex='-1'])"
      ].join(",")
    )
  );

  if (focusable.length === 0) {
    return;
  }

  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const currentIndex = active ? focusable.indexOf(active) : -1;
  const delta = event.shiftKey ? -1 : 1;
  const nextIndexRaw = currentIndex === -1 ? 0 : currentIndex + delta;
  const nextIndex =
    nextIndexRaw < 0 ? focusable.length - 1 : nextIndexRaw % focusable.length;

  event.preventDefault();
  event.stopPropagation();
  focusable[nextIndex]?.focus();
}

function onScrimWheel(event: WheelEvent): void {
  const list = reviewListRef.value;
  if (!list) {
    return;
  }

  const deltaY = event.deltaY;
  if (!Number.isFinite(deltaY) || deltaY === 0) {
    return;
  }

  const atTop = list.scrollTop <= 0;
  const atBottom = Math.ceil(list.scrollTop + list.clientHeight) >= list.scrollHeight;
  if ((deltaY < 0 && atTop) || (deltaY > 0 && atBottom)) {
    return;
  }

  event.preventDefault();
  list.scrollTop += deltaY;
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
      @wheel="onScrimWheel"
    ></button>
    <section
      :ref="setReviewPanelRef"
      class="review-panel"
      data-hit-zone="overlay"
      role="dialog"
      aria-modal="true"
      :aria-label="t('launcher.queueTitle', { count: props.stagedCommands.length })"
      @keydown="onReviewPanelKeydown"
    >
      <header class="review-panel__header">
        <div class="review-panel__heading">
          <h2>{{ t("launcher.queueTitle", { count: props.stagedCommands.length }) }}</h2>
          <span class="review-panel__hint">{{ props.stagingHintText }}</span>
        </div>
        <button ref="closeButtonRef" type="button" class="btn-muted btn-small" @click="closeReview">
          {{ t("common.close") }}
        </button>
      </header>

      <p v-if="props.stagedCommands.length === 0" class="review-panel__empty">{{ t("launcher.queueEmpty") }}</p>
      <ul
        v-else
        :ref="setReviewListRef"
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
            :tabindex="index === props.stagingActiveIndex ? 0 : -1"
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
