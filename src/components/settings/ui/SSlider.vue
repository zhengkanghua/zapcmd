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
  <div class="s-slider" :style="sliderStyle">
    <input
      class="s-slider__input"
      type="range"
      :min="props.min"
      :max="props.max"
      :step="props.step"
      :value="props.modelValue"
      @input="onInput"
    />
    <span v-if="props.showValue" class="s-slider__value">{{ displayValue }}</span>
  </div>
</template>

<style scoped>
.s-slider {
  display: flex;
  align-items: center;
  gap: 12px;
}

.s-slider__input {
  flex: 1;
  height: 6px;
  appearance: none;
  background: linear-gradient(
    90deg,
    var(--ui-brand) 0%,
    var(--ui-brand) var(--fill-percent),
    var(--ui-border) var(--fill-percent),
    var(--ui-border) 100%
  );
  border-radius: 999px;
  outline: none;
}

.s-slider__input::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--ui-brand);
  border: 2px solid var(--ui-bg);
  box-shadow: 0 0 0 3px var(--ui-brand-soft);
}

.s-slider__input::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--ui-brand);
  border: 2px solid var(--ui-bg);
  box-shadow: 0 0 0 3px var(--ui-brand-soft);
}

.s-slider__value {
  min-width: 44px;
  text-align: right;
  color: var(--ui-subtle);
  font-size: 12px;
}
</style>

