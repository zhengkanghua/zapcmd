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

function toggle() {
  if (!props.disabled) {
    emit("update:modelValue", !props.modelValue);
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === " " || e.key === "Enter") {
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
    :aria-checked="String(modelValue)"
    :disabled="disabled"
    @click="toggle"
    @keydown="onKeydown"
  >
    <span class="s-toggle__thumb" />
  </button>
</template>

<style scoped>
.s-toggle {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  border: none;
  padding: 0;
  cursor: pointer;
  background: var(--ui-toggle-off);
  transition: background 150ms cubic-bezier(0.33, 1, 0.68, 1);
  flex-shrink: 0;
}

.s-toggle--on {
  background: var(--ui-toggle-on);
}

.s-toggle__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--ui-text-muted, #71717a);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 150ms cubic-bezier(0.33, 1, 0.68, 1), background 150ms;
}

.s-toggle--on .s-toggle__thumb {
  transform: translateX(16px);
  background: white;
}

.s-toggle--compact {
  width: 30px;
  height: 17px;
}

.s-toggle--compact .s-toggle__thumb {
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
  box-shadow: 0 0 0 2px var(--ui-brand-soft);
}
</style>

