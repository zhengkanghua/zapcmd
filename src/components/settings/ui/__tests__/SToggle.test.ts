import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import SToggle from "../SToggle.vue";

describe("SToggle", () => {
  it("renders on state when modelValue is true", () => {
    const wrapper = mount(SToggle, { props: { modelValue: true } });
    expect(wrapper.find("[role='switch']").attributes("aria-checked")).toBe("true");
  });

  it("renders off state when modelValue is false", () => {
    const wrapper = mount(SToggle, { props: { modelValue: false } });
    expect(wrapper.find("[role='switch']").attributes("aria-checked")).toBe("false");
  });

  it("emits update:modelValue on click", async () => {
    const wrapper = mount(SToggle, { props: { modelValue: false } });
    await wrapper.find("[role='switch']").trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([[true]]);
  });

  it("emits update:modelValue on Space keydown", async () => {
    const wrapper = mount(SToggle, { props: { modelValue: true } });
    await wrapper.find("[role='switch']").trigger("keydown", { key: " " });
    expect(wrapper.emitted("update:modelValue")).toEqual([[false]]);
  });

  it("supports compact size via prop", () => {
    const wrapper = mount(SToggle, { props: { modelValue: true, compact: true } });
    expect(wrapper.find(".s-toggle--compact").exists()).toBe(true);
  });

  it("is disabled when disabled prop is true", async () => {
    const wrapper = mount(SToggle, { props: { modelValue: false, disabled: true } });
    await wrapper.find("[role='switch']").trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });
});

