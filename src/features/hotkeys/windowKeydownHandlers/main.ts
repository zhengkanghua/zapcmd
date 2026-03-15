import { hotkeyMatches } from "../../../shared/hotkeys";
import type { MainHandlers } from "./types";

export function ensureSearchFocusZone<TItem>(
  event: KeyboardEvent,
  main: MainHandlers<TItem>
): void {
  if (event.target === main.searchInputRef.value && main.focusZone.value !== "search") {
    main.focusZone.value = "search";
  }
}

function switchFocusWithStagingOpen<TItem>(main: MainHandlers<TItem>): void {
  if (!main.stagingExpanded.value) {
    main.openStagingDrawer();
  }
  if (main.focusZone.value === "search") {
    main.switchFocusZone();
    return;
  }

  main.toggleStaging();
  main.switchFocusZone();
}

export function handleMainGlobalHotkeys<TItem>(
  event: KeyboardEvent,
  main: MainHandlers<TItem>
): boolean {
  if ((event.ctrlKey || event.metaKey) && event.key === "Tab") {
    event.preventDefault();
    switchFocusWithStagingOpen(main);
    return true;
  }
  if (hotkeyMatches(event, main.normalizedSwitchFocusHotkey.value)) {
    event.preventDefault();
    switchFocusWithStagingOpen(main);
    return true;
  }
  if (hotkeyMatches(event, main.normalizedToggleQueueHotkey.value)) {
    if (main.stagingExpanded.value && main.normalizedToggleQueueHotkey.value === "Tab") {
      return false;
    }
    event.preventDefault();
    main.toggleStaging();
    return true;
  }
  if (hotkeyMatches(event, main.normalizedExecuteQueueHotkey.value)) {
    const flowOpen = main.commandPanelOpen.value;
    if (
      !flowOpen &&
      !main.stagingExpanded.value &&
      main.focusZone.value === "search" &&
      hotkeyMatches(event, main.normalizedStageSelectedHotkey.value)
    ) {
      return false;
    }
    event.preventDefault();
    void main.executeStaged();
    return true;
  }
  if (!hotkeyMatches(event, main.normalizedClearQueueHotkey.value)) {
    return false;
  }

  event.preventDefault();
  main.clearStaging();
  return true;
}

export function handleSearchZoneHotkeys<TItem>(
  event: KeyboardEvent,
  main: MainHandlers<TItem>
): boolean {
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const searchInput = main.searchInputRef.value;
  const drawer = main.drawerRef.value;
  const inSearchContext =
    main.focusZone.value === "search" &&
    (active === searchInput || (Boolean(drawer) && Boolean(active) && drawer?.contains(active)));

  if (!inSearchContext) {
    return false;
  }
  if (!main.drawerOpen.value || main.filteredResults.value.length === 0) {
    if (hotkeyMatches(event, main.normalizedExecuteSelectedHotkey.value)) {
      event.preventDefault();
    }
    return false;
  }

  if (hotkeyMatches(event, main.normalizedNavigateDownHotkey.value)) {
    event.preventDefault();
    main.activeIndex.value = Math.min(main.activeIndex.value + 1, main.filteredResults.value.length - 1);
    main.queuePostUpdate(() => main.ensureActiveResultVisible());
    return true;
  }
  if (hotkeyMatches(event, main.normalizedNavigateUpHotkey.value)) {
    event.preventDefault();
    main.activeIndex.value = Math.max(main.activeIndex.value - 1, 0);
    main.queuePostUpdate(() => main.ensureActiveResultVisible());
    return true;
  }
  if (hotkeyMatches(event, main.normalizedExecuteSelectedHotkey.value)) {
    event.preventDefault();
    main.executeResult(main.filteredResults.value[main.activeIndex.value]);
    return true;
  }
  if (!hotkeyMatches(event, main.normalizedStageSelectedHotkey.value)) {
    return false;
  }

  event.preventDefault();
  main.stageResult(main.filteredResults.value[main.activeIndex.value]);
  return true;
}

export function handleStagingZoneHotkeys<TItem>(
  event: KeyboardEvent,
  main: MainHandlers<TItem>
): boolean {
  if (
    main.focusZone.value !== "staging" ||
    !main.stagingExpanded.value ||
    main.stagedCommands.value.length === 0 ||
    main.isTypingElement(event.target)
  ) {
    return false;
  }

  if (hotkeyMatches(event, main.normalizedReorderUpHotkey.value)) {
    event.preventDefault();
    main.moveStagedCommand(main.stagingActiveIndex.value, Math.max(main.stagingActiveIndex.value - 1, 0));
    return true;
  }
  if (hotkeyMatches(event, main.normalizedReorderDownHotkey.value)) {
    event.preventDefault();
    main.moveStagedCommand(
      main.stagingActiveIndex.value,
      Math.min(main.stagingActiveIndex.value + 1, main.stagedCommands.value.length - 1)
    );
    return true;
  }
  if (hotkeyMatches(event, main.normalizedNavigateDownHotkey.value)) {
    event.preventDefault();
    main.stagingActiveIndex.value = Math.min(
      main.stagingActiveIndex.value + 1,
      main.stagedCommands.value.length - 1
    );
    main.queuePostUpdate(() => main.ensureActiveStagingVisible());
    return true;
  }
  if (hotkeyMatches(event, main.normalizedNavigateUpHotkey.value)) {
    event.preventDefault();
    main.stagingActiveIndex.value = Math.max(main.stagingActiveIndex.value - 1, 0);
    main.queuePostUpdate(() => main.ensureActiveStagingVisible());
    return true;
  }
  if (!hotkeyMatches(event, main.normalizedRemoveQueueItemHotkey.value)) {
    return false;
  }

  event.preventDefault();
  const target = main.stagedCommands.value[main.stagingActiveIndex.value];
  if (target) {
    main.removeStagedCommand(target.id);
  }
  return true;
}
