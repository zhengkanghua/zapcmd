<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";

interface SFilterChipOption {
  value: string;
  label: string;
}

interface SFilterChipProps {
  modelValue: string;
  options: SFilterChipOption[];
  defaultValue: string;
}

const props = defineProps<SFilterChipProps>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const listboxId = `s-filter-chip-listbox-${Math.random().toString(36).slice(2)}`;

const triggerRef = ref<HTMLButtonElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);

const open = ref(false);
const panelStyle = ref<Record<string, string>>({});

const isActive = computed(() => props.modelValue !== props.defaultValue);

const selectedOption = computed(() => {
  const current = props.options.find((item) => item.value === props.modelValue);
  if (current) {
    return current;
  }
  const fallback = props.options.find((item) => item.value === props.defaultValue);
  return fallback ?? props.options[0] ?? { value: props.modelValue, label: props.modelValue };
});

function syncPanelPosition(): void {
  const trigger = triggerRef.value;
  if (!trigger) {
    panelStyle.value = {};
    return;
  }

  const rect = trigger.getBoundingClientRect();
  const gap = 6;

  panelStyle.value = {
    position: "fixed",
    top: `${Math.round(rect.bottom + gap)}px`,
    left: `${Math.round(rect.left)}px`,
    width: `${Math.round(rect.width)}px`,
    zIndex: "9999"
  };
}

function closeDropdown(): void {
  open.value = false;
}

function openDropdown(): void {
  open.value = true;
  void nextTick(() => {
    syncPanelPosition();
  });
}

function toggleDropdown(): void {
  if (open.value) {
    closeDropdown();
    return;
  }
  openDropdown();
}

function isEventInside(event: PointerEvent): boolean {
  if (!(event.target instanceof Element)) {
    return false;
  }
  return (
    triggerRef.value?.contains(event.target) === true ||
    panelRef.value?.contains(event.target) === true
  );
}

function onGlobalPointerDown(event: PointerEvent): void {
  if (!open.value) {
    return;
  }
  if (!isEventInside(event)) {
    closeDropdown();
  }
}

function clearValue(event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
  emit("update:modelValue", props.defaultValue);
  closeDropdown();
}

function selectValue(value: string): void {
  emit("update:modelValue", value);
  closeDropdown();
}

watch(
  open,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener("pointerdown", onGlobalPointerDown);
      window.addEventListener("resize", syncPanelPosition);
      window.addEventListener("scroll", syncPanelPosition, true);
      return;
    }
    document.removeEventListener("pointerdown", onGlobalPointerDown);
    window.removeEventListener("resize", syncPanelPosition);
    window.removeEventListener("scroll", syncPanelPosition, true);
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onGlobalPointerDown);
  window.removeEventListener("resize", syncPanelPosition);
  window.removeEventListener("scroll", syncPanelPosition, true);
});
</script>

<template>
  <div :class="['s-filter-chip', { 's-filter-chip--active': isActive }]">
    <button
      ref="triggerRef"
      type="button"
      class="s-filter-chip__trigger"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :aria-controls="open ? listboxId : undefined"
      @click="toggleDropdown"
    >
      <span class="s-filter-chip__label">{{ selectedOption.label }}</span>
      <span class="s-filter-chip__arrow" aria-hidden="true">⌄</span>
    </button>

    <button
      v-if="isActive"
      type="button"
      class="s-filter-chip__clear"
      aria-label="清除筛选"
      @click="clearValue"
    >
      ×
    </button>

    <Teleport to="body">
      <div v-if="open" ref="panelRef" class="s-filter-chip__panel" :style="panelStyle">
        <ul :id="listboxId" class="s-filter-chip__list" role="listbox">
          <li v-for="option in props.options" :key="option.value" class="s-filter-chip__item">
            <button
              type="button"
              role="option"
              class="s-filter-chip__option"
              :class="{ 's-filter-chip__option--active': option.value === props.modelValue }"
              :aria-selected="option.value === props.modelValue"
              @click="selectValue(option.value)"
            >
              <span class="s-filter-chip__check" aria-hidden="true">
                {{ option.value === props.modelValue ? "✓" : "" }}
              </span>
              <span class="s-filter-chip__option-label">{{ option.label }}</span>
            </button>
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.s-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.s-filter-chip__trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--ui-border);
  background: var(--ui-bg-soft);
  color: var(--ui-subtle);
  cursor: pointer;
  transition: all 150ms cubic-bezier(0.33, 1, 0.68, 1);
}

.s-filter-chip--active .s-filter-chip__trigger {
  background: var(--ui-brand-soft);
  border-color: var(--ui-brand-dim);
  color: var(--ui-brand);
}

.s-filter-chip__trigger:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--ui-brand-soft);
}

.s-filter-chip__arrow {
  color: var(--ui-subtle);
  font-size: 12px;
  line-height: 1;
}

.s-filter-chip__clear {
  border: 1px solid var(--ui-border);
  border-radius: 999px;
  background: var(--ui-bg-soft);
  color: var(--ui-subtle);
  width: 22px;
  height: 22px;
  line-height: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 150ms cubic-bezier(0.33, 1, 0.68, 1);
}

.s-filter-chip--active .s-filter-chip__clear {
  border-color: var(--ui-brand-dim);
  color: var(--ui-brand);
}

.s-filter-chip__panel {
  pointer-events: auto;
}

.s-filter-chip__list {
  margin: 0;
  padding: 6px;
  list-style: none;
  border-radius: 12px;
  border: 1px solid var(--ui-border);
  background: var(--ui-surface);
  box-shadow: var(--ui-shadow);
}

.s-filter-chip__option {
  width: 100%;
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--ui-text);
  cursor: pointer;
  text-align: left;
}

.s-filter-chip__option--active {
  background: var(--ui-brand-soft);
  border-color: var(--ui-brand-dim);
}

.s-filter-chip__check {
  color: var(--ui-brand);
  font-size: 12px;
  line-height: 1;
}
</style>

