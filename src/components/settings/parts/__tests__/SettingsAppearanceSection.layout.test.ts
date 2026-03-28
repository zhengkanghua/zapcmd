import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import { MOTION_PRESET_REGISTRY } from "../../../../features/motion/motionRegistry";
import { THEME_REGISTRY } from "../../../../features/themes/themeRegistry";
import SettingsAppearanceSection from "../SettingsAppearanceSection.vue";

describe("SettingsAppearanceSection layout", () => {
  it("renders theme, motion, effects and preview cards", () => {
    const wrapper = mount(SettingsAppearanceSection, {
      props: {
        windowOpacity: 0.96,
        theme: "obsidian",
        blurEnabled: true,
        motionPreset: "expressive",
        themes: THEME_REGISTRY,
        motionPresets: MOTION_PRESET_REGISTRY
      }
    });

    expect(wrapper.find("#settings-group-appearance").exists()).toBe(false);
    expect(wrapper.find(".appearance-card--theme").exists()).toBe(true);
    expect(wrapper.find(".appearance-card--motion").exists()).toBe(true);
    expect(wrapper.find(".appearance-card--effects").exists()).toBe(true);
    expect(wrapper.find(".appearance-card--preview").exists()).toBe(true);
  });

  it("marks the active theme card", () => {
    const wrapper = mount(SettingsAppearanceSection, {
      props: {
        windowOpacity: 0.96,
        theme: "linen",
        blurEnabled: true,
        motionPreset: "expressive",
        themes: THEME_REGISTRY,
        motionPresets: MOTION_PRESET_REGISTRY
      }
    });

    expect(wrapper.find(".theme-card--active").text()).toContain("亚麻纸");
  });

  it("renders both obsidian and linen theme cards", () => {
    const wrapper = mount(SettingsAppearanceSection, {
      props: {
        windowOpacity: 0.96,
        theme: "obsidian",
        blurEnabled: true,
        motionPreset: "expressive",
        themes: THEME_REGISTRY,
        motionPresets: MOTION_PRESET_REGISTRY
      }
    });

    const themeCards = wrapper.findAll(".theme-card");
    expect(themeCards).toHaveLength(2);
    expect(themeCards.map((card) => card.text())).toEqual(
      expect.arrayContaining(["黑曜石", "亚麻纸"])
    );
  });

  it("theme swatches 通过 theme preview scope 派生颜色，而不是内联 preview 色值", () => {
    const wrapper = mount(SettingsAppearanceSection, {
      props: {
        windowOpacity: 0.96,
        theme: "obsidian",
        blurEnabled: true,
        motionPreset: "expressive",
        themes: THEME_REGISTRY,
        motionPresets: MOTION_PRESET_REGISTRY
      }
    });

    const themeCard = wrapper.get(".theme-card");
    expect(themeCard.attributes("data-theme-preview")).toBe("obsidian");
    expect(wrapper.findAll(".theme-card__swatch").every((swatch) => !swatch.attributes("style"))).toBe(true);
  });

  it("shows blur-off copy when blur effect is disabled", () => {
    const wrapper = mount(SettingsAppearanceSection, {
      props: {
        windowOpacity: 0.96,
        theme: "linen",
        blurEnabled: false,
        motionPreset: "expressive",
        themes: THEME_REGISTRY,
        motionPresets: MOTION_PRESET_REGISTRY
      }
    });

    expect(wrapper.text()).toContain("已关闭");
  });

  it("renders two motion preset cards and marks the active one", () => {
    const wrapper = mount(SettingsAppearanceSection, {
      props: {
        windowOpacity: 0.96,
        theme: "obsidian",
        blurEnabled: true,
        motionPreset: "steady-tool",
        themes: THEME_REGISTRY,
        motionPresets: MOTION_PRESET_REGISTRY
      }
    });

    expect(wrapper.findAll(".motion-preset-card")).toHaveLength(2);
    expect(wrapper.find(".motion-preset-card--active").text()).toContain("steady-tool");
    expect(wrapper.text()).toContain("动画风格");
    expect(wrapper.text()).toContain("当前默认");
    expect(wrapper.text()).toContain("更稳");
  });
});
