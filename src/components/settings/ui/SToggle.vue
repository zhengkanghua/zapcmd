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
      's-toggle inline-flex min-w-[36px] min-h-[36px] shrink-0 items-center justify-center border-0 bg-transparent p-0 transition-opacity duration-150 ease-settings-emphasized cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-settings-focus',
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
    <span
      :class="[
        's-toggle__track relative rounded-full shadow-settings-toggle-track transition-settings-toggle-track duration-150 ease-settings-emphasized',
        compact ? 'w-[30px] h-[17px]' : 'w-[36px] h-[20px]',
        modelValue ? 'bg-settings-toggle-on' : 'bg-settings-toggle-off'
      ]"
    >
      <span
        :class="[
          's-toggle__thumb absolute left-[2px] top-[2px] rounded-full bg-settings-toggle-thumb shadow-settings-toggle-thumb transition-settings-toggle-thumb duration-150 ease-settings-emphasized',
          compact ? 'w-[13px] h-[13px]' : 'w-[16px] h-[16px]',
          modelValue ? (compact ? 'translate-x-[13px]' : 'translate-x-[16px]') : ''
        ]"
      />
    </span>
  </button>
</template>
