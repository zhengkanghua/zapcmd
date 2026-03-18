<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";

interface SSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SSelectProps {
  modelValue: string;
  options: SSelectOption[];
  disabled?: boolean;
}

const props = withDefaults(defineProps<SSelectProps>(), {
  disabled: false
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const listboxId = `s-select-listbox-${Math.random().toString(36).slice(2)}`;

const triggerRef = ref<HTMLButtonElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);

const open = ref(false);
const focusIndex = ref(-1);

const selectedIndex = computed(() =>
  props.options.findIndex((item) => item.value === props.modelValue)
);
const selectedOption = computed(() => {
  const index = selectedIndex.value;
  if (index >= 0) {
    return props.options[index];
  }
  return props.options[0] ?? { value: "", label: "" };
});

const panelStyle = ref<Record<string, string>>({});

function setFocusedIndex(index: number): void {
  if (props.options.length === 0) {
    focusIndex.value = -1;
    return;
  }
  const bounded = Math.min(Math.max(index, 0), props.options.length - 1);
  focusIndex.value = bounded;
}

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
  focusIndex.value = -1;
}

async function openDropdown(): Promise<void> {
  if (props.disabled || props.options.length === 0) {
    return;
  }
  open.value = true;
  setFocusedIndex(selectedIndex.value >= 0 ? selectedIndex.value : 0);
  await nextTick();
  syncPanelPosition();
}

function toggleDropdown(): void {
  if (open.value) {
    closeDropdown();
    return;
  }
  void openDropdown();
}

function selectValue(value: string): void {
  emit("update:modelValue", value);
  closeDropdown();
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

function onTriggerKeydown(event: KeyboardEvent): void {
  if (!open.value) {
    if (
      event.key === "Enter" ||
      event.key === " " ||
      event.key === "ArrowDown" ||
      event.key === "ArrowUp"
    ) {
      event.preventDefault();
      void openDropdown();
      if (event.key === "ArrowUp") {
        setFocusedIndex(props.options.length - 1);
      }
    }
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    closeDropdown();
    return;
  }
  if (event.key === "Tab") {
    closeDropdown();
    return;
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    setFocusedIndex(focusIndex.value + 1);
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    setFocusedIndex(focusIndex.value - 1);
    return;
  }
  if (event.key === "Home") {
    event.preventDefault();
    setFocusedIndex(0);
    return;
  }
  if (event.key === "End") {
    event.preventDefault();
    setFocusedIndex(props.options.length - 1);
    return;
  }
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    const option = props.options[focusIndex.value];
    if (option) {
      selectValue(option.value);
    }
  }
}

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) {
      closeDropdown();
    }
  }
);

watch(
  () => props.modelValue,
  () => {
    if (open.value) {
      setFocusedIndex(selectedIndex.value >= 0 ? selectedIndex.value : 0);
    }
  }
);

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
  <div class="s-select">
    <button
      ref="triggerRef"
      type="button"
      class="s-select__trigger"
      :disabled="props.disabled || props.options.length === 0"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :aria-controls="open ? listboxId : undefined"
      :aria-activedescendant="open && focusIndex >= 0 ? `${listboxId}-option-${focusIndex}` : undefined"
      @click="toggleDropdown"
      @keydown="onTriggerKeydown"
    >
      <span class="s-select__value">{{ selectedOption.label }}</span>
      <span class="s-select__arrow" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M7 10l5 5 5-5"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
    </button>

    <Teleport to="body">
      <div v-if="open" ref="panelRef" class="s-select__panel" :style="panelStyle">
        <ul :id="listboxId" class="s-select__list" role="listbox">
          <li v-for="(item, index) in props.options" :key="item.value" class="s-select__item">
            <button
              :id="`${listboxId}-option-${index}`"
              type="button"
              role="option"
              class="s-select__option"
              :class="{
                's-select__option--active': item.value === props.modelValue,
                's-select__option--focused': index === focusIndex
              }"
              :aria-selected="item.value === props.modelValue"
              @click="selectValue(item.value)"
            >
              <span class="s-select__check" aria-hidden="true">
                {{ item.value === props.modelValue ? "✓" : "" }}
              </span>
              <span class="s-select__label">{{ item.label }}</span>
              <span v-if="item.description" class="s-select__description">
                {{ item.description }}
              </span>
            </button>
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.s-select {
  position: relative;
  display: inline-flex;
}

.s-select__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  min-width: 160px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--ui-border);
  background: var(--ui-input-bg);
  color: var(--ui-text);
  cursor: pointer;
  transition:
    border-color 150ms cubic-bezier(0.33, 1, 0.68, 1),
    box-shadow 150ms cubic-bezier(0.33, 1, 0.68, 1);
}

.s-select__trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.s-select__trigger:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--ui-brand-soft);
  border-color: var(--ui-brand-dim);
}

.s-select__value {
  flex: 1;
  text-align: left;
}

.s-select__arrow {
  display: inline-flex;
  color: var(--ui-subtle);
}

.s-select__panel {
  pointer-events: auto;
}

.s-select__list {
  margin: 0;
  padding: 6px;
  list-style: none;
  border-radius: 12px;
  border: 1px solid var(--ui-border);
  background: var(--ui-surface);
  box-shadow: var(--ui-shadow);
}

.s-select__item {
  margin: 0;
  padding: 0;
}

.s-select__option {
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

.s-select__option--focused {
  background: var(--ui-bg-soft);
  border-color: var(--ui-border-light);
}

.s-select__option--active {
  background: var(--ui-brand-soft);
  border-color: var(--ui-brand-dim);
}

.s-select__check {
  color: var(--ui-brand);
  font-size: 12px;
  line-height: 1;
}

.s-select__label {
  font-size: 13px;
}

.s-select__description {
  grid-column: 2;
  color: var(--ui-subtle);
  font-size: 11px;
  line-height: 1.2;
  margin-top: 2px;
}
</style>
