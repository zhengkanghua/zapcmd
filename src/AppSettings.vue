<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useSettingsStore } from "./stores/settingsStore";
import { useTheme } from "./composables/app/useTheme";
import SettingsWindow from "./components/settings/SettingsWindow.vue";

const settingsStore = useSettingsStore();
const { theme, blurEnabled, windowOpacity } = storeToRefs(settingsStore);

useTheme({ themeId: theme, blurEnabled });

// TODO: Task 11 将在此处集成即时保存版 useSettingsWindow
</script>

<template>
  <SettingsWindow />
</template>
