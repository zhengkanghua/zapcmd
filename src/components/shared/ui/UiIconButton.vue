<script setup lang="ts">
import { computed, ref } from "vue";

type UiButtonVariant = "muted" | "primary" | "stage" | "success" | "danger";
type UiButtonSize = "default" | "small";

const props = withDefaults(
  defineProps<{
    ariaLabel: string;
    variant?: UiButtonVariant;
    size?: UiButtonSize;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
  }>(),
  {
    variant: "muted",
    size: "default",
    disabled: false,
    type: "button"
  }
);

const emit = defineEmits<{
  (e: "click", event: MouseEvent): void;
}>();

const buttonRef = ref<HTMLButtonElement | null>(null);

const buttonClass = computed(() => {
  const classes: Array<string> = ["btn-icon", `btn-${props.variant}`];

  if (props.size === "small") {
    classes.push("btn-small");
  }

  return classes;
});

function focus() {
  buttonRef.value?.focus();
}

defineExpose({ focus });

function onClick(event: MouseEvent) {
  if (props.disabled) {
    event.preventDefault();
    return;
  }
  emit("click", event);
}
</script>

<template>
  <button
    ref="buttonRef"
    :type="props.type"
    :class="buttonClass"
    :disabled="props.disabled"
    :aria-label="props.ariaLabel"
    @click="onClick"
  >
    <slot />
  </button>
</template>
