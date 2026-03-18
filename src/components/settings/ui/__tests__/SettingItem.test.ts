import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import SettingItem from "../SettingItem.vue";

describe("SettingItem", () => {
  it("renders label, description and control slot", () => {
    const wrapper = mount(SettingItem, {
      props: {
        label: "默认终端",
        description: "执行命令时优先使用此终端。"
      },
      slots: {
        default: '<button type="button">PowerShell</button>'
      }
    });

    expect(wrapper.get(".setting-item__label").text()).toContain("默认终端");
    expect(wrapper.get(".setting-item__description").text()).toContain("执行命令时优先使用此终端");
    expect(wrapper.find(".setting-item__control").exists()).toBe(true);
  });
});
