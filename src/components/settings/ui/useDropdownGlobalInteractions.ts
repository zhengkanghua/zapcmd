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
  const cleanup = (): void => {
    document.removeEventListener("pointerdown", onGlobalPointerDown);
    window.removeEventListener("resize", input.syncPanelPosition);
    window.removeEventListener("scroll", input.syncPanelPosition, true);
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
        window.addEventListener("resize", input.syncPanelPosition);
        window.addEventListener("scroll", input.syncPanelPosition, true);
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
