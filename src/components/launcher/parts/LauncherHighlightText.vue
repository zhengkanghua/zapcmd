<script setup lang="ts">
import { computed } from "vue";

import { splitHighlight } from "../../../features/launcher/highlight";

const props = defineProps<{
  text: string;
  query: string;
}>();

const parts = computed(() => splitHighlight(props.text, props.query));
</script>

<template>
  <template v-for="(part, partIndex) in parts" :key="partIndex">
    <mark
      v-if="part.match"
      class="result-item__hl p-0 bg-transparent text-ui-search-hl font-bold"
      >{{ part.text }}</mark
    >
    <span v-else>{{ part.text }}</span>
  </template>
</template>
