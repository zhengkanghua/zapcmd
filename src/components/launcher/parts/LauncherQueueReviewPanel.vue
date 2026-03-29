<script setup lang="ts">
import { ref } from "vue";
import { useI18nText } from "../../../i18n";
import type { ElementRefArg, LauncherQueueReviewPanelProps } from "../types";
import QueueReviewEmptyState from "./queueReview/QueueReviewEmptyState.vue";
import QueueReviewHeader from "./queueReview/QueueReviewHeader.vue";
import QueueReviewList from "./queueReview/QueueReviewList.vue";
import { useFlowPanelGripReorder } from "./queueReview/useFlowPanelGripReorder";
import { useFlowPanelHeightObservation } from "./queueReview/useFlowPanelHeightObservation";
import { useFlowPanelInlineArgs } from "./queueReview/useFlowPanelInlineArgs";

type FocusableButton = {
  focus: (options?: { preventScroll?: boolean }) => void;
};

const props = defineProps<LauncherQueueReviewPanelProps>();
const { t } = useI18nText();

const emit = defineEmits<{
  (e: "toggle-queue"): void;
  (e: "queue-drag-start", index: number, event: DragEvent): void;
  (e: "queue-drag-over", index: number, event: DragEvent): void;
  (e: "queue-drag-end"): void;
  (e: "grip-reorder-active-change", value: boolean): void;
  (e: "focus-queue-index", index: number): void;
  (e: "remove-queued-command", id: string): void;
  (e: "update-queued-arg", id: string, key: string, value: string): void;
  (e: "clear-queue"): void;
  (e: "execute-queue"): void;
  (e: "execution-feedback", tone: "neutral" | "success" | "error", message: string): void;
  (e: "flow-panel-prepared"): void;
  (e: "flow-panel-height-change"): void;
  (e: "flow-panel-settled"): void;
}>();

const reviewPanelRef = ref<HTMLElement | null>(null);
const reviewBodyRef = ref<HTMLElement | null>(null);
const reviewListRef = ref<HTMLElement | null>(null);
const closeButtonRef = ref<FocusableButton | null>(null);

function closeReview(): void {
  emit("toggle-queue");
}

function clearQueue(): void {
  emit("clear-queue");
}

function focusQueueIndex(index: number): void {
  emit("focus-queue-index", index);
}

function removeQueuedCommand(id: string): void {
  emit("remove-queued-command", id);
}

function setParamEditInputRef(value: ElementRefArg): void {
  paramEditInputRef.value = value instanceof HTMLInputElement ? value : null;
}

function setCloseButtonRef(value: unknown): void {
  if (value && typeof value === "object" && "focus" in value) {
    const focus = (value as { focus?: unknown }).focus;
    if (typeof focus === "function") {
      closeButtonRef.value = { focus: focus as FocusableButton["focus"] };
      return;
    }
  }
  closeButtonRef.value = null;
}

function setReviewPanelRef(el: ElementRefArg): void {
  props.setQueuePanelRef(el);
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
  props.setQueueListRef(element);
  reviewListRef.value = element;
}

function focusActiveCardOrFallback(): void {
  const list = reviewListRef.value;
  const activeCard = list?.querySelector<HTMLElement>(
    `[data-staging-index="${props.queueActiveIndex}"] .staging-card`
  );
  if (activeCard) {
    activeCard.focus({ preventScroll: true });
    return;
  }

  closeButtonRef.value?.focus({ preventScroll: true });
}

function resolveReviewScrollContainer(): HTMLElement | null {
  if (props.queuedCommands.length > 0) {
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
  emitUpdateStagedArg: (id, key, value) => emit("update-queued-arg", id, key, value),
  emitExecuteStaged: () => emit("execute-queue"),
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
  emitStagingDragStart: (index, event) => emit("queue-drag-start", index, event),
  emitStagingDragOver: (index, event) => emit("queue-drag-over", index, event),
  emitStagingDragEnd: () => emit("queue-drag-end")
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
      `state-${props.queuePanelState}`,
      props.queuePanelState === 'closing' ||
      props.queuePanelState === 'closed' ||
      props.queuePanelState === 'preparing' ||
      props.queuePanelState === 'resizing'
        ? 'pointer-events-none'
        : '',
      props.queuePanelState === 'open' || props.queuePanelState === 'opening'
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
        props.queuePanelState === 'preparing' || props.queuePanelState === 'resizing'
          ? 'invisible opacity-0'
          : '',
        props.queuePanelState === 'opening'
          ? 'animate-launcher-review-overlay-scrim-in motion-reduce:animate-none'
          : '',
        props.queuePanelState === 'closing'
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
        { 'flow-panel--has-list': props.queuedCommands.length > 0 },
        props.queuePanelState === 'preparing' || props.queuePanelState === 'resizing'
          ? 'invisible opacity-0 pointer-events-none'
          : '',
        props.queuePanelState === 'opening'
          ? 'animate-launcher-review-overlay-panel-in motion-reduce:animate-none'
          : '',
        props.queuePanelState === 'closing'
          ? 'pointer-events-none animate-launcher-review-overlay-panel-out motion-reduce:animate-none'
          : ''
      ]"
      data-hit-zone="overlay"
      role="dialog"
      aria-modal="true"
      :aria-label="t('launcher.queueTitle', { count: props.queuedCommands.length })"
      @keydown="onReviewPanelKeydown"
    >
      <QueueReviewHeader
        :queued-command-count="props.queuedCommands.length"
        :set-close-button-ref="setCloseButtonRef"
        :on-clear-queue="clearQueue"
        :on-close="closeReview"
      />

      <section
        ref="reviewBodyRef"
        class="flow-panel__body min-h-0 flex flex-col gap-[12px] p-[12px_16px]"
        :class="{
          'overflow-hidden': props.queuedCommands.length > 0,
          'overflow-y-auto': props.queuedCommands.length === 0,
          'scrollbar-subtle': props.queuedCommands.length === 0
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

        <QueueReviewEmptyState v-if="props.queuedCommands.length === 0" />
        <QueueReviewList
          v-else
          :queued-commands="props.queuedCommands"
          :focus-zone="props.focusZone"
          :queue-active-index="props.queueActiveIndex"
          :executing="props.executing"
          :grip-reorder-active="gripReorderActive"
          :dragging-command-id="draggingCommandId"
          :drag-over-command-id="dragOverCommandId"
          :editing-param="editingParam"
          :set-param-edit-input-ref="setParamEditInputRef"
          :set-review-list-ref="setReviewListRef"
          :start-grip-reorder="startGripReorder"
          :on-drag-start-with-edit-guard="onDragStartWithEditGuard"
          :on-staging-drag-over="onStagingDragOver"
          :on-drag-end="onDragEnd"
          :focus-queue-index="focusQueueIndex"
          :copy-command="copyCommand"
          :remove-queued-command="removeQueuedCommand"
          :start-param-edit="startParamEdit"
          :on-param-edit-input="onParamEditInput"
          :commit-param-edit="commitParamEdit"
          :cancel-param-edit="cancelParamEdit"
        />
      </section>

      <footer class="flow-panel__footer p-[12px_16px] border-t border-t-ui-border">
        <button
          type="button"
          class="flow-panel__execute-btn w-full p-[10px_0] border-0 rounded-control bg-ui-accent text-ui-accent-text text-[14px] font-semibold cursor-pointer transition-opacity duration-150 hover:opacity-92 disabled:bg-ui-hover disabled:text-ui-dim disabled:cursor-not-allowed"
          :disabled="props.queuedCommands.length === 0 || props.executing"
          :aria-disabled="props.flowOpen ? 'true' : undefined"
          @click="onExecuteStagedClick"
        >
          {{ props.executing ? t("launcher.executing") : t("launcher.executeAll") }}
        </button>
      </footer>
    </section>
  </aside>
</template>
