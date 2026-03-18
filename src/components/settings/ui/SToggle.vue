<script setup lang="ts">
interface SToggleProps {
  modelValue: boolean;
  compact?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<SToggleProps>(), {
  compact: false,
  disabled: false
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

let ignoreNextKeyboardClick = false;

function toggle() {
  if (!props.disabled) {
    emit("update:modelValue", !props.modelValue);
  }
}

function onClick(e: MouseEvent) {
  if (ignoreNextKeyboardClick && e.detail === 0) {
    ignoreNextKeyboardClick = false;
    return;
  }
  toggle();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === " " || e.key === "Enter") {
    if (e.repeat) {
      return;
    }
    ignoreNextKeyboardClick = true;
    e.preventDefault();
    toggle();
  }
}
</script>

<template>
  <button
    type="button"
    role="switch"
    :class="[
      's-toggle',
      {
        's-toggle--on': modelValue,
        's-toggle--compact': compact,
        's-toggle--disabled': disabled
      }
    ]"
    :aria-checked="modelValue"
    :disabled="disabled"
    @click="onClick"
    @keydown="onKeydown"
  >
    <span class="s-toggle__track">
      <span class="s-toggle__thumb" />
    </span>
  </button>
</template>

<style scoped>
.s-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  padding: 0;
  cursor: pointer;
  background: transparent;
  transition: opacity 150ms cubic-bezier(0.33, 1, 0.68, 1);
  flex-shrink: 0;
}

.s-toggle__track {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 999px;
  background: var(--ui-settings-toggle-off);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
  transition:
    background 150ms cubic-bezier(0.33, 1, 0.68, 1),
    box-shadow 150ms cubic-bezier(0.33, 1, 0.68, 1);
}

.s-toggle--on .s-toggle__track {
  background: var(--ui-toggle-on);
}

.s-toggle__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--ui-settings-toggle-thumb);
  box-shadow:
    0 1px 4px rgba(0, 0, 0, 0.28),
    0 0 0 1px rgba(255, 255, 255, 0.08);
  transition: transform 150ms cubic-bezier(0.33, 1, 0.68, 1), background 150ms;
}

.s-toggle--on .s-toggle__thumb {
  transform: translateX(16px);
}

.s-toggle--compact .s-toggle__track {
  width: 30px;
  height: 17px;
}

.s-toggle--compact .s-toggle__thumb {
  top: 2px;
  width: 13px;
  height: 13px;
}

.s-toggle--compact.s-toggle--on .s-toggle__thumb {
  transform: translateX(13px);
}

.s-toggle--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.s-toggle:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--ui-settings-focus-ring);
}
</style>
