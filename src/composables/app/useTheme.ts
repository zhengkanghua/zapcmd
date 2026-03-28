import { watch, type Ref } from "vue";
import {
  THEME_REGISTRY
} from "../../features/themes/themeRegistry";
import { applyBlurState, applyThemeState } from "../../features/themes/appearanceBootstrap";

export interface UseThemeOptions {
  themeId: Ref<string>;
  blurEnabled: Ref<boolean>;
}

function applyTheme(id: string): void {
  applyThemeState(id);
}

function applyBlur(enabled: boolean): void {
  applyBlurState(enabled);
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
    themes: THEME_REGISTRY
  };
}
