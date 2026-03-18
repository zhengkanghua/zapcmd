<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";

type DropdownVariant = "default" | "ghost";

interface DropdownOption {
  value: string;
  label: string;
  description?: string;
  meta?: string;
}

interface SDropdownProps {
  modelValue: string;
  options: DropdownOption[];
  variant?: DropdownVariant;
  disabled?: boolean;
}

const props = withDefaults(defineProps<SDropdownProps>(), {
  variant: "default",
  disabled: false
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const listboxId = `s-dropdown-listbox-${Math.random().toString(36).slice(2)}`;

const triggerRef = ref<HTMLButtonElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const open = ref(false);
const focusIndex = ref(-1);
const panelStyle = ref<Record<string, string>>({});

const selectedIndex = computed(() =>
  props.options.findIndex((item) => item.value === props.modelValue)
);

const selectedOption = computed(() => {
  const selected = props.options[selectedIndex.value];
  return selected ?? props.options[0] ?? { value: "", label: "" };
});

function setFocusedIndex(index: number): void {
  if (props.options.length === 0) {
    focusIndex.value = -1;
    return;
  }

  focusIndex.value = Math.min(Math.max(index, 0), props.options.length - 1);
}

function syncFocusedOptionIntoView(): void {
  if (!open.value || focusIndex.value < 0) {
    return;
  }

  const option = document.getElementById(`${listboxId}-option-${focusIndex.value}`);
  option?.scrollIntoView?.({ block: "nearest" });
}

function syncPanelPosition(): void {
  const trigger = triggerRef.value;
  if (!trigger) {
    panelStyle.value = {};
    return;
  }

  const rect = trigger.getBoundingClientRect();
  const minWidth =
    props.variant === "ghost" ? Math.max(Math.round(rect.width), 160) : Math.round(rect.width);

  panelStyle.value = {
    position: "fixed",
    top: `${Math.round(rect.bottom + 6)}px`,
    left: `${Math.round(rect.left)}px`,
    minWidth: `${minWidth}px`,
    zIndex: "var(--ui-settings-z-popover)"
  };
}

function closeDropdown(): void {
  open.value = false;
  focusIndex.value = -1;
}

async function openDropdown(initialIndex?: number): Promise<void> {
  if (props.disabled || props.options.length === 0) {
    return;
  }

  open.value = true;
  setFocusedIndex(initialIndex ?? (selectedIndex.value >= 0 ? selectedIndex.value : 0));
  await nextTick();
  syncPanelPosition();
  syncFocusedOptionIntoView();
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
  if (open.value && !isEventInside(event)) {
    closeDropdown();
  }
}

function onTriggerKeydown(event: KeyboardEvent): void {
  if (!open.value) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      void openDropdown(selectedIndex.value >= 0 ? selectedIndex.value + 1 : 0);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      void openDropdown(props.options.length - 1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void openDropdown();
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

function toggleDropdown(): void {
  if (open.value) {
    closeDropdown();
    return;
  }

  void openDropdown();
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

watch(focusIndex, async (index) => {
  if (!open.value || index < 0) {
    return;
  }

  await nextTick();
  syncFocusedOptionIntoView();
});

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
  <div class="s-dropdown">
    <button
      ref="triggerRef"
      type="button"
      class="s-dropdown__trigger"
      :class="`s-dropdown__trigger--${props.variant}`"
      :disabled="props.disabled || props.options.length === 0"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :aria-controls="open ? listboxId : undefined"
      :aria-activedescendant="open && focusIndex >= 0 ? `${listboxId}-option-${focusIndex}` : undefined"
      @click="toggleDropdown"
      @keydown="onTriggerKeydown"
    >
      <span class="s-dropdown__value">{{ selectedOption.label }}</span>
      <span class="s-dropdown__arrow" aria-hidden="true">
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
      <div v-if="open" ref="panelRef" class="s-dropdown__panel" :style="panelStyle">
        <ul :id="listboxId" class="s-dropdown__list" role="listbox">
          <li v-for="(item, index) in props.options" :key="item.value" class="s-dropdown__item">
            <button
              :id="`${listboxId}-option-${index}`"
              type="button"
              role="option"
              class="s-dropdown__option"
              :class="{
                's-dropdown__option--selected': item.value === props.modelValue,
                's-dropdown__option--focused': index === focusIndex
              }"
              :aria-selected="item.value === props.modelValue"
              @click="selectValue(item.value)"
            >
              <span class="s-dropdown__check" aria-hidden="true">
                {{ item.value === props.modelValue ? "✓" : "" }}
              </span>
              <span class="s-dropdown__content">
                <span class="s-dropdown__label">{{ item.label }}</span>
                <span v-if="item.description" class="s-dropdown__description">{{ item.description }}</span>
                <span v-if="item.meta" class="s-dropdown__meta">{{ item.meta }}</span>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.s-dropdown {
  position: relative;
  display: inline-flex;
}

.s-dropdown__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 34px;
  border-radius: 10px;
  cursor: pointer;
  transition:
    background 150ms cubic-bezier(0.33, 1, 0.68, 1),
    border-color 150ms cubic-bezier(0.33, 1, 0.68, 1),
    box-shadow 150ms cubic-bezier(0.33, 1, 0.68, 1),
    color 150ms cubic-bezier(0.33, 1, 0.68, 1);
}

.s-dropdown__trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.s-dropdown__trigger:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--ui-settings-focus-ring);
}

.s-dropdown__trigger--default {
  width: 100%;
  min-width: 180px;
  padding: 7px 10px;
  border: 1px solid var(--ui-settings-dropdown-border);
  background: var(--ui-settings-dropdown-bg);
  color: var(--ui-text);
}

.s-dropdown__trigger--default:hover {
  border-color: rgba(255, 255, 255, 0.12);
}

.s-dropdown__trigger--ghost {
  min-width: 0;
  width: auto;
  padding: 6px 10px;
  border: 1px solid transparent;
  background: var(--ui-settings-badge-bg);
  color: var(--ui-settings-badge-text);
}

.s-dropdown__trigger--ghost:hover {
  background: var(--ui-settings-dropdown-hover);
  color: var(--ui-text);
}

.s-dropdown__value {
  flex: 1 1 auto;
  min-width: 0;
  text-align: left;
  font-size: 12.5px;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.s-dropdown__arrow {
  display: inline-flex;
  color: currentColor;
  opacity: 0.78;
}

.s-dropdown__panel {
  pointer-events: auto;
}

.s-dropdown__list {
  margin: 0;
  padding: 6px;
  list-style: none;
  border-radius: 12px;
  border: 1px solid var(--ui-settings-dropdown-border);
  background: var(--ui-settings-dropdown-bg);
  box-shadow: var(--ui-shadow);
  backdrop-filter: blur(var(--ui-blur));
}

.s-dropdown__item {
  margin: 0;
  padding: 0;
}

.s-dropdown__option {
  width: 100%;
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--ui-text);
  text-align: left;
  cursor: pointer;
}

.s-dropdown__option--focused {
  background: var(--ui-settings-dropdown-hover);
}

.s-dropdown__option--selected {
  border-color: rgba(var(--ui-brand-rgb), 0.2);
  background: rgba(var(--ui-brand-rgb), 0.08);
}

.s-dropdown__check {
  color: var(--ui-brand);
  font-size: 12px;
  line-height: 1.2;
}

.s-dropdown__content {
  display: grid;
  gap: 2px;
}

.s-dropdown__label {
  font-size: 12.5px;
  line-height: 1.35;
}

.s-dropdown__description,
.s-dropdown__meta {
  font-size: 11px;
  line-height: 1.35;
  color: var(--ui-subtle);
}
</style>
