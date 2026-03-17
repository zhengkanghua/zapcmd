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
  <nav class="s-segment-nav" role="tablist" @keydown="onKeydown">
    <button
      v-for="item in items"
      :key="item.id"
      role="tab"
      type="button"
      :class="[
        's-segment-nav__tab',
        { 's-segment-nav__tab--active': modelValue === item.id }
      ]"
      :aria-selected="String(modelValue === item.id)"
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
  gap: 3px;
  padding: 3px;
  background: var(--ui-bg-soft);
  border-radius: 10px;
  width: fit-content;
  margin: 0 auto;
}

.s-segment-nav__tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  color: var(--ui-subtle);
  opacity: 0.55;
  font-size: 13px;
  transition: all 150ms cubic-bezier(0.33, 1, 0.68, 1);
}

.s-segment-nav__tab:hover {
  opacity: 0.8;
}

.s-segment-nav__tab--active {
  background: var(--ui-brand-soft);
  border-color: var(--ui-brand-dim);
  color: var(--ui-brand);
  opacity: 1;
  font-weight: 500;
}

.s-segment-nav__tab:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--ui-brand-soft);
}

.s-segment-nav__icon {
  font-size: 14px;
}

.s-segment-nav__label {
  font-size: 13px;
}
</style>
