import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import SettingsHotkeysSection from "../SettingsHotkeysSection.vue";
import SDropdown from "../../ui/SDropdown.vue";
import SHotkeyRecorder from "../../ui/SHotkeyRecorder.vue";

describe("SettingsHotkeysSection layout", () => {
  it("renders external muted group titles above each hotkey card", () => {
    const wrapper = mount(SettingsHotkeysSection, {
      props: {
        hotkeyGlobalFields: [{ id: "launcher", label: "唤起窗口", scope: "global" }],
        hotkeySearchFields: [
          { id: "switchFocus", label: "切换焦点区域", scope: "local" },
          { id: "openActionPanel", label: "打开动作面板", scope: "local" }
        ],
        hotkeyQueueFields: [{ id: "executeQueue", label: "执行队列", scope: "local" }],
        pointerActionFields: [
          { id: "leftClick", label: "搜索结果左键" },
          { id: "rightClick", label: "搜索结果右键" }
        ],
        pointerActionOptions: [
          { value: "action-panel", label: "动作面板" },
          { value: "execute", label: "执行" },
          { value: "stage", label: "入队" },
          { value: "copy", label: "复制" }
        ],
        getHotkeyValue: () => "Ctrl+K",
        getPointerActionValue: () => "action-panel",
        hotkeyErrorFields: ["switchFocus"],
        hotkeyErrorMessage: "duplicate hotkey"
      }
    });

    const titles = wrapper.findAll(".settings-hotkeys-group__title").map((item) => item.text().trim());
    expect(titles).toEqual(["全局快捷键", "搜索区快捷键", "鼠标操作", "队列快捷键"]);
    expect(wrapper.find(".settings-card__title").exists()).toBe(false);
    expect(wrapper.findAll(".settings-hotkeys-group")).toHaveLength(4);
    expect(wrapper.findAll(".settings-card")).toHaveLength(4);
    expect(wrapper.findAll(".settings-hotkeys-row__label")).toHaveLength(6);
    expect(wrapper.findAll(".settings-hotkeys-row__recorder")).toHaveLength(6);
    expect(wrapper.findAllComponents(SDropdown)).toHaveLength(2);
    expect(wrapper.text()).not.toContain("全局错误");
  });

  it("passes conflict text down to recorder rows instead of rendering a global banner", () => {
    const wrapper = mount(SettingsHotkeysSection, {
      props: {
        hotkeyGlobalFields: [{ id: "launcher", label: "唤起窗口", scope: "global" }],
        hotkeySearchFields: [{ id: "switchFocus", label: "切换焦点区域", scope: "local" }],
        hotkeyQueueFields: [{ id: "executeQueue", label: "执行队列", scope: "local" }],
        pointerActionFields: [
          { id: "leftClick", label: "搜索结果左键" },
          { id: "rightClick", label: "搜索结果右键" }
        ],
        pointerActionOptions: [
          { value: "action-panel", label: "动作面板" },
          { value: "execute", label: "执行" },
          { value: "stage", label: "入队" },
          { value: "copy", label: "复制" }
        ],
        getHotkeyValue: () => "Ctrl+K",
        getPointerActionValue: () => "action-panel",
        hotkeyErrorFields: ["switchFocus"],
        hotkeyErrorMessage: "duplicate hotkey"
      }
    });

    expect(wrapper.text()).not.toContain("全局错误");
    expect(wrapper.findAllComponents(SHotkeyRecorder)[1].props("conflict")).toContain("duplicate");
  });
});
