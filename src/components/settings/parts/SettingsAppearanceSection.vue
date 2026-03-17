<script setup lang="ts">
import { computed } from "vue";
import { useI18nText } from "../../../i18n";
import { MIN_WINDOW_OPACITY, MAX_WINDOW_OPACITY } from "../../../stores/settingsStore";
import type { ThemeMeta } from "../../../features/themes/themeRegistry";
import SToggle from "../ui/SToggle.vue";
import SSlider from "../ui/SSlider.vue";

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

const formatOpacityValue = (v: number) => `${Math.round(v * 100)}%`;
</script>

<template>
  <section class="settings-group settings-appearance" aria-labelledby="settings-group-appearance">
    <h2 id="settings-group-appearance">{{ t("settings.appearance.title") }}</h2>

    <div class="appearance-cards">
      <div class="appearance-card appearance-card--theme">
        <div class="appearance-card__header">
          <h3 class="appearance-card__title">{{ t("settings.appearance.themeLabel") }}</h3>
        </div>
        <div class="appearance-card__body">
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
      </div>

      <div class="appearance-card appearance-card--effects">
        <div class="appearance-card__header">
          <h3 class="appearance-card__title">
            {{ t("settings.appearance.blurLabel") }} / {{ t("settings.appearance.opacityLabel") }}
          </h3>
        </div>
        <div class="appearance-card__body appearance-effects">
          <div class="appearance-row">
            <div class="appearance-row__text">
              <p class="appearance-row__label">{{ t("settings.appearance.blurLabel") }}</p>
              <p class="appearance-row__hint">{{ t("settings.appearance.blurHint") }}</p>
            </div>
            <div class="appearance-row__control">
              <SToggle
                :model-value="props.blurEnabled"
                @update:model-value="emit('update-blur-enabled', $event)"
              />
              <span class="appearance-row__value">
                {{ props.blurEnabled ? t("settings.appearance.blurOn") : t("settings.appearance.blurOff") }}
              </span>
            </div>
          </div>

          <div class="appearance-row appearance-row--slider">
            <div class="appearance-row__text">
              <p class="appearance-row__label">{{ t("settings.appearance.opacityLabel") }}</p>
              <p class="appearance-row__hint">{{ t("settings.appearance.opacityHint") }}</p>
            </div>
            <SSlider
              class="appearance-row__slider"
              :model-value="props.windowOpacity"
              :min="MIN_WINDOW_OPACITY"
              :max="MAX_WINDOW_OPACITY"
              :step="0.01"
              show-value
              :format-value="formatOpacityValue"
              @update:model-value="emit('update-opacity', $event)"
            />
          </div>
        </div>
      </div>

      <div class="appearance-card appearance-card--preview">
        <div class="appearance-card__header">
          <h3 class="appearance-card__title">{{ t("settings.appearance.preview") }}</h3>
          <span class="appearance-card__meta">{{ percentDisplay }}</span>
        </div>
        <div class="appearance-card__body">
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
      </div>
    </div>
  </section>
</template>

<style scoped>
.appearance-cards {
  display: grid;
  gap: 10px;
}

.appearance-card {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.035);
  display: grid;
  gap: 10px;
}

.appearance-card__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.appearance-card__title {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  color: rgba(255, 255, 255, 0.92);
}

.appearance-card__meta {
  font-size: 12px;
  font-weight: 700;
  color: var(--ui-subtle);
  font-variant-numeric: tabular-nums;
}

.appearance-effects {
  display: grid;
  gap: 12px;
}

.appearance-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.appearance-row--slider {
  align-items: start;
}

.appearance-row__text {
  display: grid;
  gap: 4px;
}

.appearance-row__label {
  margin: 0;
  font-size: 12px;
  color: var(--ui-subtle);
  line-height: 1.35;
}

.appearance-row__hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.6);
}

.appearance-row__control {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.appearance-row__slider {
  min-width: 220px;
}

.appearance-row__value {
  font-size: 12px;
  color: var(--ui-subtle);
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

@media (min-width: 620px) {
  .appearance-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .appearance-card--theme {
    grid-column: 1 / -1;
  }
}

@media (max-width: 520px) {
  .appearance-row {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .appearance-row__control {
    justify-content: flex-start;
  }

  .appearance-row__slider {
    min-width: 0;
  }
}
</style>
