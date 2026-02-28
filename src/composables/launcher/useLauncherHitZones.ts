const HIT_ZONE_ATTR = "data-hit-zone";
const DRAG_REGION_ATTR = "data-tauri-drag-region";

type LauncherHitZone = "drag" | "interactive" | "overlay";

function toElement(target: EventTarget | null): Element | null {
  return target instanceof Element ? target : null;
}

function inHitZone(target: Element, zone: LauncherHitZone): boolean {
  return target.closest(`[${HIT_ZONE_ATTR}='${zone}']`) !== null;
}

function inDragRegion(target: Element): boolean {
  return target.closest(`[${DRAG_REGION_ATTR}]`) !== null;
}

export function shouldHideLauncherOnPointerDownFromTarget(
  target: EventTarget | null,
  button: number
): boolean {
  if (button !== 0) {
    return false;
  }

  const element = toElement(target);
  if (!element) {
    return false;
  }

  if (inHitZone(element, "overlay")) {
    return false;
  }

  if (inHitZone(element, "drag") || inDragRegion(element)) {
    return false;
  }

  if (inHitZone(element, "interactive")) {
    return false;
  }

  return true;
}

export function shouldHideLauncherOnPointerDown(event: PointerEvent): boolean {
  return shouldHideLauncherOnPointerDownFromTarget(event.target, event.button);
}

interface UseLauncherHitZonesOptions {
  hideMainWindow: () => Promise<void> | void;
}

export function useLauncherHitZones(options: UseLauncherHitZonesOptions) {
  function onRootPointerDown(event: PointerEvent): void {
    if (!shouldHideLauncherOnPointerDown(event)) {
      return;
    }
    void options.hideMainWindow();
  }

  return {
    onRootPointerDown
  };
}
