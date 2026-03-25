<script setup lang="ts">
import { splitHighlight } from "../../../features/launcher/highlight";

const props = defineProps<{
  text: string;
  query: string;
}>();
</script>

<template>
  <template v-for="(part, partIndex) in splitHighlight(props.text, props.query)" :key="partIndex">
    <mark
      v-if="part.match"
      class="result-item__hl p-0 bg-transparent text-[var(--ui-search-hl)] font-bold"
      >{{ part.text }}</mark
    >
    <span v-else>{{ part.text }}</span>
  </template>
</template>
