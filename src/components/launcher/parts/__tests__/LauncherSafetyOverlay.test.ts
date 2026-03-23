import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, describe, expect, it } from "vitest";

import type { LauncherSafetyDialog } from "../../types";
import LauncherSafetyOverlay from "../LauncherSafetyOverlay.vue";

function createSafetyDialog(): LauncherSafetyDialog {
  return {
    mode: "queue",
    title: "高危执行确认",
    description: "以下命令包含高危操作，请再次确认。",
    items: [
      {
        title: "删除容器",
        renderedCommand: "docker rm -f app",
        reasons: ["会立即停止并删除运行中的容器"]
      }
    ]
  };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("LauncherSafetyOverlay", () => {
  it("renders only when dialog exists and focuses cancel button after dialog opens", async () => {
    const wrapper = mount(LauncherSafetyOverlay, {
      attachTo: document.body,
      props: {
        safetyDialog: null,
        executing: false
      }
    });

    expect(wrapper.find(".safety-overlay").exists()).toBe(false);

    await wrapper.setProps({
      safetyDialog: createSafetyDialog()
    });
    await nextTick();
    await nextTick();

    const footerButtons = wrapper.findAll("footer button");
    expect(footerButtons).toHaveLength(2);
    const cancelButton = footerButtons[0]!.element as HTMLButtonElement;
    expect(wrapper.find(".safety-overlay").exists()).toBe(true);
    expect(document.activeElement).toBe(cancelButton);
  });

  it("forwards overlay, cancel and confirm actions", async () => {
    const wrapper = mount(LauncherSafetyOverlay, {
      props: {
        safetyDialog: createSafetyDialog(),
        executing: false
      }
    });

    const footerButtons = wrapper.findAll("footer button");
    expect(footerButtons).toHaveLength(2);

    await wrapper.get(".safety-overlay").trigger("click");
    await footerButtons[0]!.trigger("click");
    await footerButtons[1]!.trigger("click");

    expect(wrapper.emitted("cancel-safety-execution")).toHaveLength(2);
    expect(wrapper.emitted("confirm-safety-execution")).toHaveLength(1);
  });

  it("traps Tab focus within dialog and ignores non-Tab keys", async () => {
    const wrapper = mount(LauncherSafetyOverlay, {
      attachTo: document.body,
      props: {
        safetyDialog: createSafetyDialog(),
        executing: false
      }
    });

    const dialog = wrapper.get(".safety-dialog");
    const footerButtons = wrapper.findAll("footer button");
    expect(footerButtons).toHaveLength(2);
    const cancelButton = footerButtons[0]!.element as HTMLButtonElement;
    const confirmButton = footerButtons[1]!.element as HTMLButtonElement;

    confirmButton.focus();
    const tabEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true
    });
    dialog.element.dispatchEvent(tabEvent);
    expect(tabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(cancelButton);

    cancelButton.focus();
    const reverseTabEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true
    });
    dialog.element.dispatchEvent(reverseTabEvent);
    expect(reverseTabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(confirmButton);

    document.body.tabIndex = -1;
    document.body.focus();
    const detachedFocusEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true
    });
    dialog.element.dispatchEvent(detachedFocusEvent);
    expect(detachedFocusEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(cancelButton);

    cancelButton.focus();
    const escapeEvent = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true
    });
    dialog.element.dispatchEvent(escapeEvent);
    expect(escapeEvent.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(cancelButton);
  });

  it("does not trap focus when every action is disabled", () => {
    const wrapper = mount(LauncherSafetyOverlay, {
      attachTo: document.body,
      props: {
        safetyDialog: createSafetyDialog(),
        executing: true
      }
    });

    const dialog = wrapper.get(".safety-dialog");
    const tabEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true
    });
    dialog.element.dispatchEvent(tabEvent);

    expect(tabEvent.defaultPrevented).toBe(false);
    const footerButtons = wrapper.findAll("footer button");
    expect(footerButtons).toHaveLength(2);
    expect(footerButtons[0]!.attributes("disabled")).toBeDefined();
    expect(footerButtons[1]!.attributes("disabled")).toBeDefined();
  });
});
