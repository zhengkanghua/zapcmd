<script setup lang="ts">
import type {
  CommandArg,
  CommandTemplate
} from "../../features/commands/commandTemplates";
import { useI18nText } from "../../i18n";
import type { StagedCommand } from "../../features/launcher/types";
import { useLauncherHitZones } from "../../composables/launcher/useLauncherHitZones";
import LauncherParamOverlay from "./parts/LauncherParamOverlay.vue";
import LauncherSearchPanel from "./parts/LauncherSearchPanel.vue";
import LauncherSafetyOverlay from "./parts/LauncherSafetyOverlay.vue";
import type {
  ElementRefArg,
  FocusZone,
  LauncherSafetyDialog,
  ParamSubmitMode,
  StagingDrawerState
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
  keyboardHintText: string;
  filteredResults: CommandTemplate[];
  activeIndex: number;
  stagedFeedbackCommandId: string | null;
  stagedCommands: StagedCommand[];
  stagingDrawerState: StagingDrawerState;
  stagingHintText: string;
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
}>();

const { onRootPointerDown } = useLauncherHitZones({
  hideMainWindow: () => emit("blank-pointerdown")
});
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
        :keyboard-hint-text="props.keyboardHintText"
        :filtered-results="props.filteredResults"
        :active-index="props.activeIndex"
        :staged-feedback-command-id="props.stagedFeedbackCommandId"
        :staged-command-count="props.stagedCommands.length"
        :review-open="props.stagingExpanded"
        :staging-drawer-state="props.stagingDrawerState"
        :staged-commands="props.stagedCommands"
        :staging-hint-text="props.stagingHintText"
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
        @toggle-staging="emit('toggle-staging')"
        @staging-drag-start="(index, event) => emit('staging-drag-start', index, event)"
        @staging-drag-over="(index, event) => emit('staging-drag-over', index, event)"
        @staging-drag-end="emit('staging-drag-end')"
        @focus-staging-index="emit('focus-staging-index', $event)"
        @remove-staged-command="emit('remove-staged-command', $event)"
        @update-staged-arg="(id, key, value) => emit('update-staged-arg', id, key, value)"
        @clear-staging="emit('clear-staging')"
        @execute-staged="emit('execute-staged')"
      />
    </div>

    <LauncherParamOverlay
      :pending-command="props.pendingCommand"
      :pending-args="props.pendingArgs"
      :pending-arg-values="props.pendingArgValues"
      :pending-submit-hint="props.pendingSubmitHint"
      :pending-submit-mode="props.pendingSubmitMode"
      :set-param-input-ref="props.setParamInputRef"
      @submit-param-input="emit('submit-param-input')"
      @cancel-param-input="emit('cancel-param-input')"
      @update-pending-arg="(key, value) => emit('update-pending-arg', key, value)"
    />

    <LauncherSafetyOverlay
      :safety-dialog="props.safetyDialog"
      :executing="props.executing"
      @confirm-safety-execution="emit('confirm-safety-execution')"
      @cancel-safety-execution="emit('cancel-safety-execution')"
    />
  </main>
</template>
