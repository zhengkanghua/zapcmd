<script setup lang="ts">
import { computed } from "vue";

type UiButtonVariant = "muted" | "primary" | "stage" | "success" | "danger";
type UiButtonSize = "default" | "small";

const props = withDefaults(
  defineProps<{
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

const buttonClass = computed(() => {
  const classes: Array<string> = [`btn-${props.variant}`];

  if (props.size === "small") {
    classes.push("btn-small");
  }

  return classes;
});

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
    :type="props.type"
    :class="buttonClass"
    :disabled="props.disabled"
    @click="onClick"
  >
    <slot />
  </button>
</template>

