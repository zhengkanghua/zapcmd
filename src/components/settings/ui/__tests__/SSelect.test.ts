import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import SSelect from "../SSelect.vue";

const options = [
  { value: "ps", label: "PowerShell" },
  { value: "cmd", label: "Command Prompt" },
  { value: "wt", label: "Windows Terminal" }
];

describe("SSelect", () => {
  it("renders selected option label", () => {
    const wrapper = mount(SSelect, { props: { modelValue: "ps", options } });
    expect(wrapper.find(".s-select__trigger").text()).toContain("PowerShell");
  });

  it("opens dropdown on click", async () => {
    const wrapper = mount(SSelect, { props: { modelValue: "ps", options } });
    await wrapper.find(".s-select__trigger").trigger("click");
    expect(document.body.querySelector("[role='listbox']")).not.toBeNull();
    wrapper.unmount();
  });

  it("emits update:modelValue on option select", async () => {
    const wrapper = mount(SSelect, {
      props: { modelValue: "ps", options },
      attachTo: document.body
    });
    await wrapper.find(".s-select__trigger").trigger("click");
    const items = Array.from(document.body.querySelectorAll("[role='option']"));
    items[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(wrapper.emitted("update:modelValue")).toEqual([["cmd"]]);
    wrapper.unmount();
  });

  it("closes on Escape", async () => {
    const wrapper = mount(SSelect, {
      props: { modelValue: "ps", options },
      attachTo: document.body
    });
    await wrapper.find(".s-select__trigger").trigger("click");
    expect(document.body.querySelector("[role='listbox']")).not.toBeNull();
    await wrapper.find(".s-select__trigger").trigger("keydown", { key: "Escape" });
    expect(document.body.querySelector("[role='listbox']")).toBeNull();
    wrapper.unmount();
  });

  it("navigates with ArrowDown/ArrowUp", async () => {
    const wrapper = mount(SSelect, {
      props: { modelValue: "ps", options },
      attachTo: document.body
    });
    await wrapper.find(".s-select__trigger").trigger("click");
    await wrapper.find(".s-select__trigger").trigger("keydown", { key: "ArrowDown" });
    await wrapper.find(".s-select__trigger").trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("update:modelValue")).toEqual([["cmd"]]);
    wrapper.unmount();
  });
});
