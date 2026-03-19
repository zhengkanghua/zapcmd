<script setup lang="ts">
import { computed } from "vue";

interface SegmentNavItem {
  id: string;
  label: string;
  icon: string;
}

const props = defineProps<{
  items: SegmentNavItem[];
  modelValue: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const activeIndex = computed(() =>
  props.items.findIndex((item) => item.id === props.modelValue)
);

function onKeydown(e: KeyboardEvent) {
  if (props.items.length === 0) {
    return;
  }

  const idx = activeIndex.value;
  const currentIndex = idx >= 0 ? idx : 0;

  let next: number;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    next = (currentIndex + 1) % props.items.length;
  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    next = (currentIndex - 1 + props.items.length) % props.items.length;
  } else if (e.key === "Home") {
    next = 0;
  } else if (e.key === "End") {
    next = props.items.length - 1;
  } else {
    return;
  }
  e.preventDefault();
  emit("update:modelValue", props.items[next].id);
}
</script>

<template>
  <nav class="s-segment-nav" role="tablist" aria-label="Settings sections" @keydown="onKeydown">
    <button
      v-for="item in items"
      :key="item.id"
      role="tab"
      type="button"
      :class="[
        's-segment-nav__tab',
        { 's-segment-nav__tab--active': modelValue === item.id }
      ]"
      :aria-selected="modelValue === item.id"
      :tabindex="modelValue === item.id ? 0 : -1"
      @click="emit('update:modelValue', item.id)"
    >
      <span class="s-segment-nav__icon">{{ item.icon }}</span>
      <span class="s-segment-nav__label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.s-segment-nav {
  display: flex;
  justify-content: center;
  gap: 6px;
  width: fit-content;
  max-width: min(100%, 720px);
  margin: 0 auto;
  padding: 6px 0 0;
}

.s-segment-nav__tab {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.58);
  font-size: 13px;
  font-weight: 500;
  transition: all 130ms ease;
  white-space: nowrap;
}

.s-segment-nav__tab:hover {
  color: rgba(255, 255, 255, 0.82);
  background: rgba(255, 255, 255, 0.04);
}

.s-segment-nav__tab--active {
  background: var(--ui-settings-tab-active-bg);
  border-color: var(--ui-settings-tab-active-border);
  color: rgba(255, 255, 255, 0.95);
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.14);
}

.s-segment-nav__tab:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--ui-brand-soft);
}

.s-segment-nav__icon {
  font-size: 15px;
  line-height: 1;
}

.s-segment-nav__label {
  font-size: 13px;
}
</style>
