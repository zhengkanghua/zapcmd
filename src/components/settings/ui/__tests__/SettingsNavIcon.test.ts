import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import SettingsNavIcon from "../SettingsNavIcon.vue";

describe("SettingsNavIcon", () => {
  it("renders deterministic svg output for every supported settings icon", () => {
    const iconNames = ["hotkeys", "general", "commands", "appearance", "about"] as const;

    for (const name of iconNames) {
      const wrapper = mount(SettingsNavIcon, {
        props: { name }
      });

      expect(wrapper.get("svg").attributes("aria-hidden")).toBe("true");
      expect(wrapper.text()).toBe("");
    }
  });
});
