import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import SSelect from "../SSelect.vue";

const originalScrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollIntoView"
);

const options = [
  { value: "ps", label: "PowerShell" },
  { value: "cmd", label: "Command Prompt" },
  { value: "wt", label: "Windows Terminal" }
];

describe("SSelect", () => {
  afterEach(() => {
    if (originalScrollIntoViewDescriptor) {
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScrollIntoViewDescriptor);
      return;
    }

    delete (HTMLElement.prototype as { scrollIntoView?: (arg?: unknown) => void }).scrollIntoView;
  });

  it("renders selected option label", () => {
    const wrapper = mount(SSelect, { props: { modelValue: "ps", options } });
    expect(wrapper.find(".s-select__trigger").text()).toContain("PowerShell");
  });

  it("renders descriptions only when the option provides one", async () => {
    const wrapper = mount(SSelect, {
      props: {
        modelValue: "ps",
        options: [
          { value: "ps", label: "PowerShell", description: "powershell.exe" },
          { value: "wt", label: "Windows Terminal" }
        ]
      },
      attachTo: document.body
    });

    await wrapper.find(".s-select__trigger").trigger("click");
    const renderedOptions = Array.from(document.body.querySelectorAll(".s-select__option"));
    expect(renderedOptions[0]?.textContent).toContain("powershell.exe");
    expect(renderedOptions[1]?.querySelector(".s-select__description")).toBeNull();
    wrapper.unmount();
  });

  it("keeps the trigger text label-only even when descriptions exist", () => {
    const wrapper = mount(SSelect, {
      props: {
        modelValue: "ps",
        options: [{ value: "ps", label: "PowerShell", description: "powershell.exe" }]
      }
    });

    expect(wrapper.find(".s-select__trigger").text()).toContain("PowerShell");
    expect(wrapper.find(".s-select__trigger").text()).not.toContain("powershell.exe");
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

  it("scrolls the focused option into view during keyboard navigation", async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView
    });

    const manyOptions = Array.from({ length: 30 }, (_, index) => ({
      value: `option-${index}`,
      label: `Option ${index}`
    }));

    const wrapper = mount(SSelect, {
      props: {
        modelValue: manyOptions[0]!.value,
        options: manyOptions
      },
      attachTo: document.body
    });

    await wrapper.find(".s-select__trigger").trigger("click");
    scrollIntoView.mockClear();

    await wrapper.find(".s-select__trigger").trigger("keydown", { key: "End" });

    const listboxId = document.body.querySelector("[role='listbox']")?.getAttribute("id");
    const lastOption = document.getElementById(`${listboxId}-option-29`);
    expect(scrollIntoView).toHaveBeenCalled();
    expect(scrollIntoView.mock.instances.at(-1)).toBe(lastOption);
    wrapper.unmount();
  });
});
