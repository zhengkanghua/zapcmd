import { watch, type Ref } from "vue";
import {
  DEFAULT_THEME_ID,
  THEME_REGISTRY,
} from "../../features/themes/themeRegistry";

export interface UseThemeOptions {
  themeId: Ref<string>;
  blurEnabled: Ref<boolean>;
}

function resolveThemeId(id: string): string {
  return THEME_REGISTRY.some((t) => t.id === id) ? id : DEFAULT_THEME_ID;
}

function applyTheme(id: string): void {
  document.documentElement.dataset.theme = resolveThemeId(id);
}

function applyBlur(enabled: boolean): void {
  document.documentElement.dataset.blur = enabled ? "on" : "off";
}

export function useTheme(options: UseThemeOptions) {
  watch(
    () => options.themeId.value,
    (id) => applyTheme(id),
    { immediate: true }
  );

  watch(
    () => options.blurEnabled.value,
    (enabled) => applyBlur(enabled),
    { immediate: true }
  );

  return {
    themes: THEME_REGISTRY,
  };
}
