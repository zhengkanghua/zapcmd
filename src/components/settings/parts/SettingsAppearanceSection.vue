<script setup lang="ts">
import { computed } from "vue";
import { useI18nText } from "../../../i18n";
import { MIN_WINDOW_OPACITY, MAX_WINDOW_OPACITY } from "../../../stores/settingsStore";
import type { ThemeMeta } from "../../../features/themes/themeRegistry";

const props = defineProps<{
  windowOpacity: number;
  theme: string;
  blurEnabled: boolean;
  themes: ReadonlyArray<ThemeMeta>;
}>();

const emit = defineEmits<{
  (e: "update-opacity", value: number): void;
  (e: "update-theme", value: string): void;
  (e: "update-blur-enabled", value: boolean): void;
}>();
const { t } = useI18nText();

const percentDisplay = computed(() =>
  t("settings.appearance.opacityValue", { value: Math.round(props.windowOpacity * 100) })
);

function onSliderInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit("update-opacity", Number(target.value));
}
</script>

<template>
  <section class="settings-group">
    <h2>{{ t("settings.appearance.title") }}</h2>

    <!-- 主题选择 -->
    <div class="settings-field">
      <label>{{ t("settings.appearance.themeLabel") }}</label>
      <div class="theme-selector">
        <button
          v-for="themeMeta in props.themes"
          :key="themeMeta.id"
          type="button"
          class="theme-card"
          :class="{ 'theme-card--active': themeMeta.id === props.theme }"
          @click="emit('update-theme', themeMeta.id)"
        >
          <div class="theme-card__swatches">
            <span class="theme-card__swatch" :style="{ background: themeMeta.preview.bg }" />
            <span class="theme-card__swatch" :style="{ background: themeMeta.preview.surface }" />
            <span class="theme-card__swatch" :style="{ background: themeMeta.preview.accent }" />
            <span class="theme-card__swatch" :style="{ background: themeMeta.preview.text }" />
          </div>
          <span class="theme-card__name">{{ themeMeta.name }}</span>
        </button>
      </div>
    </div>

    <!-- 毛玻璃开关 -->
    <div class="settings-field">
      <label>{{ t("settings.appearance.blurLabel") }}</label>
      <div class="appearance-toggle-row">
        <button
          type="button"
          class="appearance-toggle"
          :class="{ 'appearance-toggle--on': props.blurEnabled }"
          role="switch"
          :aria-checked="props.blurEnabled"
          @click="emit('update-blur-enabled', !props.blurEnabled)"
        >
          <span class="appearance-toggle__thumb" />
        </button>
        <span class="appearance-toggle-label">
          {{ props.blurEnabled
            ? t("settings.appearance.blurOn")
            : t("settings.appearance.blurOff") }}
        </span>
      </div>
      <p class="settings-hint">{{ t("settings.appearance.blurHint") }}</p>
    </div>

    <div class="settings-field">
      <label>{{ t("settings.appearance.opacityLabel") }}</label>
      <div class="appearance-slider-row">
        <input
          type="range"
          class="appearance-slider"
          :min="MIN_WINDOW_OPACITY"
          :max="MAX_WINDOW_OPACITY"
          step="0.01"
          :value="props.windowOpacity"
          @input="onSliderInput"
        />
        <span class="appearance-slider-value">{{ percentDisplay }}</span>
      </div>
      <p class="settings-hint">{{ t("settings.appearance.opacityHint") }}</p>
    </div>

    <div class="settings-field">
      <label>{{ t("settings.appearance.preview") }}</label>
      <div class="appearance-preview-wrap">
        <div
          class="appearance-preview-panel"
          :style="{ backgroundColor: `rgba(var(--theme-bg-rgb), ${props.windowOpacity})` }"
        >
          <span class="appearance-preview-text">ZapCmd</span>
          <span class="appearance-preview-sub">{{ percentDisplay }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.appearance-slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.appearance-slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.appearance-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--ui-accent);
  border: 2px solid var(--ui-bg-deep);
  cursor: grab;
}

.appearance-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--ui-accent);
  border: 2px solid var(--ui-bg-deep);
  cursor: grab;
}

.appearance-slider-value {
  min-width: 44px;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  color: var(--ui-text);
  font-variant-numeric: tabular-nums;
}

.appearance-preview-wrap {
  width: 100%;
  height: 120px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-image: repeating-conic-gradient(
    rgba(255, 255, 255, 0.08) 0% 25%,
    transparent 0% 50%
  );
  background-size: 16px 16px;
  display: grid;
  place-items: center;
}

.appearance-preview-panel {
  width: 70%;
  height: 72px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.appearance-preview-text {
  font-size: 16px;
  font-weight: 700;
  color: #f5f5f5;
}

.appearance-preview-sub {
  font-size: 11px;
  color: #a1a1aa;
  font-variant-numeric: tabular-nums;
}

.theme-selector {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.theme-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 2px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: transparent;
  cursor: pointer;
  transition: border-color 0.15s;
}

.theme-card:hover {
  border-color: var(--ui-subtle);
}

.theme-card--active {
  border-color: var(--ui-accent);
}

.theme-card__swatches {
  display: flex;
  gap: 4px;
}

.theme-card__swatch {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid var(--ui-border);
}

.theme-card__name {
  font-size: 12px;
  color: var(--ui-text);
}

.appearance-toggle-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.appearance-toggle {
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: var(--ui-toggle-off);
  border: none;
  cursor: pointer;
  padding: 0;
  transition: background-color 0.2s;
}

.appearance-toggle--on {
  background: var(--ui-toggle-on);
}

.appearance-toggle__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--ui-text);
  transition: transform 0.2s;
}

.appearance-toggle--on .appearance-toggle__thumb {
  transform: translateX(18px);
}

.appearance-toggle-label {
  font-size: 13px;
  color: var(--ui-subtle);
}
</style>
