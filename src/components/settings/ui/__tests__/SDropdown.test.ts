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

  it("keeps a 36px trigger hit target floor", () => {
    const wrapper = mountDropdown({
      props: {
        modelValue: "powershell",
        options: [
          { value: "powershell", label: "PowerShell" },
          { value: "cmd", label: "Command Prompt" }
        ]
      }
    });

    expect(wrapper.get(".s-dropdown__trigger").classes()).toContain("min-h-[36px]");
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
      attrs: {
        "aria-label": "默认终端"
      },
      attachTo: document.body
    });

    const trigger = wrapper.get(".s-dropdown__trigger");
    expect(trigger.attributes("role")).toBe("combobox");
    expect(trigger.attributes("aria-label")).toBe("默认终端");

    await trigger.trigger("keydown", { key: "ArrowDown" });
    await trigger.trigger("keydown", { key: "ArrowDown" });
    await trigger.trigger("keydown", { key: "Enter" });

    expect(wrapper.emitted("update:modelValue")).toEqual([["cmd"]]);

    await wrapper.setProps({ modelValue: "cmd" });
    await trigger.trigger("click");
    expect(trigger.attributes("aria-expanded")).toBe("true");
    expect(trigger.attributes("aria-controls")).toBeTruthy();
    expect(trigger.attributes("aria-activedescendant")).toContain("-option-");
    await trigger.trigger("keydown", { key: "Escape" });

    expect(document.body.querySelector(".s-dropdown__panel")).toBeNull();
  });

  it("supports ArrowUp opening, Home/End focus movement, Space selection and Tab close", async () => {
    const wrapper = mountDropdown({
      props: {
        modelValue: "powershell",
        options: [
          { value: "powershell", label: "PowerShell" },
          { value: "cmd", label: "Command Prompt" },
          { value: "wt", label: "Windows Terminal" }
        ]
      },
      attachTo: document.body
    });

    const trigger = wrapper.get(".s-dropdown__trigger");
    await trigger.trigger("keydown", { key: "ArrowUp" });
    let options = Array.from(document.body.querySelectorAll(".s-dropdown__option"));
    expect(options[2]?.classList.contains("s-dropdown__option--focused")).toBe(true);

    await trigger.trigger("keydown", { key: "Home" });
    options = Array.from(document.body.querySelectorAll(".s-dropdown__option"));
    expect(options[0]?.classList.contains("s-dropdown__option--focused")).toBe(true);

    await trigger.trigger("keydown", { key: "End" });
    options = Array.from(document.body.querySelectorAll(".s-dropdown__option"));
    expect(options[2]?.classList.contains("s-dropdown__option--focused")).toBe(true);

    await trigger.trigger("keydown", { key: " " });
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["wt"]);

    await wrapper.setProps({ modelValue: "wt" });
    await trigger.trigger("click");
    await trigger.trigger("keydown", { key: "Tab" });
    expect(document.body.querySelector(".s-dropdown__panel")).toBeNull();
  });

  it("stays closed when disabled or when options are empty and falls back to first option label", async () => {
    const wrapper = mountDropdown({
      props: {
        modelValue: "missing",
        disabled: true,
        options: [
          { value: "powershell", label: "PowerShell" },
          { value: "cmd", label: "Command Prompt" }
        ]
      },
      attachTo: document.body
    });

    expect(wrapper.get(".s-dropdown__value").text()).toBe("PowerShell");
    expect(wrapper.get(".s-dropdown__trigger").attributes("disabled")).toBeDefined();
    await wrapper.get(".s-dropdown__trigger").trigger("click");
    expect(document.body.querySelector(".s-dropdown__panel")).toBeNull();

    await wrapper.setProps({
      disabled: false,
      options: []
    });
    expect(wrapper.get(".s-dropdown__trigger").attributes("disabled")).toBeDefined();
    await wrapper.get(".s-dropdown__trigger").trigger("keydown", { key: "Enter" });
    expect(document.body.querySelector(".s-dropdown__panel")).toBeNull();
  });
});
