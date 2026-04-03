<script setup lang="ts">
import { computed, nextTick, provide, toRef } from "vue";
import type { CommandTemplate } from "../../features/commands/commandTemplates";
import { useI18nText } from "../../i18n";
import { useLauncherHitZones } from "../../composables/launcher/useLauncherHitZones";
import { LAUNCHER_NAV_STACK_KEY, type LauncherNavStack } from "../../composables/launcher/useLauncherNavStack";
import type { LauncherVm } from "../../composables/app/useAppCompositionRoot/launcherVm";
import { dismissDanger } from "../../features/security/dangerDismiss";
import LauncherQueueReviewPanel from "./parts/LauncherQueueReviewPanel.vue";
import LauncherActionPanel from "./parts/LauncherActionPanel.vue";
import LauncherCommandPanel from "./parts/LauncherCommandPanel.vue";
import LauncherSearchPanel from "./parts/LauncherSearchPanel.vue";
import LauncherSafetyOverlay from "./parts/LauncherSafetyOverlay.vue";

const props = defineProps<{
  launcherVm: LauncherVm;
}>();
const { t } = useI18nText();

const emit = defineEmits<{
  (e: "query-input", value: string): void;
  (e: "enqueue-result", command: CommandTemplate): void;
  (e: "execute-result", command: CommandTemplate): void;
  (e: "open-action-panel", command: CommandTemplate): void;
  (e: "copy-result", command: CommandTemplate): void;
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
  (e: "refresh-queue-preflight"): void;
  (e: "refresh-queued-command-preflight", id: string): void;
  (e: "submit-param-input"): void;
  (e: "request-command-panel-exit"): void;
  (e: "command-page-settled"): void;
  (e: "flow-panel-prepared"): void;
  (e: "flow-panel-height-change"): void;
  (e: "search-page-settled"): void;
  (e: "flow-panel-settled"): void;
  (e: "arg-input", key: string, value: string): void;
  (e: "confirm-safety-execution"): void;
  (e: "cancel-safety-execution"): void;
  (e: "blank-pointerdown"): void;
  (e: "execution-feedback", tone: "neutral" | "success" | "error", message: string): void;
}>();

const { onRootPointerDown } = useLauncherHitZones({
  hideMainWindow: () => emit("blank-pointerdown")
});

const navStackProvided: LauncherNavStack = {
  stack: toRef(props.launcherVm.nav, "stack"),
  currentPage: computed(() => props.launcherVm.nav.currentPage),
  canGoBack: computed(() => props.launcherVm.nav.canGoBack),
  pushPage: props.launcherVm.nav.pushPage,
  replaceTopPage: props.launcherVm.nav.replaceTopPage,
  popPage: props.launcherVm.nav.popPage,
  resetToSearch: props.launcherVm.nav.resetToSearch
};
provide(LAUNCHER_NAV_STACK_KEY, navStackProvided);

function submitParamInput(): void {
  if (!props.launcherVm.actions.submitParamInput()) {
    return;
  }
  props.launcherVm.actions.requestCommandPanelExit();
}

function onQueryInput(value: string): void {
  props.launcherVm.actions.onQueryInput(value);
  emit("query-input", value);
}

function onEnqueueResult(command: CommandTemplate): void {
  props.launcherVm.actions.enqueueResult(command);
  emit("enqueue-result", command);
}

function onExecuteResult(command: CommandTemplate): void {
  props.launcherVm.actions.executeResult(command);
  emit("execute-result", command);
}

function onOpenActionPanel(command: CommandTemplate): void {
  props.launcherVm.actions.openActionPanel(command);
  emit("open-action-panel", command);
}

function onCopyResult(command: CommandTemplate): void {
  props.launcherVm.actions.dispatchCommandIntent(command, "copy");
  emit("copy-result", command);
}

function toggleQueue(): void {
  props.launcherVm.actions.toggleQueue();
  emit("toggle-queue");
}

function onQueueDragStart(index: number, event: DragEvent): void {
  props.launcherVm.actions.onQueueDragStart(index, event);
  emit("queue-drag-start", index, event);
}

function onQueueDragOver(index: number, event: DragEvent): void {
  props.launcherVm.actions.onQueueDragOver(index, event);
  emit("queue-drag-over", index, event);
}

function onQueueDragEnd(): void {
  props.launcherVm.actions.onQueueDragEnd();
  emit("queue-drag-end");
}

function onQueueGripReorderActiveChange(value: boolean): void {
  props.launcherVm.actions.setQueueGripReorderActive(value);
  emit("grip-reorder-active-change", value);
}

function onFocusQueueIndex(index: number): void {
  props.launcherVm.actions.onFocusQueueIndex(index);
  emit("focus-queue-index", index);
}

function onRemoveQueuedCommand(id: string): void {
  props.launcherVm.actions.removeQueuedCommand(id);
  emit("remove-queued-command", id);
}

function onUpdateQueuedArg(id: string, key: string, value: string): void {
  props.launcherVm.actions.updateQueuedArg(id, key, value);
  emit("update-queued-arg", id, key, value);
}

function onClearQueue(): void {
  props.launcherVm.actions.clearQueue();
  emit("clear-queue");
}

function onExecuteQueue(): void {
  props.launcherVm.actions.executeQueue();
  emit("execute-queue");
}

function onRefreshQueuePreflight(): void {
  props.launcherVm.actions.refreshAllQueuedPreflight();
  emit("refresh-queue-preflight");
}

function onRefreshQueuedCommandPreflight(id: string): void {
  props.launcherVm.actions.refreshQueuedCommandPreflight(id);
  emit("refresh-queued-command-preflight", id);
}

function onSearchCapsuleBack(): void {
  if (props.launcherVm.nav.currentPage.type === "command-action") {
    props.launcherVm.actions.requestCommandPanelExit();
    emit("request-command-panel-exit");
    return;
  }
  if (props.launcherVm.nav.canGoBack) {
    props.launcherVm.nav.popPage();
    return;
  }
  if (props.launcherVm.queue.queueOpen) {
    toggleQueue();
  }
}

function onCommandPanelSubmit(argValues: Record<string, string>, shouldDismiss: boolean): void {
  void argValues;
  if (shouldDismiss && props.launcherVm.nav.currentPage.props?.command) {
    dismissDanger(props.launcherVm.nav.currentPage.props.command.id);
  }
  submitParamInput();
  emit("submit-param-input");
}

function onCommandPanelCancel(): void {
  props.launcherVm.actions.requestCommandPanelExit();
  emit("request-command-panel-exit");
}

function onActionPanelCancel(): void {
  props.launcherVm.actions.requestCommandPanelExit();
  emit("request-command-panel-exit");
}

function onActionPanelSelect(intent: "execute" | "stage" | "copy"): void {
  props.launcherVm.actions.selectActionPanelIntent(intent);
}

function onArgInput(key: string, value: string): void {
  props.launcherVm.actions.updatePendingArgValue(key, value);
  emit("arg-input", key, value);
}

function onFlowPanelPrepared(): void {
  props.launcherVm.actions.notifyFlowPanelPrepared();
  emit("flow-panel-prepared");
}

function onFlowPanelHeightChange(): void {
  props.launcherVm.actions.notifyFlowPanelHeightChange();
  emit("flow-panel-height-change");
}

function onFlowPanelSettled(): void {
  props.launcherVm.actions.notifyFlowPanelSettled();
  emit("flow-panel-settled");
}

function onConfirmSafetyExecution(): void {
  props.launcherVm.actions.confirmSafetyExecution();
  emit("confirm-safety-execution");
}

function onCancelSafetyExecution(): void {
  props.launcherVm.actions.cancelSafetyExecution();
  emit("cancel-safety-execution");
}

function onNavAfterEnter(): void {
  void nextTick(() => {
    if (props.launcherVm.nav.currentPage.type === "search") {
      props.launcherVm.actions.notifySearchPageSettled();
      emit("search-page-settled");
      return;
    }
    if (props.launcherVm.nav.currentPage.type === "command-action") {
      props.launcherVm.actions.notifyCommandPageSettled();
      emit("command-page-settled");
    }
  });
}
</script>

<template>
  <main
    class="launcher-root w-full h-full px-[var(--shell-side-pad)] grid place-items-start justify-items-center text-ui-text select-none bg-transparent"
    @pointerdown.capture="onRootPointerDown"
  >
    <div
      :ref="props.launcherVm.dom.setSearchShellRef"
      class="search-shell w-max max-w-full mt-[var(--launcher-shell-margin-top)] pb-[var(--launcher-shell-breathing-bottom)] relative grid grid-cols-[var(--search-main-width)_var(--staging-collapsed-width)] grid-rows-launcher-shell gap-x-[var(--shell-gap)] justify-start justify-items-stretch items-start"
      :style="props.launcherVm.search.searchShellStyle"
      :aria-label="t('app.launcherAriaLabel')"
    >
      <div
        class="shell-drag-strip col-span-full row-start-1 w-full min-h-ui-top-align self-stretch justify-self-stretch"
        data-hit-zone="drag"
        data-tauri-drag-region
        aria-hidden="true"
      ></div>

      <div
        class="launcher-frame col-start-1 row-start-2 relative w-full min-w-0 h-[var(--launcher-frame-height,auto)] max-h-[var(--launcher-panel-max-height,none)] overflow-hidden rounded-ui border border-ui-border shadow-none bg-ui-bg from-ui-text/4 bg-launcher-frame-highlight"
        data-hit-zone="interactive"
      >
        <Transition
          mode="out-in"
          enter-active-class="transition-transform duration-motion-nav-enter ease-motion-emphasized motion-reduce:transition-none"
          enter-from-class="translate-x-full"
          enter-to-class="translate-x-0"
          leave-active-class="transition-transform duration-motion-nav-exit ease-motion-exit motion-reduce:transition-none"
          leave-from-class="translate-x-0"
          leave-to-class="translate-x-full"
          :on-after-enter="onNavAfterEnter"
        >
          <LauncherSearchPanel
            v-if="props.launcherVm.nav.currentPage.type === 'search'"
            key="search"
            :query="props.launcherVm.search.query"
            :executing="props.launcherVm.command.executing"
            :execution-feedback-message="props.launcherVm.command.executionFeedbackMessage"
            :execution-feedback-tone="props.launcherVm.command.executionFeedbackTone"
            :drawer-open="props.launcherVm.search.drawerOpen"
            :drawer-viewport-height="props.launcherVm.search.drawerViewportHeight"
            :keyboard-hints="props.launcherVm.search.keyboardHints"
            :search-hint-lines="props.launcherVm.search.searchHintLines"
            :left-click-action="props.launcherVm.search.leftClickAction"
            :right-click-action="props.launcherVm.search.rightClickAction"
            :filtered-results="props.launcherVm.search.filteredResults"
            :active-index="props.launcherVm.search.activeIndex"
            :queued-feedback-command-id="props.launcherVm.search.queuedFeedbackCommandId"
            :queued-command-count="props.launcherVm.queue.items.length"
            :flow-open="props.launcherVm.nav.currentPage.type !== 'search'"
            :review-open="props.launcherVm.queue.queueOpen"
            :set-search-input-ref="props.launcherVm.dom.setSearchInputRef"
            :set-drawer-ref="props.launcherVm.dom.setDrawerRef"
            :set-result-button-ref="props.launcherVm.dom.setResultButtonRef"
            @query-input="onQueryInput"
            @enqueue-result="onEnqueueResult"
            @execute-result="onExecuteResult"
            @open-action-panel="onOpenActionPanel"
            @copy-result="onCopyResult"
            @toggle-queue="toggleQueue"
            @search-capsule-back="onSearchCapsuleBack"
          />

          <LauncherActionPanel
            v-else-if="
              props.launcherVm.nav.currentPage.type === 'command-action' &&
              props.launcherVm.nav.currentPage.props?.panel === 'actions'
            "
            key="command-action-actions"
            :command="props.launcherVm.nav.currentPage.props?.command!"
            @select-intent="onActionPanelSelect"
            @cancel="onActionPanelCancel"
          />

          <LauncherCommandPanel
            v-else-if="props.launcherVm.nav.currentPage.type === 'command-action'"
            key="command-action-params"
            :command="props.launcherVm.nav.currentPage.props?.command!"
            :mode="props.launcherVm.nav.currentPage.props?.intent ?? 'execute'"
            :is-dangerous="props.launcherVm.nav.currentPage.props?.isDangerous ?? false"
            :pending-arg-values="props.launcherVm.command.pendingArgValues"
            :queued-command-count="props.launcherVm.queue.items.length"
            :execution-feedback-message="props.launcherVm.command.executionFeedbackMessage"
            :execution-feedback-tone="props.launcherVm.command.executionFeedbackTone"
            @submit="onCommandPanelSubmit"
            @cancel="onCommandPanelCancel"
            @arg-input="onArgInput"
            @toggle-queue="toggleQueue"
          />
        </Transition>

        <LauncherSafetyOverlay
          v-if="props.launcherVm.command.safetyDialog"
          :safety-dialog="props.launcherVm.command.safetyDialog"
          :executing="props.launcherVm.command.executing"
          @confirm-safety-execution="onConfirmSafetyExecution"
          @cancel-safety-execution="onCancelSafetyExecution"
        />

        <LauncherQueueReviewPanel
          v-if="props.launcherVm.queue.queueOpen"
          :queue-panel-state="props.launcherVm.queue.panelState"
          :queue-open="props.launcherVm.queue.queueOpen"
          :queued-commands="props.launcherVm.queue.items"
          :refreshing-all-queued-preflight="props.launcherVm.queue.refreshingAllPreflight"
          :refreshing-queued-command-ids="props.launcherVm.queue.refreshingCommandIds"
          :queue-hints="props.launcherVm.queue.hints"
          :focus-zone="props.launcherVm.queue.focusZone"
          :queue-active-index="props.launcherVm.queue.activeIndex"
          :flow-open="props.launcherVm.nav.currentPage.type !== 'search'"
          :executing="props.launcherVm.command.executing"
          :execution-feedback-message="props.launcherVm.command.executionFeedbackMessage"
          :execution-feedback-tone="props.launcherVm.command.executionFeedbackTone"
          :set-queue-panel-ref="props.launcherVm.dom.setQueuePanelRef"
          :set-queue-list-ref="props.launcherVm.dom.setQueueListRef"
          @toggle-queue="toggleQueue"
          @queue-drag-start="onQueueDragStart"
          @queue-drag-over="onQueueDragOver"
          @queue-drag-end="onQueueDragEnd"
          @grip-reorder-active-change="onQueueGripReorderActiveChange"
          @focus-queue-index="onFocusQueueIndex"
          @remove-queued-command="onRemoveQueuedCommand"
          @update-queued-arg="onUpdateQueuedArg"
          @clear-queue="onClearQueue"
          @execute-queue="onExecuteQueue"
          @refresh-queue-preflight="onRefreshQueuePreflight"
          @refresh-queued-command-preflight="onRefreshQueuedCommandPreflight"
          @flow-panel-prepared="onFlowPanelPrepared"
          @flow-panel-height-change="onFlowPanelHeightChange"
          @flow-panel-settled="onFlowPanelSettled"
          @execution-feedback="(t: 'neutral' | 'success' | 'error', m: string) => emit('execution-feedback', t, m)"
        />
      </div>
    </div>
  </main>
</template>
