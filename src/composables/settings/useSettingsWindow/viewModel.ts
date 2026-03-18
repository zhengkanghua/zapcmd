import { computed } from "vue";
import { APP_LOCALES, t } from "../../../i18n";
import type { SettingsWindowState, UseSettingsWindowOptions } from "./model";

export function createSettingsViewModel(deps: {
  options: UseSettingsWindowOptions;
  state: SettingsWindowState;
}) {
  const { options, state } = deps;

  return {
    settingsNavItems: computed(() => [
      { id: "hotkeys" as const, label: t("settings.nav.hotkeys"), icon: "⌨" },
      { id: "general" as const, label: t("settings.nav.general"), icon: "⚙" },
      { id: "commands" as const, label: t("settings.nav.commands"), icon: "☰" },
      { id: "appearance" as const, label: t("settings.nav.appearance"), icon: "✦" },
      { id: "about" as const, label: t("settings.nav.about"), icon: "ℹ" }
    ]),
    hotkeyGlobalFields: computed(() =>
      options.hotkeyDefinitions.filter((field) => field.id === "launcher")
    ),
    hotkeySearchFields: computed(() =>
      options.hotkeyDefinitions.filter((field) =>
        [
          "toggleQueue",
          "switchFocus",
          "navigateUp",
          "navigateDown",
          "executeSelected",
          "stageSelected",
          "escape"
        ].includes(field.id)
      )
    ),
    hotkeyQueueFields: computed(() =>
      options.hotkeyDefinitions.filter((field) =>
        ["executeQueue", "clearQueue", "removeQueueItem", "reorderUp", "reorderDown"].includes(
          field.id
        )
      )
    ),
    selectedTerminalPath: computed(() => {
      const selected = state.availableTerminals.value.find(
        (item) => item.id === options.defaultTerminal.value
      );
      return selected?.path ?? t("settings.general.terminalPathNotFound");
    }),
    languageOptions: computed(() =>
      APP_LOCALES.map((locale) => ({
        value: locale,
        label:
          locale === "zh-CN"
            ? t("settings.general.languageOptionZhCn")
            : t("settings.general.languageOptionEnUs")
      }))
    )
  };
}
