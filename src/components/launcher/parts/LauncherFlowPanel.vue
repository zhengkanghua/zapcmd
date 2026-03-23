<script setup lang="ts">
import { ref } from "vue";
import { useI18nText } from "../../../i18n";
import UiIconButton from "../../shared/ui/UiIconButton.vue";
import type { ElementRefArg, LauncherFlowPanelProps } from "../types";
import { useFlowPanelGripReorder } from "./flowPanel/useFlowPanelGripReorder";
import { useFlowPanelHeightObservation } from "./flowPanel/useFlowPanelHeightObservation";
import { useFlowPanelInlineArgs } from "./flowPanel/useFlowPanelInlineArgs";
import LauncherIcon from "./LauncherIcon.vue";

const props = defineProps<LauncherFlowPanelProps>();
const { t } = useI18nText();

const emit = defineEmits<{
  (e: "toggle-staging"): void;
  (e: "staging-drag-start", index: number, event: DragEvent): void;
  (e: "staging-drag-over", index: number, event: DragEvent): void;
  (e: "staging-drag-end"): void;
  (e: "grip-reorder-active-change", value: boolean): void;
  (e: "focus-staging-index", index: number): void;
  (e: "remove-staged-command", id: string): void;
  (e: "update-staged-arg", id: string, key: string, value: string): void;
  (e: "clear-staging"): void;
  (e: "execute-staged"): void;
  (e: "execution-feedback", tone: "neutral" | "success" | "error", message: string): void;
  (e: "flow-panel-height-change"): void;
  (e: "flow-panel-settled"): void;
}>();

const reviewPanelRef = ref<HTMLElement | null>(null);
const reviewBodyRef = ref<HTMLElement | null>(null);
const reviewListRef = ref<HTMLElement | null>(null);
// close 按钮使用 `UiIconButton` 暴露的 focus()（保证键盘可达性与视觉一致性）。
const closeButtonRef = ref<{ focus: (options?: { preventScroll?: boolean }) => void } | null>(null);

function closeReview(): void {
  emit("toggle-staging");
}

function setReviewPanelRef(el: ElementRefArg): void {
  props.setStagingPanelRef(el);
  reviewPanelRef.value = el instanceof HTMLElement ? el : null;
}

function normalizeToHTMLElement(el: ElementRefArg): HTMLElement | null {
  if (el instanceof HTMLElement) {
    return el;
  }
  if (el && typeof el === "object" && "$el" in el) {
    const maybeElement = (el as { $el?: unknown }).$el;
    return maybeElement instanceof HTMLElement ? maybeElement : null;
  }
  return null;
}

function setReviewListRef(el: ElementRefArg): void {
  const element = normalizeToHTMLElement(el);
  props.setStagingListRef(element);
  reviewListRef.value = element;
}

function focusActiveCardOrFallback(): void {
  const list = reviewListRef.value;
  const activeCard = list?.querySelector<HTMLElement>(
    `[data-staging-index="${props.stagingActiveIndex}"] .staging-card`
  );
  if (activeCard) {
    activeCard.focus({ preventScroll: true });
    return;
  }

  closeButtonRef.value?.focus({ preventScroll: true });
}

function resolveReviewScrollContainer(): HTMLElement | null {
  if (props.stagedCommands.length > 0) {
    return reviewListRef.value;
  }
  return reviewBodyRef.value;
}

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
  focusable[nextIndex]?.focus({ preventScroll: true });
}

function onScrimWheel(event: WheelEvent): void {
  const scrollContainer = resolveReviewScrollContainer();
  if (!scrollContainer) {
    return;
  }

  const deltaY = event.deltaY;
  if (!Number.isFinite(deltaY) || deltaY === 0) {
    return;
  }

  const atTop = scrollContainer.scrollTop <= 0;
  const atBottom =
    Math.ceil(scrollContainer.scrollTop + scrollContainer.clientHeight) >=
    scrollContainer.scrollHeight;
  if ((deltaY < 0 && atTop) || (deltaY > 0 && atBottom)) {
    return;
  }

  event.preventDefault();
  scrollContainer.scrollTop += deltaY;
}

const {
  editingParam,
  paramEditInputRef,
  startParamEdit,
  onParamEditInput,
  commitParamEdit,
  cancelParamEdit,
  onExecuteStagedClick,
  copyCommand
} = useFlowPanelInlineArgs({
  props,
  t,
  emitUpdateStagedArg: (id, key, value) => emit("update-staged-arg", id, key, value),
  emitExecuteStaged: () => emit("execute-staged"),
  emitExecutionFeedback: (tone, message) => emit("execution-feedback", tone, message)
});

const {
  gripReorderActive,
  draggingCommandId,
  dragOverCommandId,
  startGripReorder,
  onDragStartWithEditGuard,
  onStagingDragOver,
  onDragEnd
} = useFlowPanelGripReorder({
  props,
  reviewListRef,
  cancelInlineEdit: cancelParamEdit,
  emitGripReorderActiveChange: (value) => emit("grip-reorder-active-change", value),
  emitStagingDragStart: (index, event) => emit("staging-drag-start", index, event),
  emitStagingDragOver: (index, event) => emit("staging-drag-over", index, event),
  emitStagingDragEnd: () => emit("staging-drag-end")
});

useFlowPanelHeightObservation({
  props,
  reviewPanelRef,
  focusActiveCardOrFallback,
  emitFlowPanelHeightChange: () => emit("flow-panel-height-change"),
  emitFlowPanelSettled: () => emit("flow-panel-settled")
});
</script>

<template>
  <aside class="flow-panel-overlay" data-hit-zone="overlay" :class="`state-${props.stagingDrawerState}`">
    <button
      type="button"
      class="flow-panel-overlay__scrim drawer-scrim"
      data-hit-zone="overlay"
      :aria-label="t('common.close')"
      @click="closeReview"
      @wheel="onScrimWheel"
    ></button>
    <section
      :ref="setReviewPanelRef"
      class="flow-panel"
      :class="{ 'flow-panel--has-list': props.stagedCommands.length > 0 }"
      data-hit-zone="overlay"
      role="dialog"
      aria-modal="true"
      :aria-label="t('launcher.queueTitle', { count: props.stagedCommands.length })"
      @keydown="onReviewPanelKeydown"
    >
      <header class="flow-panel__header" data-tauri-drag-region>
        <div class="flow-panel__title-group" data-tauri-drag-region>
          <h2 class="flow-panel__heading" data-tauri-drag-region>
            {{ t('launcher.queueTitle', { count: props.stagedCommands.length }) }}
          </h2>
        </div>
        <div class="flow-panel__header-actions">
          <UiIconButton
            variant="danger"
            :ariaLabel="t('common.clear')"
            :disabled="props.stagedCommands.length === 0"
            @click="emit('clear-staging')"
          >
            <LauncherIcon name="trash" />
          </UiIconButton>
          <UiIconButton
            ref="closeButtonRef"
            class="flow-panel__close"
            :ariaLabel="t('common.close')"
            variant="muted"
            @click="closeReview"
          >
            <LauncherIcon name="x" />
          </UiIconButton>
        </div>
      </header>

      <section ref="reviewBodyRef" class="flow-panel__body">
        <p
          v-if="props.executionFeedbackMessage"
          class="execution-feedback execution-toast"
          :class="`execution-feedback--${props.executionFeedbackTone}`"
        >
          {{ props.executionFeedbackMessage }}
        </p>

        <div v-if="props.stagedCommands.length === 0" class="flow-panel__empty">
          <div class="flow-panel__empty-copy">
            <span class="flow-panel__empty-title">{{ t("launcher.queueEmpty") }}</span>
            <span class="flow-panel__empty-hint">{{ t("launcher.queueEmptyHint") }}</span>
          </div>
          <span class="keyboard-hint flow-panel__empty-shortcut">
            <span class="keyboard-hint__item">
              <span class="keyboard-hint__keys"><kbd>Esc</kbd></span>
              <span class="keyboard-hint__action">{{ t("common.cancel") }}</span>
            </span>
          </span>
        </div>
        <TransitionGroup
          v-else
          :ref="setReviewListRef"
          tag="ul"
          name="flow-panel-list"
          class="staging-list flow-panel__list"
          :class="{ 'flow-panel__list--grip-reordering': gripReorderActive }"
        >
          <li
            v-for="(cmd, index) in props.stagedCommands"
            :key="cmd.id"
            :data-staging-index="index"
            class="flow-panel__list-item"
            draggable="true"
            @dragstart="onDragStartWithEditGuard($event, index)"
            @dragover="onStagingDragOver(index, $event)"
            @dragend="onDragEnd"
            @click="emit('focus-staging-index', index)"
          >
            <article
              class="staging-card flow-panel__card"
              :class="{
                'staging-card--active': props.focusZone === 'staging' && index === props.stagingActiveIndex,
                'staging-card--dragging': draggingCommandId === cmd.id,
                'staging-card--drag-over': dragOverCommandId === cmd.id && draggingCommandId !== cmd.id
              }"
              :tabindex="index === props.stagingActiveIndex ? 0 : -1"
            >
              <div
                class="flow-card__grip"
                aria-hidden="true"
                @mousedown="startGripReorder(index, $event)"
                @click.stop.prevent
              >
                <LauncherIcon name="grip" :size="12" />
              </div>
              <div class="flow-card__body">
                <header class="staging-card__head">
                  <h3>{{ cmd.title }}</h3>
                  <div class="flow-panel__card-actions">
                    <UiIconButton
                      :ariaLabel="t('common.copy')"
                      variant="muted"
                      size="small"
                      :disabled="props.executing"
                      :title="t('common.copy')"
                      @click.stop="copyCommand(cmd.renderedCommand)"
                    >
                      <LauncherIcon name="copy" />
                    </UiIconButton>
                    <UiIconButton
                      :ariaLabel="t('common.remove')"
                      variant="danger"
                      size="small"
                      :disabled="props.executing"
                      :title="t('common.remove')"
                      @click.stop="emit('remove-staged-command', cmd.id)"
                    >
                      <LauncherIcon name="x" />
                    </UiIconButton>
                  </div>
                </header>
                <div v-if="cmd.args.length > 0" class="flow-card__params">
                  <div
                    v-for="arg in cmd.args"
                    :key="arg.key"
                    class="flow-card__param"
                  >
                    <span class="flow-card__param-key">{{ arg.label }}:</span>
                    <span
                      v-if="editingParam?.cmdId !== cmd.id || editingParam?.argKey !== arg.key"
                      class="flow-card__param-value"
                      @click.stop="startParamEdit(cmd.id, arg.key, cmd.argValues[arg.key] || arg.defaultValue || '')"
                    >
                      {{ cmd.argValues[arg.key] || arg.defaultValue || '...' }}
                    </span>
                    <input
                      v-else
                      class="flow-card__param-input"
                      :value="editingParam.currentValue"
                      @input="onParamEditInput(cmd.id, arg.key, ($event.target as HTMLInputElement).value)"
                      @keydown.enter.stop="commitParamEdit(cmd.id, arg.key)"
                      @keydown.escape.stop="cancelParamEdit()"
                      @blur="commitParamEdit(cmd.id, arg.key)"
                      ref="paramEditInputRef"
                    />
                  </div>
                </div>
                <code class="flow-card__command">
                  &gt; {{ cmd.renderedCommand }}
                </code>
              </div>
            </article>
          </li>
        </TransitionGroup>
      </section>

      <footer class="flow-panel__footer">
        <button
          type="button"
          class="flow-panel__execute-btn"
          :disabled="props.stagedCommands.length === 0 || props.executing"
          :aria-disabled="props.flowOpen ? 'true' : undefined"
          @click="onExecuteStagedClick"
        >
          {{ props.executing ? t('launcher.executing') : t('launcher.executeAll') }}
        </button>
      </footer>
    </section>
  </aside>
</template>
