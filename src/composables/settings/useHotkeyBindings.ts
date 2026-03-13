import { computed, type Ref } from "vue";
import { t } from "../../i18n";
import type { HotkeyFieldId, HotkeySettings } from "../../stores/settingsStore";
import { formatHotkeyForHint } from "../../shared/hotkeys";

interface UseHotkeyBindingsOptions {
  hotkeys: Ref<HotkeySettings>;
  setHotkey: (field: HotkeyFieldId, value: string) => void;
}

function createHotkeyField(options: UseHotkeyBindingsOptions, field: HotkeyFieldId) {
  return computed({
    get: () => options.hotkeys.value[field],
    set: (value: string) => options.setHotkey(field, value)
  });
}

export function useHotkeyBindings(options: UseHotkeyBindingsOptions) {
  const launcherHotkey = createHotkeyField(options, "launcher");
  const toggleQueueHotkey = createHotkeyField(options, "toggleQueue");
  const switchFocusHotkey = createHotkeyField(options, "switchFocus");
  const navigateUpHotkey = createHotkeyField(options, "navigateUp");
  const navigateDownHotkey = createHotkeyField(options, "navigateDown");
  const executeSelectedHotkey = createHotkeyField(options, "executeSelected");
  const stageSelectedHotkey = createHotkeyField(options, "stageSelected");
  const escapeHotkey = createHotkeyField(options, "escape");
  const executeQueueHotkey = createHotkeyField(options, "executeQueue");
  const clearQueueHotkey = createHotkeyField(options, "clearQueue");
  const removeQueueItemHotkey = createHotkeyField(options, "removeQueueItem");
  const reorderUpHotkey = createHotkeyField(options, "reorderUp");
  const reorderDownHotkey = createHotkeyField(options, "reorderDown");

  function getHotkeyValue(field: HotkeyFieldId): string {
    return options.hotkeys.value[field];
  }

  function setHotkeyValue(field: HotkeyFieldId, value: string): void {
    options.setHotkey(field, value);
  }

  const normalizedToggleQueueHotkey = computed(() => toggleQueueHotkey.value.trim());
  const normalizedSwitchFocusHotkey = computed(() => switchFocusHotkey.value.trim());
  const normalizedNavigateDownHotkey = computed(() => navigateDownHotkey.value.trim());
  const normalizedNavigateUpHotkey = computed(() => navigateUpHotkey.value.trim());
  const normalizedStageSelectedHotkey = computed(() => stageSelectedHotkey.value.trim());
  const normalizedExecuteSelectedHotkey = computed(() => executeSelectedHotkey.value.trim());
  const normalizedExecuteQueueHotkey = computed(() => executeQueueHotkey.value.trim());
  const normalizedClearQueueHotkey = computed(() => clearQueueHotkey.value.trim());
  const normalizedRemoveQueueItemHotkey = computed(() => removeQueueItemHotkey.value.trim());
  const normalizedReorderUpHotkey = computed(() => reorderUpHotkey.value.trim());
  const normalizedReorderDownHotkey = computed(() => reorderDownHotkey.value.trim());
  const normalizedEscapeHotkey = computed(() => escapeHotkey.value.trim());

  const formattedNavigateUpHint = computed(() => formatHotkeyForHint(navigateUpHotkey.value));
  const formattedNavigateDownHint = computed(() => formatHotkeyForHint(navigateDownHotkey.value));
  const formattedExecuteSelectedHint = computed(() => formatHotkeyForHint(executeSelectedHotkey.value));
  const formattedStageSelectedHint = computed(() => formatHotkeyForHint(stageSelectedHotkey.value));
  const formattedToggleQueueHint = computed(() => formatHotkeyForHint(toggleQueueHotkey.value));
  const formattedSwitchFocusHint = computed(() => formatHotkeyForHint(switchFocusHotkey.value));
  const leftClickHint = computed(() => t("hotkeyHints.keys.leftClick"));
  const rightClickHint = computed(() => t("hotkeyHints.keys.rightClick"));
  const stagingHintText = computed(() =>
    t("hotkeyHints.stagingFocus", {
      switchFocus: formattedSwitchFocusHint.value
    })
  );
  
  const stagingHints = computed(() => [
    {
      keys: [formattedSwitchFocusHint.value].filter(Boolean),
      action: t("hotkeyHints.actions.switchFocus")
    }
  ].filter(h => h.keys.length > 0));
  const keyboardHintText = computed(
    () =>
      t("hotkeyHints.keyboard", {
        navigateUp: formattedNavigateUpHint.value,
        navigateDown: formattedNavigateDownHint.value,
        executeSelected: formattedExecuteSelectedHint.value,
        stageSelected: formattedStageSelectedHint.value,
        toggleQueue: formattedToggleQueueHint.value,
        switchFocus: formattedSwitchFocusHint.value
      })
  );

  const keyboardHints = computed(() => [
    {
      keys: [formattedNavigateUpHint.value, formattedNavigateDownHint.value].filter(Boolean),
      action: t("hotkeyHints.actions.navigate")
    },
    {
      keys: [formattedExecuteSelectedHint.value, leftClickHint.value].filter(Boolean),
      action: t("hotkeyHints.actions.execute")
    },
    {
      keys: [formattedStageSelectedHint.value, rightClickHint.value].filter(Boolean),
      action: t("hotkeyHints.actions.stage")
    },
    {
      keys: [formattedToggleQueueHint.value].filter(Boolean),
      action: t("hotkeyHints.actions.toggleQueue")
    },
    {
      keys: [formattedSwitchFocusHint.value].filter(Boolean),
      action: t("hotkeyHints.actions.switchFocus")
    }
  ].filter(h => h.keys.length > 0));

  return {
    launcherHotkey,
    toggleQueueHotkey,
    switchFocusHotkey,
    navigateUpHotkey,
    navigateDownHotkey,
    executeSelectedHotkey,
    stageSelectedHotkey,
    escapeHotkey,
    executeQueueHotkey,
    clearQueueHotkey,
    removeQueueItemHotkey,
    reorderUpHotkey,
    reorderDownHotkey,
    getHotkeyValue,
    setHotkeyValue,
    normalizedToggleQueueHotkey,
    normalizedSwitchFocusHotkey,
    normalizedNavigateDownHotkey,
    normalizedNavigateUpHotkey,
    normalizedStageSelectedHotkey,
    normalizedExecuteSelectedHotkey,
    normalizedExecuteQueueHotkey,
    normalizedClearQueueHotkey,
    normalizedRemoveQueueItemHotkey,
    normalizedReorderUpHotkey,
    normalizedReorderDownHotkey,
    normalizedEscapeHotkey,
    stagingHintText,
    stagingHints,
    keyboardHintText,
    keyboardHints
  };
}
