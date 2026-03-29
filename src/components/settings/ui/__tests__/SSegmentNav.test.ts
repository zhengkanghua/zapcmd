import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import SSegmentNav from "../SSegmentNav.vue";
import type { SettingsNavIconName } from "../settingsNavIcon";

const items: Array<{ id: string; label: string; icon: SettingsNavIconName }> = [
  { id: "hotkeys", label: "快捷键", icon: "hotkeys" },
  { id: "general", label: "通用", icon: "general" },
  { id: "commands", label: "命令", icon: "commands" }
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

  it("renders controlled svg icons instead of raw icon name text", () => {
    const wrapper = mount(SSegmentNav, {
      props: { items, modelValue: "general" }
    });

    expect(wrapper.findAll(".s-segment-nav__icon svg")).toHaveLength(3);
    expect(wrapper.text()).not.toContain("hotkeys");
    expect(wrapper.text()).not.toContain("general");
    expect(wrapper.text()).not.toContain("commands");
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

  it("associates tabs with their panels and keeps focus in sync", async () => {
    const itemsWithPanel: Array<{
      id: string;
      label: string;
      icon: SettingsNavIconName;
      panelId: string;
    }> = [
      { id: "hotkeys", label: "快捷键", icon: "hotkeys", panelId: "settings-panel-hotkeys" },
      { id: "general", label: "通用", icon: "general", panelId: "settings-panel-general" }
    ];

    const attachPoint = document.createElement("div");
    document.body.appendChild(attachPoint);

    let wrapper: ReturnType<typeof mount> | null = null;
    const handleModelUpdate = (value: string) => {
      wrapper?.setProps({ modelValue: value });
    };

    wrapper = mount(SSegmentNav, {
      props: { items: itemsWithPanel, modelValue: "hotkeys", "onUpdate:modelValue": handleModelUpdate },
      attachTo: attachPoint
    });

    try {
      const tabs = wrapper.findAll("[role='tab']");
      expect(tabs[0].attributes("id")).toBe("settings-tab-hotkeys");
      expect(tabs[0].attributes("aria-controls")).toBe("settings-panel-hotkeys");

      const firstTabButton = tabs[0].element as HTMLButtonElement;
      firstTabButton.focus();
      await tabs[0].trigger("keydown", { key: "ArrowRight" });

      expect(document.activeElement).toBe(tabs[1].element);
      expect(tabs[1].attributes("aria-selected")).toBe("true");
      expect(tabs[1].attributes("tabindex")).toBe("0");
      expect(tabs[0].attributes("tabindex")).toBe("-1");
    } finally {
      wrapper?.unmount();
      attachPoint.remove();
    }
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

  it("keeps every tab at a 36px hit target floor", () => {
    const wrapper = mount(SSegmentNav, {
      props: { items, modelValue: "general" }
    });

    for (const tab of wrapper.findAll("[role='tab']")) {
      expect(tab.classes()).toContain("min-h-[36px]");
    }
  });

  it("no-ops when there are no items", async () => {
    const wrapper = mount(SSegmentNav, {
      props: { items: [], modelValue: "missing" }
    });

    await wrapper.get("[role='tablist']").trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });
});
