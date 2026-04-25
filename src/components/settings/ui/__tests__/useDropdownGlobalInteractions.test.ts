import { effectScope, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useDropdownGlobalInteractions } from "../useDropdownGlobalInteractions";

describe("useDropdownGlobalInteractions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("打开时注册 pointerdown/resize/scroll，关闭和卸载时完整清理", async () => {
    const addDocumentListener = vi.spyOn(document, "addEventListener");
    const removeDocumentListener = vi.spyOn(document, "removeEventListener");
    const addWindowListener = vi.spyOn(window, "addEventListener");
    const removeWindowListener = vi.spyOn(window, "removeEventListener");
    const isOpen = ref(false);
    const triggerRef = ref<HTMLElement | null>(document.createElement("button"));
    const panelRef = ref<HTMLElement | null>(document.createElement("div"));
    const closeDropdown = vi.fn();
    const syncPanelPosition = vi.fn();
    const scope = effectScope();

    scope.run(() => {
      useDropdownGlobalInteractions({
        isOpen,
        triggerRef,
        panelRef,
        closeDropdown,
        syncPanelPosition
      });
    });

    isOpen.value = true;
    await Promise.resolve();

    expect(addDocumentListener).toHaveBeenCalledWith(
      "pointerdown",
      expect.any(Function)
    );
    expect(addWindowListener).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(addWindowListener).toHaveBeenCalledWith("scroll", expect.any(Function), true);

    isOpen.value = false;
    await Promise.resolve();

    expect(removeDocumentListener).toHaveBeenCalledWith(
      "pointerdown",
      expect.any(Function)
    );
    expect(removeWindowListener).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(removeWindowListener).toHaveBeenCalledWith("scroll", expect.any(Function), true);

    scope.stop();

    expect(removeDocumentListener.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(removeWindowListener.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("outside pointerdown 会关闭 dropdown，内部点击不会误关", async () => {
    const isOpen = ref(true);
    const trigger = document.createElement("button");
    const panel = document.createElement("div");
    const triggerChild = document.createElement("span");
    const panelChild = document.createElement("span");
    trigger.appendChild(triggerChild);
    panel.appendChild(panelChild);
    document.body.append(trigger, panel);

    const scope = effectScope();
    const closeDropdown = vi.fn(() => {
      isOpen.value = false;
    });
    scope.run(() => {
      useDropdownGlobalInteractions({
        isOpen,
        triggerRef: ref(trigger),
        panelRef: ref(panel),
        closeDropdown,
        syncPanelPosition: vi.fn()
      });
    });

    triggerChild.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    panelChild.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    await Promise.resolve();

    expect(closeDropdown).toHaveBeenCalledTimes(1);

    scope.stop();
    document.body.innerHTML = "";
  });

  it("resize 和 scroll 高频触发时会合并到同一帧同步位置", async () => {
    vi.useFakeTimers();
    let rafId = 0;
    const rafCallbacks = new Map<number, FrameRequestCallback>();
    const windowListeners = new Map<string, EventListener>();
    vi.spyOn(window, "addEventListener").mockImplementation(
      ((type: string, listener: EventListenerOrEventListenerObject) => {
        if (typeof listener === "function") {
          windowListeners.set(type, listener as EventListener);
        }
      }) as typeof window.addEventListener
    );
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
      rafId += 1;
      rafCallbacks.set(rafId, callback);
      return rafId;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id: number) => {
      rafCallbacks.delete(id);
    });

    const isOpen = ref(true);
    const triggerRef = ref<HTMLElement | null>(document.createElement("button"));
    const panelRef = ref<HTMLElement | null>(document.createElement("div"));
    const closeDropdown = vi.fn();
    const syncPanelPosition = vi.fn();
    const scope = effectScope();

    scope.run(() => {
      useDropdownGlobalInteractions({
        isOpen,
        triggerRef,
        panelRef,
        closeDropdown,
        syncPanelPosition
      });
    });

    windowListeners.get("resize")?.(new Event("resize"));
    windowListeners.get("resize")?.(new Event("resize"));
    windowListeners.get("scroll")?.(new Event("scroll"));

    expect(syncPanelPosition).not.toHaveBeenCalled();
    expect(rafCallbacks.size).toBe(1);

    rafCallbacks.values().next().value?.(16);

    expect(syncPanelPosition).toHaveBeenCalledTimes(1);
    scope.stop();
    vi.useRealTimers();
  });
});
