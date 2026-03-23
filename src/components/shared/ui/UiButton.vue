<script setup lang="ts">
import { computed, ref } from "vue";

import {
  uiButtonDisabledClasses,
  uiButtonVariantBaseClasses,
  type UiButtonSize,
  type UiButtonVariant
} from "./buttonPrimitives";

type UiFocusOptions = { preventScroll?: boolean };

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

const buttonRef = ref<HTMLButtonElement | null>(null);

const buttonClass = computed(() => {
  /**
   * Tailwind class 必须可静态分析（避免动态拼接导致 content 扫描漏抓）。
   * 这里用“枚举表”明确列出每个 variant/size 的 class 组合，并避免互相冲突的 utilities 叠加覆盖。
   */
  const sizeClasses: Record<UiButtonVariant, Record<UiButtonSize, Array<string>>> = {
    muted: {
      default: ["px-2.5", "py-1.5", "text-[12px]"],
      small: ["px-2", "py-1", "text-[11px]"]
    },
    primary: {
      default: ["px-3", "py-1.5", "text-[12px]"],
      small: ["px-2", "py-1", "text-[11px]"]
    },
    stage: {
      default: ["px-3", "py-1.5", "text-[12px]"],
      small: ["px-2", "py-1", "text-[11px]"]
    },
    success: {
      default: ["px-3", "py-1.5", "text-[12px]"],
      small: ["px-2", "py-1", "text-[11px]"]
    },
    danger: {
      default: ["px-2.5", "py-1.5", "text-[12px]"],
      small: ["px-2", "py-1", "text-[11px]"]
    }
  };

  return [
    ...uiButtonVariantBaseClasses[props.variant],
    ...uiButtonDisabledClasses,
    ...sizeClasses[props.variant][props.size]
  ];
});

/**
 * 允许父组件（例如对话框）在打开后把焦点落到按钮上，保证键盘可达性。
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
    @click="onClick"
  >
    <slot />
  </button>
</template>
