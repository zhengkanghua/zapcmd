<script setup lang="ts">
import type { SettingsRoute } from "../../../features/settings/types";
import type { SettingsNavProps } from "../types";

const props = defineProps<SettingsNavProps>();

const emit = defineEmits<{
  (e: "navigate", route: SettingsRoute): void;
}>();
</script>

<template>
  <nav class="settings-nav" aria-label="settings-navigation">
    <button
      v-for="item in props.settingsNavItems"
      :key="item.route"
      type="button"
      class="settings-nav__item"
      :class="{
        'settings-nav__item--active': props.settingsRoute === item.route,
        'settings-nav__item--error': props.settingsErrorRoute === item.route
      }"
      :data-route="item.route"
      :title="item.label"
      :aria-label="item.label"
      :aria-current="props.settingsRoute === item.route ? 'page' : undefined"
      :aria-invalid="props.settingsErrorRoute === item.route ? 'true' : undefined"
      @click="emit('navigate', item.route)"
    >
      <span class="settings-nav__label">{{ item.label }}</span>
    </button>
  </nav>
</template>
