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
  (e: "toggle-queue"): void;
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
  (e: "flow-panel-prepared"): void;
  (e: "flow-panel-height-change"): void;
  (e: "flow-panel-settled"): void;
}>();

const reviewPanelRef = ref<HTMLElement | null>(null);
const reviewBodyRef = ref<HTMLElement | null>(null);
const reviewListRef = ref<HTMLElement | null>(null);
// close 按钮使用 `UiIconButton` 暴露的 focus()（保证键盘可达性与视觉一致性）。
const closeButtonRef = ref<{ focus: (options?: { preventScroll?: boolean }) => void } | null>(null);

function closeReview(): void {
  emit("toggle-queue");
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
  emitFlowPanelPrepared: () => emit("flow-panel-prepared"),
  emitFlowPanelHeightChange: () => emit("flow-panel-height-change"),
  emitFlowPanelSettled: () => emit("flow-panel-settled")
});
</script>

<template>
  <aside
    class="flow-panel-overlay absolute inset-0 flex items-stretch w-full min-w-0 min-h-0 z-[20]"
    data-hit-zone="overlay"
    :class="[
      `state-${props.stagingDrawerState}`,
      props.stagingDrawerState === 'closing' ||
      props.stagingDrawerState === 'closed' ||
      props.stagingDrawerState === 'preparing' ||
      props.stagingDrawerState === 'resizing'
        ? 'pointer-events-none'
        : '',
      props.stagingDrawerState === 'open' || props.stagingDrawerState === 'opening'
        ? 'pointer-events-auto'
        : ''
    ]"
  >
    <button
      type="button"
      class="flow-panel-overlay__scrim drawer-scrim absolute inset-0 border-0 p-0 rounded-b-ui bg-ui-black/20 backdrop-blur-launcher-scrim cursor-pointer opacity-100 [will-change:opacity]"
      data-hit-zone="overlay"
      :aria-label="t('common.close')"
      :class="[
        props.stagingDrawerState === 'preparing' || props.stagingDrawerState === 'resizing'
          ? 'invisible opacity-0'
          : '',
        props.stagingDrawerState === 'opening'
          ? 'animate-launcher-review-overlay-scrim-in motion-reduce:animate-none'
          : '',
        props.stagingDrawerState === 'closing'
          ? 'pointer-events-none animate-launcher-review-overlay-scrim-out motion-reduce:animate-none'
          : ''
      ]"
      @click="closeReview"
      @wheel="onScrimWheel"
    ></button>
    <section
      :ref="setReviewPanelRef"
      class="flow-panel relative z-[1] ml-auto mr-0 w-[min(var(--flow-panel-width,67%),100%)] min-w-[min(420px,100%)] max-w-full h-full min-h-0 overflow-hidden grid grid-rows-launcher-panel border border-ui-text/14 rounded-l-ui rounded-r-none bg-ui-bg from-ui-text/6 via-ui-text/2 bg-launcher-flow-panel-highlight shadow-launcher-side-panel shadow-ui-black/35"
      :class="[
        { 'flow-panel--has-list': props.stagedCommands.length > 0 },
        props.stagingDrawerState === 'preparing' || props.stagingDrawerState === 'resizing'
          ? 'invisible opacity-0 pointer-events-none'
          : '',
        props.stagingDrawerState === 'opening'
          ? 'animate-launcher-review-overlay-panel-in motion-reduce:animate-none'
          : '',
        props.stagingDrawerState === 'closing'
          ? 'pointer-events-none animate-launcher-review-overlay-panel-out motion-reduce:animate-none'
          : ''
      ]"
      data-hit-zone="overlay"
      role="dialog"
      aria-modal="true"
      :aria-label="t('launcher.queueTitle', { count: props.stagedCommands.length })"
      @keydown="onReviewPanelKeydown"
    >
      <header class="flow-panel__header flex items-center justify-between gap-[8px] p-[12px_16px] border-b border-b-ui-border" data-tauri-drag-region>
        <div class="flow-panel__title-group flex items-center gap-[8px] min-w-0" data-tauri-drag-region>
          <h2 class="flow-panel__heading text-[14px] font-semibold text-ui-text" data-tauri-drag-region>
            {{ t('launcher.queueTitle', { count: props.stagedCommands.length }) }}
          </h2>
        </div>
        <div class="flow-panel__header-actions flex items-center gap-[4px]">
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
            class="flow-panel__close min-w-[44px] min-h-[44px]"
            :ariaLabel="t('common.close')"
            variant="muted"
            @click="closeReview"
          >
            <LauncherIcon name="x" />
          </UiIconButton>
        </div>
      </header>

      <section
        ref="reviewBodyRef"
        class="flow-panel__body min-h-0 flex flex-col gap-[12px] p-[12px_16px]"
        :class="{
          'overflow-hidden': props.stagedCommands.length > 0,
          'overflow-y-auto': props.stagedCommands.length === 0,
          'scrollbar-subtle': props.stagedCommands.length === 0
        }"
      >
        <p
          v-if="props.executionFeedbackMessage"
          class="execution-feedback execution-toast ui-glass-toast animate-launcher-toast-slide-down motion-reduce:animate-none"
          role="status"
          aria-live="polite"
          :class="{
            'execution-feedback--neutral text-ui-brand': props.executionFeedbackTone === 'neutral',
            'execution-feedback--success text-ui-success': props.executionFeedbackTone === 'success',
            'execution-feedback--error text-ui-danger': props.executionFeedbackTone === 'error'
          }"
        >
          {{ props.executionFeedbackMessage }}
        </p>

        <div
          v-if="props.stagedCommands.length === 0"
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
              <span class="keyboard-hint__keys inline-flex items-center gap-[2px]"
                ><kbd
                  class="ui-keycap"
                  >Esc</kbd
                ></span
              >
              <span class="keyboard-hint__action text-ui-dim">{{ t("common.cancel") }}</span>
            </span>
          </span>
        </div>
        <TransitionGroup
          v-else
          :ref="setReviewListRef"
          tag="ul"
          name="flow-panel-list"
          class="staging-list flow-panel__list flex-1 min-h-0 overflow-y-auto scrollbar-subtle pr-[2px]"
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
              class="staging-card flow-panel__card group border border-ui-text/8 rounded-surface bg-ui-black/17 p-[12px_14px] flex items-stretch gap-[10px] min-h-[56px] cursor-default transition-launcher-card duration-motion-press ease-motion-emphasized active:scale-motion-press-active active:cursor-grabbing"
              :class="{
                'staging-card--active border-ui-brand/52 ring-1 ring-inset ring-ui-brand/20':
                  props.focusZone === 'staging' && index === props.stagingActiveIndex,
                'staging-card--dragging opacity-[0.62] scale-[1.02] border-ui-brand/45 shadow-launcher-drag-card shadow-ui-black/28 cursor-grabbing':
                  draggingCommandId === cmd.id,
                'staging-card--drag-over border-ui-brand/65 ring-1 ring-inset ring-ui-brand/18':
                  dragOverCommandId === cmd.id && draggingCommandId !== cmd.id
              }"
              :tabindex="index === props.stagingActiveIndex ? 0 : -1"
            >
              <div
                class="flow-card__grip flex items-center shrink-0 text-ui-dim cursor-grab opacity-50 transition-opacity duration-150 group-hover:opacity-100 active:cursor-grabbing"
                :class="{ 'cursor-grabbing': gripReorderActive }"
                aria-hidden="true"
                @mousedown="startGripReorder(index, $event)"
                @click.stop.prevent
              >
                <LauncherIcon name="grip" :size="12" />
              </div>
              <div class="flow-card__body flex-1 min-w-0 flex flex-col gap-[6px]">
                <header class="staging-card__head flex items-center justify-between gap-[8px]">
                  <h3 class="text-[12px] overflow-hidden text-ellipsis whitespace-nowrap">
                    {{ cmd.title }}
                  </h3>
                  <div class="flow-panel__card-actions flex items-center gap-[8px]">
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
                <div
                  v-if="cmd.args.length > 0"
                  class="flow-card__params flex flex-col gap-[6px] p-[8px_10px] bg-ui-text/4 border border-ui-text/6 rounded-[6px]"
                >
                  <div
                    v-for="arg in cmd.args"
                    :key="arg.key"
                    class="flow-card__param flex items-center gap-[8px] text-[12px]"
                  >
                    <span class="flow-card__param-key text-ui-subtle shrink-0">
                      {{ arg.label }}:
                    </span>
                    <button
                      v-if="editingParam?.cmdId !== cmd.id || editingParam?.argKey !== arg.key"
                      type="button"
                      class="flow-card__param-value inline-flex min-w-0 items-center text-left text-ui-accent cursor-pointer p-[2px_8px] bg-ui-brand/12 border border-ui-brand/20 rounded-[4px] transition-launcher-surface duration-120 hover:bg-ui-brand/20 hover:border-ui-brand/35 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ui-brand/24 font-mono"
                      :aria-label="`${arg.label}: ${cmd.argValues[arg.key] || arg.defaultValue || '...'}`"
                      @click.stop="startParamEdit(cmd.id, arg.key, cmd.argValues[arg.key] || arg.defaultValue || '')"
                      @keydown.enter.stop.prevent="startParamEdit(cmd.id, arg.key, cmd.argValues[arg.key] || arg.defaultValue || '')"
                      @keydown.space.stop.prevent="startParamEdit(cmd.id, arg.key, cmd.argValues[arg.key] || arg.defaultValue || '')"
                    >
                      {{ cmd.argValues[arg.key] || arg.defaultValue || '...' }}
                    </button>
                    <input
                      v-else
                      class="flow-card__param-input bg-ui-text/8 border border-ui-accent rounded-[4px] text-ui-accent text-[12px] font-mono p-[2px_8px] outline-none w-auto min-w-[60px]"
                      :value="editingParam.currentValue"
                      @input="onParamEditInput(cmd.id, arg.key, ($event.target as HTMLInputElement).value)"
                      @keydown.enter.stop="commitParamEdit(cmd.id, arg.key)"
                      @keydown.escape.stop="cancelParamEdit()"
                      @blur="commitParamEdit(cmd.id, arg.key)"
                      ref="paramEditInputRef"
                    />
                  </div>
                </div>
                <code class="flow-card__command block p-[4px_0] font-mono text-[11px] text-ui-subtle whitespace-nowrap overflow-hidden text-ellipsis">
                  &gt; {{ cmd.renderedCommand }}
                </code>
              </div>
            </article>
          </li>
        </TransitionGroup>
      </section>

      <footer class="flow-panel__footer p-[12px_16px] border-t border-t-ui-border">
        <button
          type="button"
          class="flow-panel__execute-btn w-full p-[10px_0] border-0 rounded-control bg-ui-accent text-ui-accent-text text-[14px] font-semibold cursor-pointer transition-opacity duration-150 hover:opacity-92 disabled:bg-ui-hover disabled:text-ui-dim disabled:cursor-not-allowed"
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
