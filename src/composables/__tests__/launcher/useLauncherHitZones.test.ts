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

function dispatchPointerDown(target: HTMLElement, button = 0): void {
  target.dispatchEvent(new MouseEvent("pointerdown", { button, bubbles: true }));
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
}

function createPointerEventLike(target: EventTarget | null, button = 0): PointerEvent {
  return {
    target,
    button
  } as unknown as PointerEvent;
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
    root.addEventListener("pointerdown", (event) => onRootPointerDown(event as PointerEvent), {
      capture: true
    });

    const interactive = document.createElement("div");
    interactive.setAttribute("data-hit-zone", "interactive");
    root.appendChild(interactive);

    dispatchPointerDown(interactive);
    dispatchPointerDown(root, 2);
    dispatchPointerDown(root);

    expect(hideMainWindow).toHaveBeenCalledTimes(1);
  });

  it("starts window dragging for left click on drag hit zone in tauri runtime", () => {
    const hideMainWindow = vi.fn();
    const startWindowDragging = vi.fn();
    const { onRootPointerDown } = useLauncherHitZones({
      hideMainWindow,
      isTauriRuntime: () => true,
      startWindowDragging
    });

    const root = document.createElement("main");
    root.addEventListener("pointerdown", (event) => onRootPointerDown(event as PointerEvent), {
      capture: true
    });

    const dragZone = document.createElement("div");
    dragZone.setAttribute("data-hit-zone", "drag");
    const dragTarget = withChild(dragZone);
    root.appendChild(dragZone);

    dispatchPointerDown(dragTarget);

    expect(startWindowDragging).toHaveBeenCalledTimes(1);
    expect(hideMainWindow).not.toHaveBeenCalled();
  });

  it("starts window dragging for tauri drag region but skips interactive descendants", () => {
    const hideMainWindow = vi.fn();
    const startWindowDragging = vi.fn();
    const { onRootPointerDown } = useLauncherHitZones({
      hideMainWindow,
      isTauriRuntime: () => true,
      startWindowDragging
    });

    const root = document.createElement("main");
    root.addEventListener("pointerdown", (event) => onRootPointerDown(event as PointerEvent), {
      capture: true
    });

    const header = document.createElement("header");
    header.setAttribute("data-tauri-drag-region", "");
    const title = withChild(header, "span");
    const backButton = document.createElement("button");
    const textInput = document.createElement("input");
    header.append(backButton, textInput);
    root.appendChild(header);

    dispatchPointerDown(title);
    dispatchPointerDown(backButton);
    dispatchPointerDown(textInput);

    expect(startWindowDragging).toHaveBeenCalledTimes(1);
    expect(hideMainWindow).not.toHaveBeenCalled();
  });

  it("does not start window dragging for non-left click on drag region", () => {
    const startWindowDragging = vi.fn();
    const { onRootPointerDown } = useLauncherHitZones({
      hideMainWindow: vi.fn(),
      isTauriRuntime: () => true,
      startWindowDragging
    });

    const root = document.createElement("main");
    root.addEventListener("pointerdown", (event) => onRootPointerDown(event as PointerEvent), {
      capture: true
    });

    const dragRegion = document.createElement("div");
    dragRegion.setAttribute("data-tauri-drag-region", "");
    root.appendChild(dragRegion);

    dispatchPointerDown(dragRegion, 2);

    expect(startWindowDragging).not.toHaveBeenCalled();
  });

  it("supports text node targets inside tauri drag region", () => {
    const startWindowDragging = vi.fn();
    const { onRootPointerDown } = useLauncherHitZones({
      hideMainWindow: vi.fn(),
      isTauriRuntime: () => true,
      startWindowDragging
    });

    const dragRegion = document.createElement("header");
    dragRegion.setAttribute("data-tauri-drag-region", "");
    dragRegion.appendChild(document.createTextNode("ZapCmd"));

    onRootPointerDown(createPointerEventLike(dragRegion.firstChild, 0));

    expect(startWindowDragging).toHaveBeenCalledTimes(1);
  });

  it("does not start dragging outside tauri runtime", () => {
    const hideMainWindow = vi.fn();
    const startWindowDragging = vi.fn();
    const { onRootPointerDown } = useLauncherHitZones({
      hideMainWindow,
      isTauriRuntime: () => false,
      startWindowDragging
    });

    const dragRegion = document.createElement("div");
    dragRegion.setAttribute("data-tauri-drag-region", "");

    onRootPointerDown(createPointerEventLike(dragRegion, 0));

    expect(startWindowDragging).not.toHaveBeenCalled();
    expect(hideMainWindow).not.toHaveBeenCalled();
  });

  it("logs warning when window dragging fails", async () => {
    const logWarn = vi.fn();
    const { onRootPointerDown } = useLauncherHitZones({
      hideMainWindow: vi.fn(),
      isTauriRuntime: () => true,
      startWindowDragging: vi.fn(async () => {
        throw new Error("drag failed");
      }),
      logWarn
    });

    const dragRegion = document.createElement("div");
    dragRegion.setAttribute("data-tauri-drag-region", "");

    onRootPointerDown(createPointerEventLike(dragRegion, 0));
    await flushMicrotasks();

    expect(logWarn).toHaveBeenCalledTimes(1);
    expect(logWarn).toHaveBeenCalledWith(
      "launcher drag region failed to start window dragging",
      expect.any(Error)
    );
  });
});
