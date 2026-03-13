<script setup lang="ts">
import type {
  CommandArg,
  CommandTemplate
} from "../../features/commands/commandTemplates";
import { useI18nText } from "../../i18n";
import type { StagedCommand } from "../../features/launcher/types";
import { useLauncherHitZones } from "../../composables/launcher/useLauncherHitZones";
import LauncherSearchPanel from "./parts/LauncherSearchPanel.vue";
import LauncherFlowDrawer from "./parts/LauncherFlowDrawer.vue";
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
  drawerFloorViewportHeight: number;
  drawerFillerHeight: number;
  keyboardHints: KeyboardHint[];
  filteredResults: CommandTemplate[];
  activeIndex: number;
  stagedFeedbackCommandId: string | null;
  stagedCommands: StagedCommand[];
  stagingDrawerState: StagingDrawerState;
  stagingHints: KeyboardHint[];
  stagingListShouldScroll: boolean;
  stagingListMaxHeight: string;
  focusZone: FocusZone;
  stagingActiveIndex: number;
  pendingCommand: CommandTemplate | null;
  pendingArgs: CommandArg[];
  pendingArgValues: Record<string, string>;
  pendingSubmitHint: string;
  pendingSubmitMode: ParamSubmitMode;
  safetyDialog: LauncherSafetyDialog | null;
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
  (e: "focus-staging-index", index: number): void;
  (e: "remove-staged-command", id: string): void;
  (e: "update-staged-arg", id: string, key: string, value: string): void;
  (e: "clear-staging"): void;
  (e: "execute-staged"): void;
  (e: "submit-param-input"): void;
  (e: "cancel-param-input"): void;
  (e: "update-pending-arg", key: string, value: string): void;
  (e: "confirm-safety-execution"): void;
  (e: "cancel-safety-execution"): void;
  (e: "blank-pointerdown"): void;
  (e: "execution-feedback", tone: "neutral" | "success" | "error", message: string): void;
}>();

const { onRootPointerDown } = useLauncherHitZones({
  hideMainWindow: () => emit("blank-pointerdown")
});

function onSearchCapsuleBack(): void {
  if (props.safetyDialog) {
    emit("cancel-safety-execution");
    return;
  }
  if (props.pendingCommand) {
    emit("cancel-param-input");
    return;
  }
  if (props.stagingExpanded) {
    emit("toggle-staging");
  }
}
</script>

<template>
  <main class="launcher-root" @pointerdown.capture="onRootPointerDown">
    <div
      :ref="props.setSearchShellRef"
      class="search-shell"
      :style="props.searchShellStyle"
      role="application"
      :aria-label="t('app.launcherAriaLabel')"
    >
      <div
        class="shell-drag-strip"
        data-hit-zone="drag"
        data-tauri-drag-region
        aria-hidden="true"
      ></div>

      <LauncherSearchPanel
        :query="props.query"
        :executing="props.executing"
        :execution-feedback-message="props.executionFeedbackMessage"
        :execution-feedback-tone="props.executionFeedbackTone"
        :drawer-open="props.drawerOpen"
        :drawer-viewport-height="props.drawerViewportHeight"
        :drawer-floor-viewport-height="props.drawerFloorViewportHeight"
        :drawer-filler-height="props.drawerFillerHeight"
        :keyboard-hints="props.keyboardHints"
        :filtered-results="props.filteredResults"
        :active-index="props.activeIndex"
        :staged-feedback-command-id="props.stagedFeedbackCommandId"
        :staged-command-count="props.stagedCommands.length"
        :flow-open="Boolean(props.pendingCommand || props.safetyDialog)"
        :review-open="props.stagingExpanded"
        :staging-drawer-state="props.stagingDrawerState"
        :staged-commands="props.stagedCommands"
        :staging-hints="props.stagingHints"
        :staging-list-should-scroll="props.stagingListShouldScroll"
        :staging-list-max-height="props.stagingListMaxHeight"
        :focus-zone="props.focusZone"
        :staging-active-index="props.stagingActiveIndex"
        :set-search-input-ref="props.setSearchInputRef"
        :set-drawer-ref="props.setDrawerRef"
        :set-result-button-ref="props.setResultButtonRef"
        :set-staging-panel-ref="props.setStagingPanelRef"
        :set-staging-list-ref="props.setStagingListRef"
        @query-input="emit('query-input', $event)"
        @stage-result="emit('stage-result', $event)"
        @execute-result="emit('execute-result', $event)"
        @toggle-staging="emit('toggle-staging')"
        @search-capsule-back="onSearchCapsuleBack"
        @staging-drag-start="(index, event) => emit('staging-drag-start', index, event)"
        @staging-drag-over="(index, event) => emit('staging-drag-over', index, event)"
        @staging-drag-end="emit('staging-drag-end')"
        @focus-staging-index="emit('focus-staging-index', $event)"
        @remove-staged-command="emit('remove-staged-command', $event)"
        @update-staged-arg="(id, key, value) => emit('update-staged-arg', id, key, value)"
        @clear-staging="emit('clear-staging')"
        @execute-staged="emit('execute-staged')"
        @execution-feedback="(t, m) => emit('execution-feedback', t, m)"
      >
        <template #content-overlays>
          <LauncherFlowDrawer
            :pending-command="props.pendingCommand"
            :pending-args="props.pendingArgs"
            :pending-arg-values="props.pendingArgValues"
            :pending-submit-hint="props.pendingSubmitHint"
            :pending-submit-mode="props.pendingSubmitMode"
            :set-param-input-ref="props.setParamInputRef"
            :safety-dialog="props.safetyDialog"
            :review-open="props.stagingExpanded"
            :executing="props.executing"
            @submit-param-input="emit('submit-param-input')"
            @cancel-param-input="emit('cancel-param-input')"
            @update-pending-arg="(key, value) => emit('update-pending-arg', key, value)"
            @confirm-safety-execution="emit('confirm-safety-execution')"
            @cancel-safety-execution="emit('cancel-safety-execution')"
          />
        </template>
      </LauncherSearchPanel>
    </div>
  </main>
</template>
