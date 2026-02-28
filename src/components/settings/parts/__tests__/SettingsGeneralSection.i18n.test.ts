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
        terminalDropdownOpen: false,
        terminalFocusIndex: -1,
        defaultTerminal: "powershell",
        selectedTerminalOption: { id: "powershell", label: "PowerShell", path: "powershell.exe" },
        selectedTerminalPath: "powershell.exe",
        language: "zh-CN",
        languageOptions: [
          { value: "zh-CN", label: "简体中文" },
          { value: "en-US", label: "English" }
        ],
        autoCheckUpdate: true,
        launchAtLogin: false
      }
    });

    expect(wrapper.text()).toContain("通用");
    expect(wrapper.text()).toContain("默认终端");

    setAppLocale("en-US");
    await nextTick();

    expect(wrapper.text()).toContain("General");
    expect(wrapper.text()).toContain("Default terminal");
  });
});
