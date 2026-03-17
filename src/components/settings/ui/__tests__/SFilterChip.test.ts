import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import SFilterChip from "../SFilterChip.vue";

const options = [
  { value: "all", label: "全部来源" },
  { value: "builtin", label: "内置" },
  { value: "user", label: "用户" }
];

describe("SFilterChip", () => {
  it("renders default label when value equals defaultValue", () => {
    const wrapper = mount(SFilterChip, {
      props: { modelValue: "all", options, defaultValue: "all" }
    });
    expect(wrapper.find(".s-filter-chip--active").exists()).toBe(false);
    expect(wrapper.text()).toContain("全部来源");
  });

  it("shows active state when value differs from default", () => {
    const wrapper = mount(SFilterChip, {
      props: { modelValue: "user", options, defaultValue: "all" }
    });
    expect(wrapper.find(".s-filter-chip--active").exists()).toBe(true);
    expect(wrapper.text()).toContain("用户");
  });

  it("shows clear button when active", () => {
    const wrapper = mount(SFilterChip, {
      props: { modelValue: "user", options, defaultValue: "all" }
    });
    expect(wrapper.find(".s-filter-chip__clear").exists()).toBe(true);
  });

  it("emits defaultValue on clear click", async () => {
    const wrapper = mount(SFilterChip, {
      props: { modelValue: "user", options, defaultValue: "all" }
    });
    await wrapper.find(".s-filter-chip__clear").trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["all"]]);
  });

  it("opens dropdown and selects option", async () => {
    const wrapper = mount(SFilterChip, {
      props: { modelValue: "all", options, defaultValue: "all" },
      attachTo: document.body
    });
    await wrapper.find(".s-filter-chip__trigger").trigger("click");
    const items = Array.from(document.body.querySelectorAll("[role='option']"));
    items[2]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(wrapper.emitted("update:modelValue")).toEqual([["user"]]);
    wrapper.unmount();
  });
});

