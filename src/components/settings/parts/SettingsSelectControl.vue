<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";

interface SettingsSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SettingsSelectControlProps {
  id: string;
  modelValue: string;
  options: SettingsSelectOption[];
  disabled?: boolean;
}

const props = withDefaults(defineProps<SettingsSelectControlProps>(), {
  disabled: false
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const rootRef = ref<HTMLElement | null>(null);
const open = ref(false);
const focusIndex = ref(-1);

const selectedIndex = computed(() => props.options.findIndex((item) => item.value === props.modelValue));
const selectedOption = computed(() => {
  const index = selectedIndex.value;
  if (index >= 0) {
    return props.options[index];
  }
  return props.options[0] ?? { value: "", label: "" };
});

function setFocusedIndex(index: number): void {
  if (props.options.length === 0) {
    focusIndex.value = -1;
    return;
  }
  const bounded = Math.min(Math.max(index, 0), props.options.length - 1);
  focusIndex.value = bounded;
}

function closeDropdown(): void {
  open.value = false;
  focusIndex.value = -1;
}

function openDropdown(): void {
  if (props.disabled || props.options.length === 0) {
    return;
  }
  open.value = true;
  setFocusedIndex(selectedIndex.value >= 0 ? selectedIndex.value : 0);
}

function toggleDropdown(): void {
  if (open.value) {
    closeDropdown();
    return;
  }
  openDropdown();
}

function selectValue(value: string): void {
  emit("update:modelValue", value);
  closeDropdown();
}

function onGlobalPointerDown(event: PointerEvent): void {
  if (!open.value) {
    return;
  }
  if (!(event.target instanceof Element)) {
    closeDropdown();
    return;
  }
  if (!rootRef.value?.contains(event.target)) {
    closeDropdown();
  }
}

function onButtonKeydown(event: KeyboardEvent): void {
  if (!open.value) {
    if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openDropdown();
      if (event.key === "ArrowUp") {
        setFocusedIndex(props.options.length - 1);
      }
    }
    return;
  }

  if (event.key === "Escape" || event.key === "Tab") {
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
  if (event.key === "Enter") {
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
      return;
    }
    document.removeEventListener("pointerdown", onGlobalPointerDown);
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onGlobalPointerDown);
});
</script>

<template>
  <div ref="rootRef" class="settings-select-wrap">
    <button
      :id="props.id"
      type="button"
      class="settings-select"
      :disabled="props.disabled || props.options.length === 0"
      :aria-expanded="open"
      @click="toggleDropdown"
      @keydown="onButtonKeydown"
    >
      <span class="settings-select__value">{{ selectedOption.label }}</span>
    </button>
    <span class="settings-select__arrow" :class="{ 'settings-select__arrow--open': open }" aria-hidden="true">⌄</span>
    <ul v-if="open" class="settings-select-list" role="listbox">
      <li v-for="(item, index) in props.options" :key="item.value">
        <button
          type="button"
          class="settings-select-list__item"
          :class="{
            'settings-select-list__item--active': item.value === props.modelValue,
            'settings-select-list__item--focused': index === focusIndex
          }"
          :aria-selected="item.value === props.modelValue"
          @click="selectValue(item.value)"
        >
          <span class="settings-select-list__label">{{ item.label }}</span>
          <span v-if="item.description" class="settings-select-list__path">{{ item.description }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>
