import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import { THEME_REGISTRY } from "../../../../features/themes/themeRegistry";
import SettingsAppearanceSection from "../SettingsAppearanceSection.vue";

describe("SettingsAppearanceSection layout", () => {
  it("renders theme, effects and preview cards", () => {
    const wrapper = mount(SettingsAppearanceSection, {
      props: {
        windowOpacity: 0.96,
        theme: "obsidian",
        blurEnabled: true,
        themes: THEME_REGISTRY
      }
    });

    expect(wrapper.find("#settings-group-appearance").exists()).toBe(false);
    expect(wrapper.find(".appearance-card--theme").exists()).toBe(true);
    expect(wrapper.find(".appearance-card--effects").exists()).toBe(true);
    expect(wrapper.find(".appearance-card--preview").exists()).toBe(true);
  });

  it("marks the active theme card", () => {
    const wrapper = mount(SettingsAppearanceSection, {
      props: {
        windowOpacity: 0.96,
        theme: "obsidian",
        blurEnabled: true,
        themes: THEME_REGISTRY
      }
    });

    expect(wrapper.find(".theme-card--active").text()).toContain("黑曜石");
  });

  it("theme swatches 通过 theme preview scope 派生颜色，而不是内联 preview 色值", () => {
    const wrapper = mount(SettingsAppearanceSection, {
      props: {
        windowOpacity: 0.96,
        theme: "obsidian",
        blurEnabled: true,
        themes: THEME_REGISTRY
      }
    });

    const themeCard = wrapper.get(".theme-card");
    expect(themeCard.attributes("data-theme-preview")).toBe("obsidian");
    expect(wrapper.findAll(".theme-card__swatch").every((swatch) => !swatch.attributes("style"))).toBe(true);
  });
});
