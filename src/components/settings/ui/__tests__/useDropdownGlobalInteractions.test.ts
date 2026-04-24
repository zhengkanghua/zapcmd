import { effectScope, ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import { useDropdownGlobalInteractions } from "../useDropdownGlobalInteractions";

describe("useDropdownGlobalInteractions", () => {
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
    expect(addWindowListener).toHaveBeenCalledWith("resize", syncPanelPosition);
    expect(addWindowListener).toHaveBeenCalledWith("scroll", syncPanelPosition, true);

    isOpen.value = false;
    await Promise.resolve();

    expect(removeDocumentListener).toHaveBeenCalledWith(
      "pointerdown",
      expect.any(Function)
    );
    expect(removeWindowListener).toHaveBeenCalledWith("resize", syncPanelPosition);
    expect(removeWindowListener).toHaveBeenCalledWith("scroll", syncPanelPosition, true);

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
});
