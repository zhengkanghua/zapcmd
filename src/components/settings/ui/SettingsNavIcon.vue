<script setup lang="ts">
import type { SettingsNavIconName } from "./settingsNavIcon";

const props = defineProps<{
  name: SettingsNavIconName;
}>();
</script>

<template>
  <svg
    class="settings-nav-icon block h-[15px] w-[15px]"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <g stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <template v-if="props.name === 'hotkeys'">
        <rect x="3.5" y="6" width="17" height="12" rx="2.5" />
        <path d="M7.5 10.5h.01" />
        <path d="M10.5 10.5h.01" />
        <path d="M13.5 10.5h3" />
        <path d="M7.5 14h9" />
      </template>

      <template v-else-if="props.name === 'general'">
        <circle cx="12" cy="12" r="3.2" />
        <path d="M12 4.2v2.1" />
        <path d="M12 17.7v2.1" />
        <path d="M19.8 12h-2.1" />
        <path d="M6.3 12H4.2" />
        <path d="M17.5 6.5l-1.5 1.5" />
        <path d="M8 16l-1.5 1.5" />
        <path d="M17.5 17.5L16 16" />
        <path d="M8 8 6.5 6.5" />
      </template>

      <template v-else-if="props.name === 'commands'">
        <path d="M8 7h11" />
        <path d="M8 12h11" />
        <path d="M8 17h11" />
        <circle cx="5" cy="7" r="1" fill="currentColor" stroke="none" />
        <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="5" cy="17" r="1" fill="currentColor" stroke="none" />
      </template>

      <template v-else-if="props.name === 'appearance'">
        <path d="M12 4.5l1.8 4.2 4.2 1.8-4.2 1.8L12 16.5l-1.8-4.2L6 10.5l4.2-1.8Z" />
        <path d="M18 4.5v2" />
        <path d="M19 5.5h-2" />
      </template>

      <template v-else>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 10v5" />
        <circle cx="12" cy="7" r="1" fill="currentColor" stroke="none" />
      </template>
    </g>
  </svg>
</template>
