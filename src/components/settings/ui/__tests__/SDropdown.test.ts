import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";

import SDropdown from "../SDropdown.vue";

const wrappers: VueWrapper[] = [];

function mountDropdown(options: Parameters<typeof mount<typeof SDropdown>>[1]) {
  const wrapper = mount(SDropdown, options);
  wrappers.push(wrapper);
  return wrapper;
}

describe("SDropdown", () => {
  afterEach(() => {
    while (wrappers.length > 0) {
      wrappers.pop()?.unmount();
    }
    document.body.innerHTML = "";
  });

  it("renders default variant with fixed trigger style", () => {
    const wrapper = mountDropdown({
      props: {
        modelValue: "powershell",
        variant: "default",
        options: [
          { value: "powershell", label: "PowerShell" },
          { value: "cmd", label: "Command Prompt" }
        ]
      }
    });

    expect(wrapper.get(".s-dropdown__trigger").classes()).toContain("s-dropdown__trigger--default");
  });

  it("renders ghost variant with toolbar style", () => {
    const wrapper = mountDropdown({
      props: {
        modelValue: "powershell",
        variant: "ghost",
        options: [
          { value: "powershell", label: "PowerShell" },
          { value: "cmd", label: "Command Prompt" }
        ]
      }
    });

    expect(wrapper.get(".s-dropdown__trigger").classes()).toContain("s-dropdown__trigger--ghost");
  });

  it("shows check icon for selected option", async () => {
    const wrapper = mountDropdown({
      props: {
        modelValue: "powershell",
        options: [
          { value: "powershell", label: "PowerShell" },
          { value: "cmd", label: "Command Prompt" }
        ]
      },
      attachTo: document.body
    });

    await wrapper.get(".s-dropdown__trigger").trigger("click");

    expect(document.body.querySelector(".s-dropdown__option--selected .s-dropdown__check")).not.toBeNull();
  });

  it("closes on outside pointerdown", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    const wrapper = mountDropdown({
      props: {
        modelValue: "powershell",
        options: [
          { value: "powershell", label: "PowerShell" },
          { value: "cmd", label: "Command Prompt" }
        ]
      },
      attachTo: host
    });

    await wrapper.get(".s-dropdown__trigger").trigger("click");
    document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(document.body.querySelector(".s-dropdown__panel")).toBeNull();
  });

  it("supports ArrowDown / ArrowUp / Enter / Escape", async () => {
    const wrapper = mountDropdown({
      props: {
        modelValue: "powershell",
        options: [
          { value: "powershell", label: "PowerShell" },
          { value: "cmd", label: "Command Prompt" }
        ]
      },
      attachTo: document.body
    });

    await wrapper.get(".s-dropdown__trigger").trigger("keydown", { key: "ArrowDown" });
    await wrapper.get(".s-dropdown__trigger").trigger("keydown", { key: "ArrowDown" });
    await wrapper.get(".s-dropdown__trigger").trigger("keydown", { key: "Enter" });

    expect(wrapper.emitted("update:modelValue")).toEqual([["cmd"]]);

    await wrapper.setProps({ modelValue: "cmd" });
    await wrapper.get(".s-dropdown__trigger").trigger("click");
    await wrapper.get(".s-dropdown__trigger").trigger("keydown", { key: "Escape" });

    expect(document.body.querySelector(".s-dropdown__panel")).toBeNull();
  });
});
