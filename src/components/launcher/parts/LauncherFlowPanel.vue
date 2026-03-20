<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18nText } from "../../../i18n";
import type { ElementRefArg, LauncherFlowPanelProps } from "../types";
import LauncherIcon from "./LauncherIcon.vue";

const props = defineProps<LauncherFlowPanelProps>();
const { t } = useI18nText();

const reviewPanelRef = ref<HTMLElement | null>(null);
const reviewBodyRef = ref<HTMLElement | null>(null);
const reviewListRef = ref<HTMLElement | null>(null);
const closeButtonRef = ref<HTMLButtonElement | null>(null);
const gripReorderActive = ref(false);
const flowPanelSettledEmitted = ref(false);
let gripReorderCleanup: (() => void) | null = null;
let previousBodyUserSelect = "";
let flowPanelHeightObserver: ResizeObserver | null = null;
let flowPanelHeightIdleTimer: ReturnType<typeof setTimeout> | null = null;
let flowPanelHeightMaxTimer: ReturnType<typeof setTimeout> | null = null;
let flowPanelHeightChangeQueued = false;
const draggingCommandId = ref<string | null>(null);
const dragOverCommandId = ref<string | null>(null);

const FLOW_PANEL_HEIGHT_OBSERVATION_IDLE_MS = 96;
const FLOW_PANEL_HEIGHT_OBSERVATION_MAX_MS = 640;

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

async function emitFlowPanelSettledOnce(): Promise<void> {
  if (flowPanelSettledEmitted.value) {
    return;
  }

  await nextTick();
  if (flowPanelSettledEmitted.value || props.stagingDrawerState !== "open") {
    return;
  }

  flowPanelSettledEmitted.value = true;
  emit("flow-panel-settled");
  beginFlowPanelHeightObservation();
}

function clearFlowPanelHeightIdleTimer(): void {
  if (flowPanelHeightIdleTimer === null) {
    return;
  }
  clearTimeout(flowPanelHeightIdleTimer);
  flowPanelHeightIdleTimer = null;
}

function clearFlowPanelHeightMaxTimer(): void {
  if (flowPanelHeightMaxTimer === null) {
    return;
  }
  clearTimeout(flowPanelHeightMaxTimer);
  flowPanelHeightMaxTimer = null;
}

function stopFlowPanelHeightObservation(): void {
  clearFlowPanelHeightIdleTimer();
  clearFlowPanelHeightMaxTimer();
  flowPanelHeightObserver?.disconnect();
  flowPanelHeightObserver = null;
  flowPanelHeightChangeQueued = false;
}

function scheduleFlowPanelHeightChangeEmit(): void {
  if (flowPanelHeightChangeQueued || props.stagingDrawerState !== "open") {
    return;
  }
  flowPanelHeightChangeQueued = true;
  void Promise.resolve().then(() => {
    flowPanelHeightChangeQueued = false;
    if (props.stagingDrawerState !== "open" || flowPanelHeightObserver === null) {
      return;
    }
    emit("flow-panel-height-change");
  });
}

function refreshFlowPanelHeightIdleTimer(): void {
  clearFlowPanelHeightIdleTimer();
  flowPanelHeightIdleTimer = setTimeout(() => {
    stopFlowPanelHeightObservation();
  }, FLOW_PANEL_HEIGHT_OBSERVATION_IDLE_MS);
}

function resolveFlowPanelHeightObservationTargets(): HTMLElement[] {
  const panel = reviewPanelRef.value;
  if (!panel) {
    return [];
  }

  const targets: HTMLElement[] = [];
  const header = panel.querySelector<HTMLElement>(".flow-panel__header");
  const footer = panel.querySelector<HTMLElement>(".flow-panel__footer");
  if (header) {
    targets.push(header);
  }
  if (footer) {
    targets.push(footer);
  }

  const emptyState = panel.querySelector<HTMLElement>(".flow-panel__empty");
  if (emptyState) {
    targets.push(emptyState);
    return targets;
  }

  const listItems = Array.from(panel.querySelectorAll<HTMLElement>(".flow-panel__list-item")).slice(0, 2);
  targets.push(...listItems);
  return targets;
}

function bindFlowPanelHeightObservationTargets(): void {
  if (!flowPanelHeightObserver) {
    return;
  }
  flowPanelHeightObserver.disconnect();
  for (const target of resolveFlowPanelHeightObservationTargets()) {
    flowPanelHeightObserver.observe(target);
  }
}

function beginFlowPanelHeightObservation(): void {
  stopFlowPanelHeightObservation();
  if (props.stagingDrawerState !== "open" || typeof ResizeObserver !== "function") {
    return;
  }

  flowPanelHeightObserver = new ResizeObserver(() => {
    if (props.stagingDrawerState !== "open") {
      return;
    }
    scheduleFlowPanelHeightChangeEmit();
    refreshFlowPanelHeightIdleTimer();
  });
  bindFlowPanelHeightObservationTargets();
  refreshFlowPanelHeightIdleTimer();
  flowPanelHeightMaxTimer = setTimeout(() => {
    stopFlowPanelHeightObservation();
  }, FLOW_PANEL_HEIGHT_OBSERVATION_MAX_MS);
}

async function refreshFlowPanelHeightObservationTargets(emitChange = false): Promise<void> {
  if (!flowPanelHeightObserver || props.stagingDrawerState !== "open") {
    return;
  }

  await nextTick();
  if (!flowPanelHeightObserver || props.stagingDrawerState !== "open") {
    return;
  }

  bindFlowPanelHeightObservationTargets();
  if (emitChange) {
    refreshFlowPanelHeightIdleTimer();
    scheduleFlowPanelHeightChangeEmit();
  }
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

watch(
  () => props.stagingDrawerState,
  (state, previousState) => {
    if (state !== "open") {
      flowPanelSettledEmitted.value = false;
      stopFlowPanelHeightObservation();
      return;
    }

    if (previousState === "open") {
      return;
    }

    void emitFlowPanelSettledOnce();
  }
);

watch(
  () => props.stagedCommands.slice(0, 2).map((cmd) => cmd.id).join("|"),
  () => {
    if (props.stagingDrawerState !== "open") {
      return;
    }
    void refreshFlowPanelHeightObservationTargets(true);
  }
);

onMounted(() => {
  if (props.stagingDrawerState === "open") {
    flowPanelSettledEmitted.value = false;
    void emitFlowPanelSettledOnce();
  }
});

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

function createSyntheticDragEvent(type: "dragstart" | "dragover"): DragEvent {
  if (typeof DragEvent === "function") {
    return new DragEvent(type);
  }

  return {
    preventDefault() {},
    dataTransfer: null
  } as unknown as DragEvent;
}

function resetDragIndicators(): void {
  draggingCommandId.value = null;
  dragOverCommandId.value = null;
}

function endGripReorder(): void {
  if (!gripReorderActive.value) {
    return;
  }
  gripReorderActive.value = false;
  emit("grip-reorder-active-change", false);
  if (typeof document !== "undefined") {
    document.body.style.userSelect = previousBodyUserSelect;
  }
  gripReorderCleanup?.();
  gripReorderCleanup = null;
  resetDragIndicators();
  emit("staging-drag-end");
}

function maybeEmitGripReorder(index: number, clientY: number, currentTarget: HTMLElement | null): void {
  dragOverCommandId.value = props.stagedCommands[index]?.id ?? null;

  const draggingId = draggingCommandId.value;
  if (!draggingId) {
    return;
  }

  const draggingIndex = props.stagedCommands.findIndex((cmd) => cmd.id === draggingId);
  if (draggingIndex < 0 || draggingIndex === index) {
    return;
  }

  if (!currentTarget) {
    emit("staging-drag-over", index, createSyntheticDragEvent("dragover"));
    return;
  }

  const rect = currentTarget.getBoundingClientRect();
  const offsetY = clientY - rect.top;
  const midY = rect.height / 2;
  const buffer = Math.min(12, rect.height / 8);

  // 只在“跨过目标卡片中线”时才触发一次 move，避免卡片边界处来回抖动。
  if (draggingIndex < index) {
    // 向下移动：进入下半区再重排
    if (offsetY < midY + buffer) {
      return;
    }
  } else {
    // 向上移动：进入上半区再重排
    if (offsetY > midY - buffer) {
      return;
    }
  }

  emit("staging-drag-over", index, createSyntheticDragEvent("dragover"));
}

function findGripTargetItem(clientX: number, clientY: number): HTMLElement | null {
  if (typeof document.elementFromPoint !== "function") {
    return null;
  }

  const hit = document.elementFromPoint(clientX, clientY);
  if (!(hit instanceof Element)) {
    return null;
  }

  const item = hit.closest<HTMLElement>(".flow-panel__list-item");
  if (!item || !(reviewListRef.value?.contains(item) ?? false)) {
    return null;
  }

  return item;
}

function onWindowGripMove(event: MouseEvent): void {
  if (!gripReorderActive.value) {
    return;
  }
  if ((event.buttons & 1) === 0) {
    endGripReorder();
    return;
  }

  event.preventDefault();

  const currentTarget = findGripTargetItem(event.clientX, event.clientY);
  if (!currentTarget) {
    return;
  }

  const index = Number.parseInt(currentTarget.dataset.stagingIndex ?? "", 10);
  if (!Number.isFinite(index) || index < 0) {
    return;
  }

  maybeEmitGripReorder(index, event.clientY, currentTarget);
}

function startGripReorder(index: number, event: MouseEvent): void {
  if (event.button !== 0) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  gripReorderActive.value = true;
  emit("grip-reorder-active-change", true);
  if (typeof document !== "undefined") {
    previousBodyUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
  }
  draggingCommandId.value = props.stagedCommands[index]?.id ?? null;
  dragOverCommandId.value = draggingCommandId.value;
  emit("staging-drag-start", index, createSyntheticDragEvent("dragstart"));

  window.addEventListener("mousemove", onWindowGripMove);
  const onMouseUp = () => endGripReorder();
  const onWindowBlur = () => endGripReorder();
  window.addEventListener("mouseup", onMouseUp, { once: true });
  window.addEventListener("blur", onWindowBlur, { once: true });

  gripReorderCleanup = () => {
    window.removeEventListener("mousemove", onWindowGripMove);
    window.removeEventListener("mouseup", onMouseUp);
    window.removeEventListener("blur", onWindowBlur);
  };
}

// --- 拖拽启动时取消编辑态 ---
function onDragStartWithEditGuard(event: DragEvent, index: number) {
  if (gripReorderActive.value) {
    event.preventDefault();
    return;
  }
  endGripReorder();
  draggingCommandId.value = props.stagedCommands[index]?.id ?? null;
  dragOverCommandId.value = draggingCommandId.value;
  if (editingParam.value) {
    cancelParamEdit();
  }
  emit("staging-drag-start", index, event);
}

function onStagingDragOver(index: number, event: DragEvent): void {
  dragOverCommandId.value = props.stagedCommands[index]?.id ?? null;
  emit("staging-drag-over", index, event);
}

function onDragEnd(): void {
  resetDragIndicators();
  emit("staging-drag-end");
}

// --- 内联参数编辑状态 ---
const editingParam = ref<{
  cmdId: string;
  argKey: string;
  currentValue: string;
  originalValue: string;
} | null>(null);

const paramEditInputRef = ref<HTMLInputElement | HTMLInputElement[] | null>(null);

function startParamEdit(cmdId: string, argKey: string, currentValue: string) {
  editingParam.value = { cmdId, argKey, currentValue, originalValue: currentValue };
  nextTick(() => {
    const el = paramEditInputRef.value;
    // v-for 内的 ref 可能被收集为数组
    const input = Array.isArray(el) ? el[0] : el;
    if (input instanceof HTMLInputElement) {
      input.focus();
    }
  });
}

function onParamEditInput(cmdId: string, argKey: string, value: string) {
  if (editingParam.value) {
    editingParam.value.currentValue = value;
  }
  // 实时 emit 以更新命令预览
  emit("update-staged-arg", cmdId, argKey, value);
}

function commitParamEdit(cmdId: string, argKey: string) {
  if (!editingParam.value) return;
  const newValue = editingParam.value.currentValue;
  editingParam.value = null;
  emit("update-staged-arg", cmdId, argKey, newValue);
}

function cancelParamEdit() {
  if (!editingParam.value) return;
  const { cmdId, argKey, originalValue } = editingParam.value;
  editingParam.value = null;
  // 恢复原值
  emit("update-staged-arg", cmdId, argKey, originalValue);
}

function onExecuteStagedClick(): void {
  if (props.flowOpen) {
    emit("execution-feedback", "neutral", t("execution.flowInProgress"));
    return;
  }
  emit("execute-staged");
}

async function copyCommand(command: string): Promise<void> {
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error("clipboard API unavailable");
    }
    await navigator.clipboard.writeText(command);
    emit("execution-feedback", "success", t("common.copied"));
  } catch (error) {
    console.error("copy command failed:", error);
    emit("execution-feedback", "error", t("common.copyFailed"));
  }
}

onBeforeUnmount(() => {
  stopFlowPanelHeightObservation();
  endGripReorder();
  resetDragIndicators();
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
          <button
            type="button"
            class="btn-icon btn-danger"
            :aria-label="t('common.clear')"
            :disabled="props.stagedCommands.length === 0"
            @click="emit('clear-staging')"
          >
            <LauncherIcon name="trash" />
          </button>
          <button
            ref="closeButtonRef"
            type="button"
            class="btn-icon flow-panel__close"
            :aria-label="t('common.close')"
            @click="closeReview"
          >
            <LauncherIcon name="x" />
          </button>
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
                    <button
                      type="button"
                      class="btn-muted btn-icon btn-small"
                      :disabled="props.executing"
                      :aria-label="t('common.copy')"
                      :title="t('common.copy')"
                      @click.stop="copyCommand(cmd.renderedCommand)"
                    >
                      <LauncherIcon name="copy" />
                    </button>
                    <button
                      type="button"
                      class="btn-danger btn-icon btn-small"
                      :disabled="props.executing"
                      :aria-label="t('common.remove')"
                      :title="t('common.remove')"
                      @click.stop="emit('remove-staged-command', cmd.id)"
                    >
                      <LauncherIcon name="x" />
                    </button>
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
