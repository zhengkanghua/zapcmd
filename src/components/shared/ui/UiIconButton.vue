<script setup lang="ts">
import { computed, ref } from "vue";

type UiButtonVariant = "muted" | "primary" | "stage" | "success" | "danger";
type UiButtonSize = "default" | "small";
type UiFocusOptions = { preventScroll?: boolean };

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
  /**
   * Tailwind class 必须可静态分析（避免动态拼接导致 content 扫描漏抓）。
   * 这里用“枚举表”明确列出每个 variant/size 的 class 组合。
   */
  const variantClasses: Record<UiButtonVariant, Array<string>> = {
    muted: [
      "border",
      "border-transparent",
      "rounded-control",
      "bg-[var(--ui-bg-soft)]",
      "text-[var(--ui-text)]",
      "cursor-pointer",
      "enabled:hover:bg-[var(--ui-control-muted-hover-bg)]",
      "enabled:hover:border-[var(--ui-control-muted-hover-border)]"
    ],
    primary: [
      "border",
      "rounded-control",
      "bg-gradient-to-b",
      "from-[rgba(var(--ui-brand-rgb),0.9)]",
      "to-[rgba(var(--ui-brand-rgb),0.82)]",
      "border-[rgba(var(--ui-brand-rgb),0.45)]",
      "text-[var(--ui-accent-text)]",
      "font-bold",
      "cursor-pointer",
      "enabled:hover:brightness-[1.04]",
      "disabled:opacity-[0.56]",
      "disabled:cursor-default"
    ],
    stage: [
      "border",
      "rounded-control",
      "bg-gradient-to-b",
      "from-[rgba(var(--ui-search-hl-rgb),0.92)]",
      "to-[rgba(var(--ui-search-hl-rgb),0.82)]",
      "border-[rgba(var(--ui-search-hl-rgb),0.5)]",
      "text-[var(--ui-accent-text)]",
      "font-bold",
      "cursor-pointer",
      "enabled:hover:brightness-[1.04]",
      "disabled:opacity-[0.56]",
      "disabled:cursor-default"
    ],
    success: [
      "border",
      "rounded-control",
      "bg-gradient-to-b",
      "from-[rgba(var(--ui-success-rgb),0.9)]",
      "to-[rgba(var(--ui-success-rgb),0.82)]",
      "border-[rgba(var(--ui-success-rgb),0.45)]",
      "text-[var(--ui-accent-text)]",
      "font-bold",
      "cursor-pointer",
      "enabled:hover:brightness-[1.04]",
      "disabled:opacity-[0.56]",
      "disabled:cursor-default"
    ],
    danger: [
      "border",
      "rounded-control",
      "bg-[rgba(var(--ui-danger-rgb),0.1)]",
      "border-[rgba(var(--ui-danger-rgb),0.2)]",
      "text-[var(--ui-danger)]",
      "cursor-pointer",
      "transition-all",
      "duration-150",
      "ease-[ease]",
      "enabled:hover:bg-[rgba(var(--ui-danger-rgb),0.18)]",
      "enabled:hover:border-[rgba(var(--ui-danger-rgb),0.35)]"
    ]
  };

  const sizeClasses: Record<UiButtonSize, Array<string>> = {
    default: ["min-w-7", "min-h-7", "p-1.5", "inline-flex", "items-center", "justify-center"],
    small: [
      "min-w-[26px]",
      "min-h-[26px]",
      "p-[5px]",
      "inline-flex",
      "items-center",
      "justify-center"
    ]
  };

  return [...variantClasses[props.variant], ...sizeClasses[props.size]];
});

/**
 * 允许父组件在打开后把焦点落到按钮上，保证键盘可达性。
 */
function focus(options?: UiFocusOptions): void {
  buttonRef.value?.focus(options);
}

defineExpose({ focus });

/**
 * `disabled` 时阻止 click 继续冒泡/透传，避免父组件误触发后续逻辑。
 */
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
