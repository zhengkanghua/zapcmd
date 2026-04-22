<script setup lang="ts">
import LauncherWindow from "./components/launcher/LauncherWindow.vue";
import { useLauncherEntry } from "./composables/app/useAppCompositionRoot/launcherEntry";

const { launcherVm, launcherCompatVm, appShellVm } = useLauncherEntry();

// 主入口只保留 Launcher 渲染；这里继续暴露 settings 兼容字段给既有测试与壳层契约。
function submitParamInput(): void {
  if (!launcherVm.actions.submitParamInput()) {
    return;
  }
  launcherVm.actions.requestCommandPanelExit();
}

defineExpose({
  availableTerminals: launcherCompatVm.availableTerminals,
  terminalLoading: launcherCompatVm.terminalLoading,
  submitParamInput
});
</script>

<template>
  <LauncherWindow :launcher-vm="launcherVm" @blank-pointerdown="appShellVm.hideMainWindow" @execution-feedback="appShellVm.setExecutionFeedback" />
</template>
