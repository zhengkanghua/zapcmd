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
  <section class="settings-group settings-appearance grid gap-[24px]" aria-label="settings-appearance">
    <div class="appearance-cards grid gap-[16px] min-[620px]:grid-cols-2 min-[620px]:items-start">
      <div
        class="appearance-card appearance-card--theme grid gap-[10px] rounded-panel border border-settings-card-border bg-settings-card p-[14px] min-[620px]:col-span-2"
      >
        <div class="appearance-card__header flex items-baseline justify-between gap-[12px]">
          <h3 class="appearance-card__title m-0 text-[12px] font-[650] text-ui-text">
            {{ t("settings.appearance.themeLabel") }}
          </h3>
        </div>
        <div class="appearance-card__body">
          <div class="theme-selector flex flex-wrap gap-[10px]">
            <button
              v-for="themeMeta in props.themes"
              :key="themeMeta.id"
              type="button"
              :class="[
                'theme-card flex cursor-pointer flex-col items-center gap-[8px] rounded-ui border border-settings-card-border bg-[rgba(var(--ui-text-rgb),0.015)] p-[12px] transition-[border-color,background,transform] duration-150 hover:border-[rgba(var(--ui-text-rgb),0.16)] hover:bg-[rgba(var(--ui-text-rgb),0.03)] hover:-translate-y-[1px]',
                {
                  'theme-card--active border-ui-accent bg-[rgba(var(--ui-brand-rgb),0.08)]':
                    themeMeta.id === props.theme
                }
              ]"
              @click="emit('update-theme', themeMeta.id)"
            >
              <div class="theme-card__swatches flex gap-[4px]">
                <span
                  class="theme-card__swatch h-[24px] w-[24px] rounded-md border border-ui-border"
                  :style="{ background: themeMeta.preview.bg }"
                />
                <span
                  class="theme-card__swatch h-[24px] w-[24px] rounded-md border border-ui-border"
                  :style="{ background: themeMeta.preview.surface }"
                />
                <span
                  class="theme-card__swatch h-[24px] w-[24px] rounded-md border border-ui-border"
                  :style="{ background: themeMeta.preview.accent }"
                />
                <span
                  class="theme-card__swatch h-[24px] w-[24px] rounded-md border border-ui-border"
                  :style="{ background: themeMeta.preview.text }"
                />
              </div>
              <span class="theme-card__name text-[12px] text-ui-text">{{ themeMeta.name }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="appearance-card appearance-card--effects grid gap-[10px] rounded-panel border border-settings-card-border bg-settings-card p-[14px]">
        <div class="appearance-card__header flex items-baseline justify-between gap-[12px]">
          <h3 class="appearance-card__title m-0 text-[12px] font-[650] text-ui-text">
            {{ t("settings.appearance.blurLabel") }} / {{ t("settings.appearance.opacityLabel") }}
          </h3>
        </div>
        <div class="appearance-card__body appearance-effects grid gap-[14px]">
          <div class="appearance-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-[12px] settings-compact:grid-cols-1 settings-compact:items-start">
            <div class="appearance-row__text grid gap-[4px]">
              <p class="appearance-row__label m-0 text-[12px] leading-[1.35] text-ui-subtle">
                {{ t("settings.appearance.blurLabel") }}
              </p>
              <p class="appearance-row__hint m-0 text-[11px] leading-[1.45] text-settings-hint">
                {{ t("settings.appearance.blurHint") }}
              </p>
            </div>
            <div class="appearance-row__control flex items-center justify-end gap-[10px] settings-compact:justify-start">
              <SToggle
                :model-value="props.blurEnabled"
                @update:model-value="emit('update-blur-enabled', $event)"
              />
              <span class="appearance-row__value text-[12px] text-ui-subtle">
                {{ props.blurEnabled ? t("settings.appearance.blurOn") : t("settings.appearance.blurOff") }}
              </span>
            </div>
          </div>

          <div class="appearance-row appearance-row--slider grid grid-cols-1 items-start gap-[12px]">
            <div class="appearance-row__text grid gap-[4px]">
              <p class="appearance-row__label m-0 text-[12px] leading-[1.35] text-ui-subtle">
                {{ t("settings.appearance.opacityLabel") }}
              </p>
              <p class="appearance-row__hint m-0 text-[11px] leading-[1.45] text-settings-hint">
                {{ t("settings.appearance.opacityHint") }}
              </p>
            </div>
            <SSlider
              class="appearance-row__slider min-w-0 w-full"
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

      <div class="appearance-card appearance-card--preview grid gap-[10px] rounded-panel border border-settings-card-border bg-settings-card p-[14px]">
        <div class="appearance-card__header flex items-baseline justify-between gap-[12px]">
          <h3 class="appearance-card__title m-0 text-[12px] font-[650] text-ui-text">
            {{ t("settings.appearance.preview") }}
          </h3>
          <span class="appearance-card__meta text-[12px] font-bold text-ui-subtle [font-variant-numeric:tabular-nums]">
            {{ percentDisplay }}
          </span>
        </div>
        <div class="appearance-card__body">
          <div
            class="appearance-preview-wrap grid h-[96px] w-full place-items-center overflow-hidden rounded-surface border border-settings-row-border [background-image:var(--ui-settings-preview-checker)] [background-size:16px_16px]"
          >
            <div
              class="appearance-preview-panel flex h-[64px] w-[70%] flex-col items-center justify-center gap-[4px] rounded-surface border border-[rgba(var(--ui-text-rgb),0.14)] shadow-[0_4px_12px_rgba(var(--ui-black-rgb),0.25)]"
              :style="{ backgroundColor: `rgba(var(--ui-bg-rgb), ${props.windowOpacity})` }"
            >
              <span class="appearance-preview-text text-[16px] font-bold text-ui-text">ZapCmd</span>
              <span class="appearance-preview-sub text-[11px] text-ui-subtle [font-variant-numeric:tabular-nums]">
                {{ percentDisplay }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
