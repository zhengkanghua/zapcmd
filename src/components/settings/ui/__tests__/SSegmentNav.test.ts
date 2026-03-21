import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import SSegmentNav from "../SSegmentNav.vue";

const items = [
  { id: "hotkeys", label: "快捷键", icon: "⌨" },
  { id: "general", label: "通用", icon: "⚙" },
  { id: "commands", label: "命令", icon: "☰" }
];

describe("SSegmentNav", () => {
  it("renders all nav items", () => {
    const wrapper = mount(SSegmentNav, {
      props: { items, modelValue: "hotkeys" }
    });
    expect(wrapper.get("[role='tablist']").classes()).toContain("s-segment-nav");
    expect(wrapper.findAll("[role='tab']")).toHaveLength(3);
    expect(wrapper.findAll("[role='tab']").every((tab) => tab.attributes("type") === "button")).toBe(true);
  });

  it("marks active tab with aria-selected", () => {
    const wrapper = mount(SSegmentNav, {
      props: { items, modelValue: "general" }
    });
    const tabs = wrapper.findAll("[role='tab']");
    expect(tabs[1].attributes("aria-selected")).toBe("true");
    expect(tabs[0].attributes("aria-selected")).toBe("false");
  });

  it("emits update:modelValue on click", async () => {
    const wrapper = mount(SSegmentNav, {
      props: { items, modelValue: "hotkeys" }
    });
    await wrapper.findAll("[role='tab']")[2].trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["commands"]]);
  });

  it("supports keyboard navigation with ArrowRight/ArrowLeft", async () => {
    const wrapper = mount(SSegmentNav, {
      props: { items, modelValue: "hotkeys" }
    });
    const tablist = wrapper.find("[role='tablist']");
    await tablist.trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.emitted("update:modelValue")).toEqual([["general"]]);
  });

  it("keeps tablist semantics without relying on a shell wrapper", () => {
    const wrapper = mount(SSegmentNav, {
      props: { items, modelValue: "hotkeys" }
    });

    expect(wrapper.get("[role='tablist']").classes()).toContain("s-segment-nav");
    expect(wrapper.findAll(".s-segment-nav__tab--active")).toHaveLength(1);
  });

  it("supports ArrowDown/ArrowUp/Home/End and ignores unrelated keys", async () => {
    const wrapper = mount(SSegmentNav, {
      props: { items, modelValue: "general" }
    });

    const tablist = wrapper.get("[role='tablist']");
    await tablist.trigger("keydown", { key: "ArrowDown" });
    await tablist.trigger("keydown", { key: "ArrowUp" });
    await tablist.trigger("keydown", { key: "Home" });
    await tablist.trigger("keydown", { key: "End" });
    await tablist.trigger("keydown", { key: "Escape" });

    expect(wrapper.emitted("update:modelValue")).toEqual([
      ["commands"],
      ["hotkeys"],
      ["hotkeys"],
      ["commands"]
    ]);
  });

  it("no-ops when there are no items", async () => {
    const wrapper = mount(SSegmentNav, {
      props: { items: [], modelValue: "missing" }
    });

    await wrapper.get("[role='tablist']").trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });
});
