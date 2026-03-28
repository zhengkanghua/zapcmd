import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

const HIT_ZONE_ATTR = "data-hit-zone";
const DRAG_REGION_ATTR = "data-tauri-drag-region";
const INTERACTIVE_DRAG_CHILD_SELECTOR = [
  "button",
  "input",
  "textarea",
  "select",
  "a",
  "[contenteditable]:not([contenteditable='false'])",
  `[${HIT_ZONE_ATTR}='interactive']`
].join(", ");

type LauncherHitZone = "drag" | "interactive" | "overlay";

function toElement(target: EventTarget | null): Element | null {
  if (target instanceof Element) {
    return target;
  }
  return target instanceof Node ? target.parentElement : null;
}

function inHitZone(target: Element, zone: LauncherHitZone): boolean {
  return target.closest(`[${HIT_ZONE_ATTR}='${zone}']`) !== null;
}

function inDragRegion(target: Element): boolean {
  return target.closest(`[${DRAG_REGION_ATTR}]`) !== null;
}

function isInteractiveDragChild(target: Element): boolean {
  return target.closest(INTERACTIVE_DRAG_CHILD_SELECTOR) !== null;
}

function shouldStartWindowDragOnPointerDownFromTarget(
  target: EventTarget | null,
  button: number
): boolean {
  if (button !== 0) {
    return false;
  }

  const element = toElement(target);
  if (!element || isInteractiveDragChild(element)) {
    return false;
  }

  return inHitZone(element, "drag") || inDragRegion(element);
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
  isTauriRuntime?: () => boolean;
  startWindowDragging?: () => Promise<void> | void;
  logWarn?: (message: string, payload?: unknown) => void;
}

export function useLauncherHitZones(options: UseLauncherHitZonesOptions) {
  const isTauriRuntime = options.isTauriRuntime ?? isTauri;
  const startWindowDragging =
    options.startWindowDragging ?? (() => getCurrentWindow().startDragging());
  const logWarn =
    options.logWarn ??
    ((message: string, payload?: unknown) => {
      console.warn(message, payload);
    });

  function onRootPointerDown(event: PointerEvent): void {
    // 在根 capture 层显式触发拖窗，避免仅有 drag-region 标记时出现“光标像可拖拽，但窗口实际不动”。
    if (shouldStartWindowDragOnPointerDownFromTarget(event.target, event.button)) {
      if (!isTauriRuntime()) {
        return;
      }
      void Promise.resolve(startWindowDragging()).catch((error: unknown) => {
        logWarn("launcher drag region failed to start window dragging", error);
      });
      return;
    }

    if (!shouldHideLauncherOnPointerDown(event)) {
      return;
    }
    void options.hideMainWindow();
  }

  return {
    onRootPointerDown
  };
}
