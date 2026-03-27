import { watch, type Ref } from "vue";
import {
  THEME_REGISTRY,
  resolveThemeMeta,
} from "../../features/themes/themeRegistry";

export interface UseThemeOptions {
  themeId: Ref<string>;
  blurEnabled: Ref<boolean>;
}

function applyTheme(id: string): void {
  const theme = resolveThemeMeta(id);
  document.documentElement.dataset.theme = theme.id;
  document.documentElement.style.colorScheme = theme.colorScheme;
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
