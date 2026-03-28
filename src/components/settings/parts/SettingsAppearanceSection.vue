<script setup lang="ts">
import { computed } from "vue";
import type { MotionPresetMeta } from "../../../features/motion/motionRegistry";
import { useI18nText } from "../../../i18n";
import { MIN_WINDOW_OPACITY, MAX_WINDOW_OPACITY } from "../../../stores/settingsStore";
import type { ThemeMeta } from "../../../features/themes/themeRegistry";
import SToggle from "../ui/SToggle.vue";
import SSlider from "../ui/SSlider.vue";

const props = defineProps<{
  windowOpacity: number;
  theme: string;
  blurEnabled: boolean;
  motionPreset: string;
  themes: ReadonlyArray<ThemeMeta>;
  motionPresets: ReadonlyArray<MotionPresetMeta>;
}>();

const emit = defineEmits<{
  (e: "update-opacity", value: number): void;
  (e: "update-theme", value: string): void;
  (e: "update-motion-preset", value: string): void;
  (e: "update-blur-enabled", value: boolean): void;
}>();
const { t } = useI18nText();

const percentDisplay = computed(() =>
  t("settings.appearance.opacityValue", { value: Math.round(props.windowOpacity * 100) })
);

const formatOpacityValue = (v: number) => `${Math.round(v * 100)}%`;

function getMotionPresetName(id: string): string {
  return t(`settings.appearance.motionPresets.${id}.name`);
}

function getMotionPresetDescription(id: string): string {
  return t(`settings.appearance.motionPresets.${id}.description`);
}

function getMotionPresetBadge(id: string): string {
  return t(`settings.appearance.motionPresets.${id}.badge`);
}
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
              :data-theme-preview="themeMeta.id"
              :class="[
                'theme-card flex cursor-pointer flex-col items-center gap-[8px] rounded-ui border border-settings-card-border bg-ui-text/[0.015] p-[12px] transition-[border-color,background,transform] duration-150 hover:border-ui-text/16 hover:bg-ui-text/3 hover:-translate-y-[1px]',
                {
                  'theme-card--active border-ui-accent bg-ui-brand/8':
                    themeMeta.id === props.theme
                }
              ]"
              @click="emit('update-theme', themeMeta.id)"
            >
              <div class="theme-card__swatches flex gap-[4px]">
                <span
                  class="theme-card__swatch h-[24px] w-[24px] rounded-md border border-ui-border bg-ui-bg"
                />
                <span
                  class="theme-card__swatch h-[24px] w-[24px] rounded-md border border-ui-border bg-ui-surface"
                />
                <span
                  class="theme-card__swatch h-[24px] w-[24px] rounded-md border border-ui-border bg-ui-accent"
                />
                <span
                  class="theme-card__swatch h-[24px] w-[24px] rounded-md border border-ui-border bg-ui-text"
                />
              </div>
              <span class="theme-card__name text-[12px] text-ui-text">{{ themeMeta.name }}</span>
            </button>
          </div>
        </div>
      </div>

      <div
        class="appearance-card appearance-card--motion grid gap-[10px] rounded-panel border border-settings-card-border bg-settings-card p-[14px] min-[620px]:col-span-2"
      >
        <div class="appearance-card__header flex items-baseline justify-between gap-[12px]">
          <div class="grid gap-[4px]">
            <h3 class="appearance-card__title m-0 text-[12px] font-[650] text-ui-text">
              {{ t("settings.appearance.motionPresetLabel") }}
            </h3>
            <p class="appearance-card__hint m-0 text-[11px] leading-[1.45] text-settings-hint">
              {{ t("settings.appearance.motionPresetHint") }}
            </p>
          </div>
        </div>
        <div class="appearance-card__body">
          <div class="motion-selector grid gap-[10px] min-[620px]:grid-cols-2">
            <button
              v-for="motionMeta in props.motionPresets"
              :key="motionMeta.id"
              type="button"
              :class="[
                'motion-preset-card grid gap-[10px] rounded-panel border border-settings-card-border bg-ui-text/[0.015] p-[14px] text-left transition-[border-color,background,transform,box-shadow] duration-motion-press ease-motion-emphasized active:scale-motion-press-active hover:border-ui-text/16 hover:bg-ui-text/3 hover:-translate-y-[1px]',
                {
                  'motion-preset-card--active border-ui-accent bg-ui-brand/8 shadow-settings-focus':
                    motionMeta.id === props.motionPreset
                }
              ]"
              @click="emit('update-motion-preset', motionMeta.id)"
            >
              <div class="flex items-start justify-between gap-[12px]">
                <div class="grid gap-[4px]">
                  <span class="text-[13px] font-[650] text-ui-text">
                    {{ getMotionPresetName(motionMeta.id) }}
                  </span>
                  <span class="text-[11px] leading-[1.45] text-settings-hint">
                    {{ getMotionPresetDescription(motionMeta.id) }}
                  </span>
                </div>
                <span class="rounded-full border border-ui-text/10 bg-ui-text/6 px-[8px] py-[2px] text-[11px] font-[600] text-ui-subtle">
                  {{ getMotionPresetBadge(motionMeta.id) }}
                </span>
              </div>
              <span class="sr-only">{{ motionMeta.id }}</span>
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
            class="appearance-preview-wrap grid h-[96px] w-full place-items-center overflow-hidden rounded-surface border border-settings-row-border bg-settings-preview-checker [background-size:16px_16px]"
          >
            <div
              class="appearance-preview-panel flex h-[64px] w-[70%] flex-col items-center justify-center gap-[4px] rounded-surface border border-ui-text/14 shadow-settings-preview-panel shadow-ui-black/25"
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
