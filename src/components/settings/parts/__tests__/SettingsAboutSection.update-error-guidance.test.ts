import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";

import { setAppLocale } from "../../../../i18n";
import SettingsAboutSection from "../SettingsAboutSection.vue";

describe("SettingsAboutSection update error guidance", () => {
  afterEach(() => {
    setAppLocale("zh-CN");
  });

  it("shows permission-specific next step when updater capability is missing", () => {
    const wrapper = mount(SettingsAboutSection, {
      props: {
        appVersion: "0.1.0",
        runtimePlatform: "win",
        updateStatus: {
          state: "error",
          stage: "check",
          reason:
            "updater.check not allowed. Permissions associated with this command: updater:allow-check, updater:default"
        }
      }
    });

    expect(wrapper.text()).toContain("检查更新失败");
    expect(wrapper.text()).toContain("当前构建缺少更新权限");
  });

  it("keeps network guidance for generic check failures", () => {
    const wrapper = mount(SettingsAboutSection, {
      props: {
        appVersion: "0.1.0",
        runtimePlatform: "win",
        updateStatus: {
          state: "error",
          stage: "check",
          reason: "network timeout"
        }
      }
    });

    expect(wrapper.text()).toContain("下一步：请检查网络后重试“检查更新”。");
  });

  it("renders english permission guidance under en-US locale", () => {
    setAppLocale("en-US");
    const wrapper = mount(SettingsAboutSection, {
      props: {
        appVersion: "0.1.0",
        runtimePlatform: "win",
        updateStatus: {
          state: "error",
          stage: "check",
          reason:
            "updater.check not allowed. Permissions associated with this command: updater:allow-check, updater:default"
        }
      }
    });

    expect(wrapper.text()).toContain("Update check failed");
    expect(wrapper.text()).toContain("missing updater permission");
  });

  it("shows loading guidance while checking for updates", () => {
    const wrapper = mount(SettingsAboutSection, {
      props: {
        appVersion: "0.1.0",
        runtimePlatform: "win",
        updateStatus: {
          state: "checking"
        }
      }
    });

    expect(wrapper.find(".about-status--loading").exists()).toBe(true);
    expect(wrapper.text()).toContain("检查中");
  });
});
