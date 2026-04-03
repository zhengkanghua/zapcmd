import { computed, type Ref } from "vue";
import { t } from "../../i18n";
import { buildSearchHintLines } from "../../features/launcher/searchHintBuilder";
import type {
  HotkeyFieldId,
  HotkeySettings,
  PointerActionSettings
} from "../../stores/settingsStore";
import { formatHotkeyForHint } from "../../shared/hotkeys";

interface UseHotkeyBindingsOptions {
  hotkeys: Ref<HotkeySettings>;
  pointerActions: Ref<PointerActionSettings>;
  setHotkey: (field: HotkeyFieldId, value: string) => void;
}

function createHotkeyField(options: UseHotkeyBindingsOptions, field: HotkeyFieldId) {
  return computed({
    get: () => options.hotkeys.value[field],
    set: (value: string) => options.setHotkey(field, value)
  });
}

function createNormalizedHotkeyRefs(fields: {
  toggleQueueHotkey: ReturnType<typeof computed<string>>;
  switchFocusHotkey: ReturnType<typeof computed<string>>;
  navigateDownHotkey: ReturnType<typeof computed<string>>;
  navigateUpHotkey: ReturnType<typeof computed<string>>;
  stageSelectedHotkey: ReturnType<typeof computed<string>>;
  executeSelectedHotkey: ReturnType<typeof computed<string>>;
  openActionPanelHotkey: ReturnType<typeof computed<string>>;
  copySelectedHotkey: ReturnType<typeof computed<string>>;
  executeQueueHotkey: ReturnType<typeof computed<string>>;
  clearQueueHotkey: ReturnType<typeof computed<string>>;
  removeQueueItemHotkey: ReturnType<typeof computed<string>>;
  reorderUpHotkey: ReturnType<typeof computed<string>>;
  reorderDownHotkey: ReturnType<typeof computed<string>>;
  escapeHotkey: ReturnType<typeof computed<string>>;
}) {
  return {
    normalizedToggleQueueHotkey: computed(() => fields.toggleQueueHotkey.value.trim()),
    normalizedSwitchFocusHotkey: computed(() => fields.switchFocusHotkey.value.trim()),
    normalizedNavigateDownHotkey: computed(() => fields.navigateDownHotkey.value.trim()),
    normalizedNavigateUpHotkey: computed(() => fields.navigateUpHotkey.value.trim()),
    normalizedStageSelectedHotkey: computed(() => fields.stageSelectedHotkey.value.trim()),
    normalizedExecuteSelectedHotkey: computed(() => fields.executeSelectedHotkey.value.trim()),
    normalizedOpenActionPanelHotkey: computed(() => fields.openActionPanelHotkey.value.trim()),
    normalizedCopySelectedHotkey: computed(() => fields.copySelectedHotkey.value.trim()),
    normalizedExecuteQueueHotkey: computed(() => fields.executeQueueHotkey.value.trim()),
    normalizedClearQueueHotkey: computed(() => fields.clearQueueHotkey.value.trim()),
    normalizedRemoveQueueItemHotkey: computed(() => fields.removeQueueItemHotkey.value.trim()),
    normalizedReorderUpHotkey: computed(() => fields.reorderUpHotkey.value.trim()),
    normalizedReorderDownHotkey: computed(() => fields.reorderDownHotkey.value.trim()),
    normalizedEscapeHotkey: computed(() => fields.escapeHotkey.value.trim())
  };
}

function createHotkeyHintBindings(options: UseHotkeyBindingsOptions, fields: {
  navigateUpHotkey: ReturnType<typeof computed<string>>;
  navigateDownHotkey: ReturnType<typeof computed<string>>;
  executeSelectedHotkey: ReturnType<typeof computed<string>>;
  stageSelectedHotkey: ReturnType<typeof computed<string>>;
  openActionPanelHotkey: ReturnType<typeof computed<string>>;
  copySelectedHotkey: ReturnType<typeof computed<string>>;
  toggleQueueHotkey: ReturnType<typeof computed<string>>;
  switchFocusHotkey: ReturnType<typeof computed<string>>;
}) {
  const formattedNavigateUpHint = computed(() => formatHotkeyForHint(fields.navigateUpHotkey.value));
  const formattedNavigateDownHint = computed(() => formatHotkeyForHint(fields.navigateDownHotkey.value));
  const formattedExecuteSelectedHint = computed(() => formatHotkeyForHint(fields.executeSelectedHotkey.value));
  const formattedStageSelectedHint = computed(() => formatHotkeyForHint(fields.stageSelectedHotkey.value));
  const formattedOpenActionPanelHint = computed(() => formatHotkeyForHint(fields.openActionPanelHotkey.value));
  const formattedCopySelectedHint = computed(() => formatHotkeyForHint(fields.copySelectedHotkey.value));
  const formattedToggleQueueHint = computed(() => formatHotkeyForHint(fields.toggleQueueHotkey.value));
  const formattedSwitchFocusHint = computed(() => formatHotkeyForHint(fields.switchFocusHotkey.value));
  const stagingHintText = computed(() =>
    t("hotkeyHints.stagingFocus", {
      switchFocus: formattedSwitchFocusHint.value
    })
  );
  const stagingHints = computed(() =>
    [
      {
        keys: [formattedSwitchFocusHint.value].filter(Boolean),
        action: t("hotkeyHints.actions.switchFocus")
      }
    ].filter((hint) => hint.keys.length > 0)
  );
  const keyboardHintText = computed(() =>
    t("hotkeyHints.keyboard", {
      navigateUp: formattedNavigateUpHint.value,
      navigateDown: formattedNavigateDownHint.value,
      executeSelected: formattedExecuteSelectedHint.value,
      stageSelected: formattedStageSelectedHint.value,
      toggleQueue: formattedToggleQueueHint.value,
      switchFocus: formattedSwitchFocusHint.value
    })
  );
  const searchHintLines = computed(() =>
    buildSearchHintLines({
      hotkeys: {
        navigateUp: formattedNavigateUpHint.value,
        navigateDown: formattedNavigateDownHint.value,
        executeSelected: formattedExecuteSelectedHint.value,
        stageSelected: formattedStageSelectedHint.value,
        openActionPanel: formattedOpenActionPanelHint.value,
        copySelected: formattedCopySelectedHint.value,
        switchFocus: formattedSwitchFocusHint.value,
        toggleQueue: formattedToggleQueueHint.value
      },
      pointerActions: options.pointerActions.value
    })
  );

  return {
    stagingHintText,
    stagingHints,
    keyboardHintText,
    keyboardHints: computed(() => searchHintLines.value[0] ?? []),
    searchHintLines
  };
}

export function useHotkeyBindings(options: UseHotkeyBindingsOptions) {
  const launcherHotkey = createHotkeyField(options, "launcher");
  const toggleQueueHotkey = createHotkeyField(options, "toggleQueue");
  const switchFocusHotkey = createHotkeyField(options, "switchFocus");
  const navigateUpHotkey = createHotkeyField(options, "navigateUp");
  const navigateDownHotkey = createHotkeyField(options, "navigateDown");
  const executeSelectedHotkey = createHotkeyField(options, "executeSelected");
  const stageSelectedHotkey = createHotkeyField(options, "stageSelected");
  const openActionPanelHotkey = createHotkeyField(options, "openActionPanel");
  const copySelectedHotkey = createHotkeyField(options, "copySelected");
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

  const normalizedHotkeys = createNormalizedHotkeyRefs({
    toggleQueueHotkey,
    switchFocusHotkey,
    navigateDownHotkey,
    navigateUpHotkey,
    stageSelectedHotkey,
    executeSelectedHotkey,
    openActionPanelHotkey,
    copySelectedHotkey,
    executeQueueHotkey,
    clearQueueHotkey,
    removeQueueItemHotkey,
    reorderUpHotkey,
    reorderDownHotkey,
    escapeHotkey
  });
  const hintBindings = createHotkeyHintBindings(options, {
    navigateUpHotkey,
    navigateDownHotkey,
    executeSelectedHotkey,
    stageSelectedHotkey,
    openActionPanelHotkey,
    copySelectedHotkey,
    toggleQueueHotkey,
    switchFocusHotkey
  });

  return {
    launcherHotkey,
    toggleQueueHotkey,
    switchFocusHotkey,
    navigateUpHotkey,
    navigateDownHotkey,
    executeSelectedHotkey,
    stageSelectedHotkey,
    openActionPanelHotkey,
    copySelectedHotkey,
    escapeHotkey,
    executeQueueHotkey,
    clearQueueHotkey,
    removeQueueItemHotkey,
    reorderUpHotkey,
    reorderDownHotkey,
    getHotkeyValue,
    setHotkeyValue,
    ...normalizedHotkeys,
    ...hintBindings
  };
}
