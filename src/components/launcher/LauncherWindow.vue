<script setup lang="ts">
import { computed, nextTick, provide, toRef } from "vue";
import { useI18nText } from "../../i18n";
import { useLauncherHitZones } from "../../composables/launcher/useLauncherHitZones";
import { LAUNCHER_NAV_STACK_KEY, type LauncherNavStack } from "../../composables/launcher/useLauncherNavStack";
import type { LauncherVm } from "../../composables/app/useAppCompositionRoot/launcherVm";
import { dismissDanger } from "../../features/security/dangerDismiss";
import { createLauncherWindowHandlers } from "./launcherWindowHandlers";
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
const handlers = createLauncherWindowHandlers({
  launcherVm: props.launcherVm,
  dismissDanger
});

function onNavAfterEnter(): void {
  void nextTick(() => {
    if (props.launcherVm.nav.currentPage.type === "search") {
      props.launcherVm.actions.notifySearchPageSettled();
      return;
    }
    if (props.launcherVm.nav.currentPage.type === "command-action") {
      props.launcherVm.actions.notifyCommandPageSettled();
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
            :catalog-loading="props.launcherVm.search.catalogLoading"
            :catalog-ready="props.launcherVm.search.catalogReady"
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
            @query-input="handlers.onQueryInput"
            @enqueue-result="handlers.onEnqueueResult"
            @execute-result="handlers.onExecuteResult"
            @open-action-panel="handlers.onOpenActionPanel"
            @copy-result="handlers.onCopyResult"
            @toggle-queue="handlers.toggleQueue"
            @search-capsule-back="handlers.onSearchCapsuleBack"
          />

          <LauncherActionPanel
            v-else-if="
              props.launcherVm.nav.currentPage.type === 'command-action' &&
              props.launcherVm.nav.currentPage.props?.panel === 'actions'
            "
            key="command-action-actions"
            :command="props.launcherVm.nav.currentPage.props?.command!"
            @select-intent="handlers.onActionPanelSelect"
            @cancel="handlers.onActionPanelCancel"
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
            @submit="handlers.onCommandPanelSubmit"
            @cancel="handlers.onCommandPanelCancel"
            @arg-input="handlers.onArgInput"
            @toggle-queue="handlers.toggleQueue"
          />
        </Transition>

        <LauncherSafetyOverlay
          v-if="props.launcherVm.command.safetyDialog"
          :safety-dialog="props.launcherVm.command.safetyDialog"
          :executing="props.launcherVm.command.executing"
          @confirm-safety-execution="handlers.onConfirmSafetyExecution"
          @cancel-safety-execution="handlers.onCancelSafetyExecution"
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
          @toggle-queue="handlers.toggleQueue"
          @queue-drag-start="handlers.onQueueDragStart"
          @queue-drag-over="handlers.onQueueDragOver"
          @queue-drag-end="handlers.onQueueDragEnd"
          @grip-reorder-active-change="handlers.onQueueGripReorderActiveChange"
          @focus-queue-index="handlers.onFocusQueueIndex"
          @remove-queued-command="handlers.onRemoveQueuedCommand"
          @update-queued-arg="handlers.onUpdateQueuedArg"
          @clear-queue="handlers.onClearQueue"
          @execute-queue="handlers.onExecuteQueue"
          @refresh-queue-preflight="handlers.onRefreshQueuePreflight"
          @refresh-queued-command-preflight="handlers.onRefreshQueuedCommandPreflight"
          @flow-panel-prepared="handlers.onFlowPanelPrepared"
          @flow-panel-height-change="handlers.onFlowPanelHeightChange"
          @flow-panel-settled="handlers.onFlowPanelSettled"
          @execution-feedback="(t: 'neutral' | 'success' | 'error', m: string) => emit('execution-feedback', t, m)"
        />
      </div>
    </div>
  </main>
</template>
