<script setup lang="ts">
import { toRef } from "vue";
import LauncherWindow from "./components/launcher/LauncherWindow.vue";
import { useAppCompositionRoot } from "./composables/app/useAppCompositionRoot";

const { launcherVm, settingsVm, appShellVm } = useAppCompositionRoot();

const availableTerminals = toRef(settingsVm, "availableTerminals");
const terminalLoading = toRef(settingsVm, "terminalLoading");

// 主入口只保留 Launcher 渲染；这里继续暴露 settings 兼容字段给既有测试与壳层契约。
function submitParamInput(): void {
  if (!launcherVm.submitParamInput()) {
    return;
  }
  launcherVm.requestCommandPanelExit();
}

defineExpose({
  availableTerminals,
  terminalLoading,
  submitParamInput
});
</script>

<template>
  <LauncherWindow
    :query="launcherVm.query"
    :executing="launcherVm.executing"
    :execution-feedback-message="launcherVm.executionFeedbackMessage"
    :execution-feedback-tone="launcherVm.executionFeedbackTone"
    :search-shell-style="launcherVm.searchShellStyle"
    :staging-expanded="launcherVm.stagingExpanded"
    :drawer-open="launcherVm.drawerOpen"
    :drawer-viewport-height="launcherVm.drawerViewportHeight"
    :keyboard-hints="launcherVm.keyboardHints"
    :filtered-results="launcherVm.filteredResults"
    :active-index="launcherVm.activeIndex"
    :staged-feedback-command-id="launcherVm.stagedFeedbackCommandId"
    :staged-commands="launcherVm.stagedCommands"
    :staging-drawer-state="launcherVm.stagingDrawerState"
    :staging-hints="launcherVm.stagingHints"
    :focus-zone="launcherVm.focusZone"
    :staging-active-index="launcherVm.stagingActiveIndex"
    :pending-command="launcherVm.pendingCommand"
    :pending-args="launcherVm.pendingArgs"
    :pending-arg-values="launcherVm.pendingArgValues"
    :pending-submit-hint="launcherVm.pendingSubmitHint"
    :pending-submit-mode="launcherVm.pendingSubmitMode"
    :safety-dialog="launcherVm.safetyDialog"
    :nav-current-page="launcherVm.navCurrentPage"
    :nav-can-go-back="launcherVm.navCanGoBack"
    :nav-push-page="launcherVm.navPushPage"
    :nav-pop-page="launcherVm.navPopPage"
    :nav-reset-to-search="launcherVm.navResetToSearch"
    :nav-stack="launcherVm.navStack"
    :set-search-shell-ref="launcherVm.setSearchShellRef"
    :set-search-input-ref="launcherVm.setSearchInputRef"
    :set-drawer-ref="launcherVm.setDrawerRef"
    :set-staging-panel-ref="launcherVm.setStagingPanelRef"
    :set-staging-list-ref="launcherVm.setStagingListRef"
    :set-result-button-ref="launcherVm.setResultButtonRef"
    :set-param-input-ref="launcherVm.setParamInputRef"
    @query-input="launcherVm.onQueryInput"
    @stage-result="launcherVm.stageResult"
    @execute-result="launcherVm.executeResult"
    @toggle-staging="launcherVm.toggleStaging"
    @staging-drag-start="launcherVm.onStagingDragStart"
    @staging-drag-over="launcherVm.onStagingDragOver"
    @staging-drag-end="launcherVm.onStagingDragEnd"
    @focus-staging-index="launcherVm.onFocusStagingIndex"
    @remove-staged-command="launcherVm.removeStagedCommand"
    @update-staged-arg="launcherVm.updateStagedArg"
    @clear-staging="launcherVm.clearStaging"
    @execute-staged="launcherVm.executeStaged"
    @grip-reorder-active-change="launcherVm.setStagingGripReorderActive"
    @submit-param-input="submitParamInput"
    @request-command-panel-exit="launcherVm.requestCommandPanelExit"
    @command-page-settled="launcherVm.notifyCommandPageSettled"
    @flow-panel-height-change="launcherVm.notifyFlowPanelHeightChange"
    @flow-panel-settled="launcherVm.notifyFlowPanelSettled"
    @search-page-settled="launcherVm.notifySearchPageSettled"
    @arg-input="launcherVm.updatePendingArgValue"
    @confirm-safety-execution="launcherVm.confirmSafetyExecution"
    @cancel-safety-execution="launcherVm.cancelSafetyExecution"
    @blank-pointerdown="appShellVm.hideMainWindow"
    @execution-feedback="appShellVm.setExecutionFeedback"
  />
</template>
