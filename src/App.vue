<script setup lang="ts">
import { toRef } from "vue";
import LauncherWindow from "./components/launcher/LauncherWindow.vue";
import { useAppCompositionRoot } from "./composables/app/useAppCompositionRoot";

const { launcherVm, settingsVm, appShellVm } = useAppCompositionRoot();

const availableTerminals = toRef(settingsVm, "availableTerminals");
const terminalLoading = toRef(settingsVm, "terminalLoading");

// 主入口只保留 Launcher 渲染；这里继续暴露 settings 兼容字段给既有测试与壳层契约。
function submitParamInput(): void {
  if (!launcherVm.actions.submitParamInput()) {
    return;
  }
  launcherVm.actions.requestCommandPanelExit();
}

defineExpose({
  availableTerminals,
  terminalLoading,
  submitParamInput
});
</script>

<template>
  <LauncherWindow :launcher-vm="launcherVm" @blank-pointerdown="appShellVm.hideMainWindow" @execution-feedback="appShellVm.setExecutionFeedback" />
</template>
