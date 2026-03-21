import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, describe, expect, it } from "vitest";

import { setAppLocale } from "../../../../i18n";
import SettingsGeneralSection from "../SettingsGeneralSection.vue";

describe("SettingsGeneralSection i18n", () => {
  afterEach(() => {
    setAppLocale("zh-CN");
  });

  it("renders text by current locale", async () => {
    const wrapper = mount(SettingsGeneralSection, {
      props: {
        availableTerminals: [{ id: "powershell", label: "PowerShell", path: "powershell.exe" }],
        terminalLoading: false,
        defaultTerminal: "powershell",
        selectedTerminalPath: "powershell.exe",
        language: "zh-CN",
        languageOptions: [
          { value: "zh-CN", label: "简体中文" },
          { value: "en-US", label: "English" }
        ],
        autoCheckUpdate: true,
        launchAtLogin: false,
        alwaysElevatedTerminal: false
      }
    });

    expect(wrapper.text()).not.toContain("通用");
    expect(wrapper.text()).toContain("启动");
    expect(wrapper.text()).toContain("终端");
    expect(wrapper.text()).toContain("界面");
    expect(wrapper.text()).toContain("默认终端");
    expect(wrapper.text()).toContain("始终调用管理员权限终端");
    expect(wrapper.findAll(".setting-item")).toHaveLength(6);
    expect(wrapper.find(".setting-item__description").exists()).toBe(true);
    const trigger = wrapper.get(".s-dropdown__trigger");
    expect(trigger.text()).toContain("PowerShell");
    expect(trigger.text()).not.toContain("powershell.exe");
    const terminalPath = wrapper.get("code.settings-card__mono");
    expect(terminalPath.text()).toContain("powershell.exe");
    expect(wrapper.find("#settings-general-interface").exists()).toBe(true);

    setAppLocale("en-US");
    await nextTick();

    expect(wrapper.text()).not.toContain("General");
    expect(wrapper.text()).toContain("Startup");
    expect(wrapper.text()).toContain("Terminal");
    expect(wrapper.text()).toContain("Interface");
    expect(wrapper.text()).toContain("Default terminal");
    expect(wrapper.text()).toContain("Always use elevated terminal");
  });
});
