<script setup lang="ts">
export type LauncherIconName = "search" | "queue" | "x" | "copy" | "trash";

const props = withDefaults(
  defineProps<{
    name: LauncherIconName;
    size?: number;
    strokeWidth?: number;
  }>(),
  {
    size: 16,
    strokeWidth: 2
  }
);
</script>

<template>
  <svg
    class="launcher-icon"
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <g
      stroke="currentColor"
      :stroke-width="props.strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <template v-if="props.name === 'search'">
        <circle cx="11" cy="11" r="7" />
        <path d="M16 16l5 5" />
      </template>

      <template v-else-if="props.name === 'queue'">
        <circle cx="4" cy="6" r="1" />
        <circle cx="4" cy="12" r="1" />
        <circle cx="4" cy="18" r="1" />
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
      </template>

      <template v-else-if="props.name === 'x'">
        <path d="M6 6l12 12" />
        <path d="M18 6L6 18" />
      </template>

      <template v-else-if="props.name === 'copy'">
        <rect x="9" y="9" width="12" height="12" rx="2" />
        <path d="M7 15H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v1" />
      </template>

      <template v-else-if="props.name === 'trash'">
        <path d="M4 6h16" />
        <path d="M10 6V4h4v2" />
        <path d="M7 6l1 14h8l1-14" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </template>
    </g>
  </svg>
</template>

