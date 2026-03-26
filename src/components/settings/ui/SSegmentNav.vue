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
  <nav
    class="s-segment-nav flex justify-center gap-2.5 w-fit max-w-[min(100%,720px)] mx-auto pt-2 pb-2.5"
    role="tablist"
    aria-label="Settings sections"
    @keydown="onKeydown"
  >
    <button
      v-for="item in items"
      :key="item.id"
      role="tab"
      type="button"
      :class="[
        's-segment-nav__tab',
        'flex items-center gap-[7px] min-h-[34px] px-4 py-2 rounded-surface border border-transparent bg-transparent cursor-pointer whitespace-nowrap text-[13px] font-medium text-[color:var(--ui-settings-segment-tab-text)] hover:bg-settings-table-row-hover hover:text-[color:var(--ui-settings-segment-tab-text-hover)] transition-[color,background-color] duration-130 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--ui-brand-soft)]',
        modelValue === item.id
          ? 's-segment-nav__tab--active bg-settings-segment-tab-active text-[color:var(--ui-settings-segment-tab-text-active)] font-semibold'
          : ''
      ]"
      :aria-selected="modelValue === item.id"
      :tabindex="modelValue === item.id ? 0 : -1"
      @click="emit('update:modelValue', item.id)"
    >
      <span class="s-segment-nav__icon text-[15px] leading-none">{{ item.icon }}</span>
      <span class="s-segment-nav__label text-[13px]">{{ item.label }}</span>
    </button>
  </nav>
</template>
