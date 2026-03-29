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

function switchFocusWithQueueOpen<TItem>(main: MainHandlers<TItem>): void {
  if (!main.queueOpen.value) {
    main.openQueuePanel();
  }
  if (main.focusZone.value === "search") {
    main.switchFocusZone();
    return;
  }

  main.toggleQueue();
  main.switchFocusZone();
}

export function handleMainGlobalHotkeys<TItem>(
  event: KeyboardEvent,
  main: MainHandlers<TItem>
): boolean {
  if ((event.ctrlKey || event.metaKey) && event.key === "Tab") {
    event.preventDefault();
    switchFocusWithQueueOpen(main);
    return true;
  }
  if (hotkeyMatches(event, main.normalizedSwitchFocusHotkey.value)) {
    event.preventDefault();
    switchFocusWithQueueOpen(main);
    return true;
  }
  if (hotkeyMatches(event, main.normalizedToggleQueueHotkey.value)) {
    if (main.queueOpen.value && main.normalizedToggleQueueHotkey.value === "Tab") {
      return false;
    }
    event.preventDefault();
    main.toggleQueue();
    return true;
  }
  if (hotkeyMatches(event, main.normalizedExecuteQueueHotkey.value)) {
    const flowOpen = main.commandPanelOpen.value;
    if (
      !flowOpen &&
      !main.queueOpen.value &&
      main.focusZone.value === "search" &&
      hotkeyMatches(event, main.normalizedEnqueueSelectedHotkey.value)
    ) {
      return false;
    }
    event.preventDefault();
    void main.executeQueue();
    return true;
  }
  if (!hotkeyMatches(event, main.normalizedClearQueueHotkey.value)) {
    return false;
  }

  event.preventDefault();
  main.clearQueue();
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
  if (!hotkeyMatches(event, main.normalizedEnqueueSelectedHotkey.value)) {
    return false;
  }

  event.preventDefault();
  main.enqueueResult(main.filteredResults.value[main.activeIndex.value]);
  return true;
}

export function handleQueueZoneHotkeys<TItem>(
  event: KeyboardEvent,
  main: MainHandlers<TItem>
): boolean {
  if (
    main.focusZone.value !== "queue" ||
    !main.queueOpen.value ||
    main.queuedCommands.value.length === 0 ||
    main.isTypingElement(event.target)
  ) {
    return false;
  }

  if (hotkeyMatches(event, main.normalizedReorderUpHotkey.value)) {
    event.preventDefault();
    main.moveQueuedCommand(main.queueActiveIndex.value, Math.max(main.queueActiveIndex.value - 1, 0));
    return true;
  }
  if (hotkeyMatches(event, main.normalizedReorderDownHotkey.value)) {
    event.preventDefault();
    main.moveQueuedCommand(
      main.queueActiveIndex.value,
      Math.min(main.queueActiveIndex.value + 1, main.queuedCommands.value.length - 1)
    );
    return true;
  }
  if (hotkeyMatches(event, main.normalizedNavigateDownHotkey.value)) {
    event.preventDefault();
    main.queueActiveIndex.value = Math.min(
      main.queueActiveIndex.value + 1,
      main.queuedCommands.value.length - 1
    );
    main.queuePostUpdate(() => main.ensureActiveQueueVisible());
    return true;
  }
  if (hotkeyMatches(event, main.normalizedNavigateUpHotkey.value)) {
    event.preventDefault();
    main.queueActiveIndex.value = Math.max(main.queueActiveIndex.value - 1, 0);
    main.queuePostUpdate(() => main.ensureActiveQueueVisible());
    return true;
  }
  if (!hotkeyMatches(event, main.normalizedRemoveQueueItemHotkey.value)) {
    return false;
  }

  event.preventDefault();
  const target = main.queuedCommands.value[main.queueActiveIndex.value];
  if (target) {
    main.removeQueuedCommand(target.id);
  }
  return true;
}
