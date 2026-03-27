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
  stretch?: boolean;
}

const props = withDefaults(defineProps<SDropdownProps>(), {
  variant: "default",
  disabled: false,
  stretch: false
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
  <div class="s-dropdown relative inline-flex" :class="{ 'w-full': props.stretch }">
    <button
      ref="triggerRef"
      type="button"
      class="s-dropdown__trigger inline-flex min-h-[34px] cursor-pointer items-center justify-between gap-2 rounded-surface transition-settings-interactive duration-150 ease-settings-emphasized focus-visible:outline-none focus-visible:shadow-settings-focus disabled:cursor-not-allowed disabled:opacity-50"
      :class="
        props.variant === 'ghost'
          ? [
              's-dropdown__trigger--ghost min-w-0 border border-transparent bg-settings-badge px-2.5 py-1.5 text-settings-badge-text hover:bg-settings-dropdown-hover hover:text-ui-text',
              props.stretch ? 'w-full' : 'w-auto'
            ]
          : 's-dropdown__trigger--default w-full min-w-[180px] border border-settings-dropdown-border bg-settings-dropdown px-2.5 py-[7px] text-ui-text hover:border-ui-control-muted-hover-border'
      "
      :disabled="props.disabled || props.options.length === 0"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :aria-controls="open ? listboxId : undefined"
      :aria-activedescendant="open && focusIndex >= 0 ? `${listboxId}-option-${focusIndex}` : undefined"
      @click="toggleDropdown"
      @keydown="onTriggerKeydown"
    >
      <span class="s-dropdown__value flex-1 min-w-0 truncate text-left text-[12.5px] leading-[1.35]">
        {{ selectedOption.label }}
      </span>
      <span class="s-dropdown__arrow inline-flex text-current opacity-[0.78]" aria-hidden="true">
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
      <div
        v-if="open"
        ref="panelRef"
        class="s-dropdown__panel pointer-events-auto"
        :style="panelStyle"
      >
        <ul
          :id="listboxId"
          class="s-dropdown__list m-0 list-none rounded-[12px] border border-settings-dropdown-border bg-settings-dropdown p-[6px] shadow-ui backdrop-blur-ui"
          role="listbox"
        >
          <li v-for="(item, index) in props.options" :key="item.value" class="s-dropdown__item m-0 p-0">
            <button
              :id="`${listboxId}-option-${index}`"
              type="button"
              role="option"
              class="s-dropdown__option grid w-full cursor-pointer grid-cols-[16px_minmax(0,1fr)] items-start gap-2 rounded-surface border border-transparent bg-transparent px-2.5 py-2 text-left text-ui-text"
              :class="{
                's-dropdown__option--focused bg-settings-dropdown-hover': index === focusIndex,
                's-dropdown__option--selected border-ui-brand/20 bg-ui-brand/8':
                  item.value === props.modelValue
              }"
              :aria-selected="item.value === props.modelValue"
              @click="selectValue(item.value)"
            >
              <span class="s-dropdown__check text-[12px] leading-[1.2] text-ui-brand" aria-hidden="true">
                {{ item.value === props.modelValue ? "✓" : "" }}
              </span>
              <span class="s-dropdown__content grid gap-[2px]">
                <span class="s-dropdown__label text-[12.5px] leading-[1.35]">{{ item.label }}</span>
                <span v-if="item.description" class="s-dropdown__description text-[11px] leading-[1.35] text-ui-subtle">
                  {{ item.description }}
                </span>
                <span v-if="item.meta" class="s-dropdown__meta text-[11px] leading-[1.35] text-ui-subtle">
                  {{ item.meta }}
                </span>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>
