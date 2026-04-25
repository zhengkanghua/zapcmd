import { getCurrentInstance, onBeforeUnmount, onScopeDispose, watch, type Ref } from "vue";

interface UseDropdownGlobalInteractionsInput {
  isOpen: Ref<boolean>;
  triggerRef: Ref<HTMLElement | null>;
  panelRef: Ref<HTMLElement | null>;
  closeDropdown: () => void;
  syncPanelPosition: () => void;
}

function isEventInside(
  event: PointerEvent,
  triggerRef: Ref<HTMLElement | null>,
  panelRef: Ref<HTMLElement | null>
): boolean {
  if (!(event.target instanceof Element)) {
    return false;
  }

  return (
    triggerRef.value?.contains(event.target) === true ||
    panelRef.value?.contains(event.target) === true
  );
}

export function useDropdownGlobalInteractions(input: UseDropdownGlobalInteractionsInput): void {
  let positionSyncFrame = 0;

  const cancelScheduledPanelPositionSync = (): void => {
    if (positionSyncFrame === 0) {
      return;
    }
    window.cancelAnimationFrame(positionSyncFrame);
    positionSyncFrame = 0;
  };

  const schedulePanelPositionSync = (): void => {
    if (positionSyncFrame !== 0) {
      return;
    }
    positionSyncFrame = window.requestAnimationFrame(() => {
      positionSyncFrame = 0;
      input.syncPanelPosition();
    });
  };

  const cleanup = (): void => {
    document.removeEventListener("pointerdown", onGlobalPointerDown);
    window.removeEventListener("resize", schedulePanelPositionSync);
    window.removeEventListener("scroll", schedulePanelPositionSync, true);
    cancelScheduledPanelPositionSync();
  };

  const onGlobalPointerDown = (event: PointerEvent): void => {
    if (input.isOpen.value && !isEventInside(event, input.triggerRef, input.panelRef)) {
      input.closeDropdown();
    }
  };

  watch(
    input.isOpen,
    (isOpen) => {
      if (isOpen) {
        document.addEventListener("pointerdown", onGlobalPointerDown);
        window.addEventListener("resize", schedulePanelPositionSync);
        window.addEventListener("scroll", schedulePanelPositionSync, true);
        return;
      }

      cleanup();
    },
    { immediate: true }
  );

  if (getCurrentInstance()) {
    onBeforeUnmount(cleanup);
    return;
  }

  onScopeDispose(cleanup);
}
