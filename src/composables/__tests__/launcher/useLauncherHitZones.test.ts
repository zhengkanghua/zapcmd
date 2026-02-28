import { describe, expect, it, vi } from "vitest";
import {
  shouldHideLauncherOnPointerDownFromTarget,
  useLauncherHitZones
} from "../../launcher/useLauncherHitZones";

function withChild(parent: HTMLElement, childTag = "span"): HTMLElement {
  const child = document.createElement(childTag);
  parent.appendChild(child);
  return child;
}

describe("useLauncherHitZones", () => {
  it("returns false for non-left button", () => {
    const blank = document.createElement("div");
    expect(shouldHideLauncherOnPointerDownFromTarget(blank, 2)).toBe(false);
  });

  it("returns false for overlay zone", () => {
    const overlay = document.createElement("aside");
    overlay.setAttribute("data-hit-zone", "overlay");
    const target = withChild(overlay);
    expect(shouldHideLauncherOnPointerDownFromTarget(target, 0)).toBe(false);
  });

  it("returns false for interactive zone", () => {
    const interactive = document.createElement("section");
    interactive.setAttribute("data-hit-zone", "interactive");
    const target = withChild(interactive);
    expect(shouldHideLauncherOnPointerDownFromTarget(target, 0)).toBe(false);
  });

  it("returns false for drag zone and tauri drag region fallback", () => {
    const dragZone = document.createElement("div");
    dragZone.setAttribute("data-hit-zone", "drag");
    const dragTarget = withChild(dragZone);
    expect(shouldHideLauncherOnPointerDownFromTarget(dragTarget, 0)).toBe(false);

    const tauriDrag = document.createElement("div");
    tauriDrag.setAttribute("data-tauri-drag-region", "");
    const tauriDragTarget = withChild(tauriDrag);
    expect(shouldHideLauncherOnPointerDownFromTarget(tauriDragTarget, 0)).toBe(false);
  });

  it("returns true for blank zone", () => {
    const blank = document.createElement("div");
    expect(shouldHideLauncherOnPointerDownFromTarget(blank, 0)).toBe(true);
  });

  it("calls hideMainWindow only for blank left click in pointer handler", () => {
    const hideMainWindow = vi.fn();
    const { onRootPointerDown } = useLauncherHitZones({
      hideMainWindow
    });

    const root = document.createElement("main");
    root.addEventListener("pointerdown", (event) => onRootPointerDown(event as PointerEvent));

    const interactive = document.createElement("div");
    interactive.setAttribute("data-hit-zone", "interactive");
    root.appendChild(interactive);

    interactive.dispatchEvent(new MouseEvent("pointerdown", { button: 0, bubbles: true }));
    root.dispatchEvent(new MouseEvent("pointerdown", { button: 2, bubbles: true }));
    root.dispatchEvent(new MouseEvent("pointerdown", { button: 0, bubbles: true }));

    expect(hideMainWindow).toHaveBeenCalledTimes(1);
  });
});
