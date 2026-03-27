<script setup lang="ts">
import { computed } from "vue";

interface SSliderProps {
  modelValue: number;
  min: number;
  max: number;
  step: number;
  showValue?: boolean;
  formatValue?: (v: number) => string;
}

const props = withDefaults(defineProps<SSliderProps>(), {
  showValue: false
});

const emit = defineEmits<{
  (e: "update:modelValue", value: number): void;
}>();

const fillPercent = computed(() => {
  const range = props.max - props.min;
  if (!Number.isFinite(range) || range <= 0) {
    return 0;
  }
  const raw = ((props.modelValue - props.min) / range) * 100;
  if (!Number.isFinite(raw)) {
    return 0;
  }
  return Math.min(100, Math.max(0, raw));
});

const sliderStyle = computed(() => ({
  "--fill-percent": `${fillPercent.value}%`
}));

const displayValue = computed(() => {
  if (!props.showValue) {
    return "";
  }
  if (typeof props.formatValue === "function") {
    return props.formatValue(props.modelValue);
  }
  return String(props.modelValue);
});

function onInput(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  emit("update:modelValue", Number(target.value));
}
</script>

<template>
  <div class="s-slider flex items-center gap-[12px]" :style="sliderStyle">
    <input
      class="s-slider__input flex-1 h-[6px] appearance-none rounded-full outline-none bg-settings-slider-fill"
      type="range"
      :min="props.min"
      :max="props.max"
      :step="props.step"
      :value="props.modelValue"
      @input="onInput"
    />
    <span
      v-if="props.showValue"
      class="s-slider__value min-w-[44px] text-right text-[12px] text-ui-subtle"
    >
      {{ displayValue }}
    </span>
  </div>
</template>
