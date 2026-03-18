import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import SettingsHotkeysSection from "../SettingsHotkeysSection.vue";
import SHotkeyRecorder from "../../ui/SHotkeyRecorder.vue";

describe("SettingsHotkeysSection layout", () => {
  it("renders each hotkey section inside settings-card", () => {
    const wrapper = mount(SettingsHotkeysSection, {
      props: {
        hotkeyGlobalFields: [{ id: "launcher", label: "唤起窗口", scope: "global" }],
        hotkeySearchFields: [{ id: "switchFocus", label: "切换焦点区域", scope: "local" }],
        hotkeyQueueFields: [{ id: "executeQueue", label: "执行队列", scope: "local" }],
        getHotkeyValue: () => "Ctrl+K",
        hotkeyErrorFields: ["switchFocus"],
        hotkeyErrorMessage: "duplicate hotkey"
      }
    });

    expect(wrapper.findAll(".settings-card")).toHaveLength(3);
    expect(wrapper.find(".settings-hotkeys-row__label").exists()).toBe(true);
    expect(wrapper.find(".settings-hotkeys-row__recorder").exists()).toBe(true);
  });

  it("passes conflict text down to recorder rows instead of rendering a global banner", () => {
    const wrapper = mount(SettingsHotkeysSection, {
      props: {
        hotkeyGlobalFields: [{ id: "launcher", label: "唤起窗口", scope: "global" }],
        hotkeySearchFields: [{ id: "switchFocus", label: "切换焦点区域", scope: "local" }],
        hotkeyQueueFields: [{ id: "executeQueue", label: "执行队列", scope: "local" }],
        getHotkeyValue: () => "Ctrl+K",
        hotkeyErrorFields: ["switchFocus"],
        hotkeyErrorMessage: "duplicate hotkey"
      }
    });

    expect(wrapper.text()).not.toContain("全局错误");
    expect(wrapper.findAllComponents(SHotkeyRecorder)[1].props("conflict")).toContain("duplicate");
  });
});
