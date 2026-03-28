<script setup lang="ts">
import { computed, nextTick, provide, toRef } from "vue";
import type {
  CommandArg,
  CommandTemplate
} from "../../features/commands/commandTemplates";
import { useI18nText } from "../../i18n";
import type { StagedCommand } from "../../features/launcher/types";
import { useLauncherHitZones } from "../../composables/launcher/useLauncherHitZones";
import { LAUNCHER_NAV_STACK_KEY, type LauncherNavStack, type NavPage } from "../../composables/launcher/useLauncherNavStack";
import { dismissDanger } from "../../features/security/dangerDismiss";
import LauncherFlowPanel from "./parts/LauncherFlowPanel.vue";
import LauncherCommandPanel from "./parts/LauncherCommandPanel.vue";
import LauncherSearchPanel from "./parts/LauncherSearchPanel.vue";
import LauncherSafetyOverlay from "./parts/LauncherSafetyOverlay.vue";
import type {
  ElementRefArg,
  FocusZone,
  LauncherSafetyDialog,
  ParamSubmitMode,
  StagingDrawerState,
  KeyboardHint
} from "./types";

const props = defineProps<{
  query: string;
  executing: boolean;
  executionFeedbackMessage: string;
  executionFeedbackTone: "neutral" | "success" | "error";
  searchShellStyle: Record<string, string>;
  stagingExpanded: boolean;
  drawerOpen: boolean;
  drawerViewportHeight: number;
  keyboardHints: KeyboardHint[];
  filteredResults: CommandTemplate[];
  activeIndex: number;
  stagedFeedbackCommandId: string | null;
  stagedCommands: StagedCommand[];
  stagingDrawerState: StagingDrawerState;
  stagingHints: KeyboardHint[];
  focusZone: FocusZone;
  stagingActiveIndex: number;
  pendingCommand: CommandTemplate | null;
  pendingArgs: CommandArg[];
  pendingArgValues: Record<string, string>;
  pendingSubmitHint: string;
  pendingSubmitMode: ParamSubmitMode;
  safetyDialog: LauncherSafetyDialog | null;
  navCurrentPage: NavPage;
  navCanGoBack: boolean;
  navPushPage: (page: NavPage) => void;
  navPopPage: () => void;
  navResetToSearch: () => void;
  navStack: NavPage[];
  setSearchShellRef: (el: ElementRefArg) => void;
  setSearchInputRef: (el: ElementRefArg) => void;
  setDrawerRef: (el: ElementRefArg) => void;
  setStagingPanelRef: (el: ElementRefArg) => void;
  setStagingListRef: (el: ElementRefArg) => void;
  setResultButtonRef: (el: ElementRefArg, index: number) => void;
  setParamInputRef: (el: ElementRefArg, index: number) => void;
}>();
const { t } = useI18nText();

const emit = defineEmits<{
  (e: "query-input", value: string): void;
  (e: "stage-result", command: CommandTemplate): void;
  (e: "execute-result", command: CommandTemplate): void;
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
  (e: "submit-param-input"): void;
  (e: "request-command-panel-exit"): void;
  (e: "command-page-settled"): void;
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
  stack: toRef(props, "navStack"),
  currentPage: computed(() => props.navCurrentPage),
  canGoBack: computed(() => props.navCanGoBack),
  pushPage: props.navPushPage,
  popPage: props.navPopPage,
  resetToSearch: props.navResetToSearch
};
provide(LAUNCHER_NAV_STACK_KEY, navStackProvided);

function onSearchCapsuleBack(): void {
  if (props.navCurrentPage.type === "command-action") {
    emit("request-command-panel-exit");
    return;
  }
  if (props.navCanGoBack) {
    props.navPopPage();
    return;
  }
  if (props.stagingExpanded) {
    emit("toggle-staging");
  }
}

function onCommandPanelSubmit(argValues: Record<string, string>, shouldDismiss: boolean): void {
  void argValues;
  if (shouldDismiss && props.navCurrentPage.props?.command) {
    dismissDanger(props.navCurrentPage.props.command.id);
  }
  emit("submit-param-input");
}

function onCommandPanelCancel(): void {
  emit("request-command-panel-exit");
}

function onNavAfterEnter(): void {
  void nextTick(() => {
    if (props.navCurrentPage.type === "search") {
      emit("search-page-settled");
      return;
    }
    if (props.navCurrentPage.type === "command-action") {
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
      :ref="props.setSearchShellRef"
      class="search-shell w-max max-w-full mt-[var(--launcher-shell-margin-top)] pb-[var(--launcher-shell-breathing-bottom)] relative grid grid-cols-[var(--search-main-width)_var(--staging-collapsed-width)] grid-rows-launcher-shell gap-x-[var(--shell-gap)] justify-start justify-items-stretch items-start"
      :style="props.searchShellStyle"
      role="application"
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
            v-if="props.navCurrentPage.type === 'search'"
            key="search"
            :query="props.query"
            :executing="props.executing"
            :execution-feedback-message="props.executionFeedbackMessage"
            :execution-feedback-tone="props.executionFeedbackTone"
            :drawer-open="props.drawerOpen"
            :drawer-viewport-height="props.drawerViewportHeight"
            :keyboard-hints="props.keyboardHints"
            :filtered-results="props.filteredResults"
            :active-index="props.activeIndex"
            :staged-feedback-command-id="props.stagedFeedbackCommandId"
            :staged-command-count="props.stagedCommands.length"
            :flow-open="props.navCurrentPage.type !== 'search'"
            :review-open="props.stagingExpanded"
            :set-search-input-ref="props.setSearchInputRef"
            :set-drawer-ref="props.setDrawerRef"
            :set-result-button-ref="props.setResultButtonRef"
            @query-input="emit('query-input', $event)"
            @stage-result="emit('stage-result', $event)"
            @execute-result="emit('execute-result', $event)"
            @toggle-staging="emit('toggle-staging')"
            @search-capsule-back="onSearchCapsuleBack"
          />

          <LauncherCommandPanel
            v-else-if="props.navCurrentPage.type === 'command-action'"
            key="command-action"
            :command="props.navCurrentPage.props?.command!"
            :mode="props.navCurrentPage.props?.mode ?? 'execute'"
            :is-dangerous="props.navCurrentPage.props?.isDangerous ?? false"
            :pending-arg-values="props.pendingArgValues"
            :staged-command-count="props.stagedCommands.length"
            :execution-feedback-message="props.executionFeedbackMessage"
            :execution-feedback-tone="props.executionFeedbackTone"
            @submit="onCommandPanelSubmit"
            @cancel="onCommandPanelCancel"
            @arg-input="(key, value) => emit('arg-input', key, value)"
            @toggle-staging="emit('toggle-staging')"
          />
        </Transition>

        <LauncherSafetyOverlay
          v-if="props.safetyDialog"
          :safety-dialog="props.safetyDialog"
          :executing="props.executing"
          @confirm-safety-execution="emit('confirm-safety-execution')"
          @cancel-safety-execution="emit('cancel-safety-execution')"
        />

        <LauncherFlowPanel
          v-if="props.stagingExpanded"
          :staging-drawer-state="props.stagingDrawerState"
          :staging-expanded="props.stagingExpanded"
          :staged-commands="props.stagedCommands"
          :staging-hints="props.stagingHints"
          :focus-zone="props.focusZone"
          :staging-active-index="props.stagingActiveIndex"
          :flow-open="props.navCurrentPage.type !== 'search'"
          :executing="props.executing"
          :execution-feedback-message="props.executionFeedbackMessage"
          :execution-feedback-tone="props.executionFeedbackTone"
          :set-staging-panel-ref="props.setStagingPanelRef"
          :set-staging-list-ref="props.setStagingListRef"
          @toggle-staging="emit('toggle-staging')"
          @staging-drag-start="(index, event) => emit('staging-drag-start', index, event)"
          @staging-drag-over="(index, event) => emit('staging-drag-over', index, event)"
          @staging-drag-end="emit('staging-drag-end')"
          @grip-reorder-active-change="emit('grip-reorder-active-change', $event)"
          @focus-staging-index="emit('focus-staging-index', $event)"
          @remove-staged-command="emit('remove-staged-command', $event)"
          @update-staged-arg="(id, key, value) => emit('update-staged-arg', id, key, value)"
          @clear-staging="emit('clear-staging')"
          @execute-staged="emit('execute-staged')"
          @flow-panel-height-change="emit('flow-panel-height-change')"
          @flow-panel-settled="emit('flow-panel-settled')"
          @execution-feedback="(t: 'neutral' | 'success' | 'error', m: string) => emit('execution-feedback', t, m)"
        />
      </div>
    </div>
  </main>
</template>
