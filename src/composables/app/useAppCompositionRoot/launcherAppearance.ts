import { watch, type Ref } from "vue";
import { setAppLocale } from "../../../i18n";
import { useMotionPreset } from "../useMotionPreset";
import { useTheme } from "../useTheme";

interface BindLauncherAppearanceStateOptions {
  language: Ref<string>;
  windowOpacity: Ref<number>;
  theme: Ref<string>;
  blurEnabled: Ref<boolean>;
  motionPreset: Ref<string>;
}

/**
 * Launcher 外观副作用集中在一个入口，避免主题/语言/透明度逻辑继续散落在装配层。
 */
export function bindLauncherAppearanceState(
  options: BindLauncherAppearanceStateOptions
): void {
  watch(
    () => options.language.value,
    (value) => {
      setAppLocale(value);
    },
    { immediate: true }
  );
  watch(
    () => options.windowOpacity.value,
    (value) => {
      document.documentElement.style.setProperty("--ui-opacity", String(value));
    },
    { immediate: true }
  );
  useTheme({
    themeId: options.theme,
    blurEnabled: options.blurEnabled
  });
  useMotionPreset({
    presetId: options.motionPreset
  });
}
