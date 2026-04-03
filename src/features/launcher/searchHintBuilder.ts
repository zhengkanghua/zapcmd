import { t } from "../../i18n";
import type { SearchResultPointerAction } from "../../stores/settingsStore";

export interface SearchHintItem {
  keys: string[];
  action: string;
}

export type SearchHintLine = SearchHintItem[];

interface SearchHintBuilderOptions {
  hotkeys: {
    navigateUp: string;
    navigateDown: string;
    executeSelected: string;
    stageSelected: string;
    openActionPanel: string;
    copySelected: string;
    switchFocus: string;
    toggleQueue: string;
  };
  pointerActions: {
    leftClick: SearchResultPointerAction;
    rightClick: SearchResultPointerAction;
  };
}

function createHint(keys: string[], action: string): SearchHintItem | null {
  const normalizedKeys = keys.map((key) => key.trim()).filter(Boolean);
  const normalizedAction = action.trim();
  if (!normalizedAction) {
    return null;
  }
  if (normalizedKeys.length === 0 && normalizedAction.length === 0) {
    return null;
  }
  return {
    keys: normalizedKeys,
    action: normalizedAction
  };
}

function resolvePointerActionLabel(action: SearchResultPointerAction): string {
  if (action === "execute") {
    return t("hotkeyHints.actions.execute");
  }
  if (action === "stage") {
    return t("hotkeyHints.actions.stage");
  }
  if (action === "copy") {
    return t("hotkeyHints.actions.copy");
  }
  return t("hotkeyHints.actions.actionPanel");
}

export function buildSearchHintLines(options: SearchHintBuilderOptions): SearchHintLine[] {
  const primaryLine = [
    createHint(
      [options.hotkeys.navigateUp, options.hotkeys.navigateDown],
      t("hotkeyHints.actions.navigate")
    ),
    createHint([options.hotkeys.executeSelected], t("hotkeyHints.actions.execute")),
    createHint([options.hotkeys.stageSelected], t("hotkeyHints.actions.stage")),
    createHint([options.hotkeys.openActionPanel], t("hotkeyHints.actions.actionPanel")),
    createHint([options.hotkeys.copySelected], t("hotkeyHints.actions.copy"))
  ].filter((item): item is SearchHintItem => item !== null);

  const secondaryLine = [
    createHint(
      [],
      `${t("hotkeyHints.keys.leftClick")} ${resolvePointerActionLabel(options.pointerActions.leftClick)}`
    ),
    createHint(
      [],
      `${t("hotkeyHints.keys.rightClick")} ${resolvePointerActionLabel(options.pointerActions.rightClick)}`
    ),
    createHint([options.hotkeys.switchFocus], t("hotkeyHints.actions.switchFocus")),
    createHint([options.hotkeys.toggleQueue], t("hotkeyHints.actions.toggleQueue"))
  ].filter((item): item is SearchHintItem => item !== null);

  return [primaryLine, secondaryLine];
}
