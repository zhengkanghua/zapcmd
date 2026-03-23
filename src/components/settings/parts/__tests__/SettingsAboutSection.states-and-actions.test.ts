import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import SettingsAboutSection from "../SettingsAboutSection.vue";

describe("SettingsAboutSection states and actions", () => {
  it("exposes available update actions and release body", async () => {
    const wrapper = mount(SettingsAboutSection, {
      props: {
        appVersion: "1.2.3",
        runtimePlatform: "win32",
        updateStatus: {
          state: "available",
          version: "2.0.0",
          body: "Bug fixes"
        }
      }
    });

    const actions = wrapper.findAll(".about-actions button");
    expect(actions).toHaveLength(3);
    expect(wrapper.text()).toContain("2.0.0");
    expect(wrapper.text()).toContain("Bug fixes");

    await actions[0]!.trigger("click");
    await actions[1]!.trigger("click");
    await actions[2]!.trigger("click");

    expect(wrapper.emitted("check-update")).toHaveLength(1);
    expect(wrapper.emitted("download-update")).toHaveLength(1);
    expect(wrapper.emitted("open-homepage")).toHaveLength(1);
  });

  it("keeps download action for download/install failures with a version", async () => {
    const wrapper = mount(SettingsAboutSection, {
      props: {
        appVersion: "1.2.3",
        runtimePlatform: "win32",
        updateStatus: {
          state: "error",
          stage: "download",
          reason: "network timeout",
          version: "2.0.0"
        }
      }
    });

    expect(wrapper.find(".about-status--error").exists()).toBe(true);
    const actions = wrapper.findAll(".about-actions button");
    expect(actions).toHaveLength(3);

    await actions[1]!.trigger("click");
    expect(wrapper.emitted("download-update")).toHaveLength(1);

    await wrapper.setProps({
      updateStatus: {
        state: "error",
        stage: "install",
        reason: "installer blocked",
        version: "2.0.0"
      }
    });

    expect(wrapper.find(".about-status--error").text()).toContain("installer blocked");
    const updatedActions = wrapper.findAll(".about-actions button");
    expect(updatedActions).toHaveLength(3);
  });

  it("renders downloading and installing progress states with disabled recheck action", async () => {
    const wrapper = mount(SettingsAboutSection, {
      props: {
        appVersion: "1.2.3",
        runtimePlatform: "win32",
        updateStatus: {
          state: "downloading",
          progressPercent: 42,
          version: "2.0.0"
        }
      }
    });

    const actions = wrapper.findAll(".about-actions button");
    expect(actions.length).toBeGreaterThanOrEqual(1);
    expect(actions[0]!.attributes("disabled")).toBeDefined();
    expect(wrapper.get("progress").attributes("value")).toBe("42");
    expect(wrapper.find(".about-status--loading").text()).toContain("42");

    await wrapper.setProps({
      updateStatus: {
        state: "installing",
        version: "2.0.0"
      }
    });

    const updatedActions = wrapper.findAll(".about-actions button");
    expect(updatedActions.length).toBeGreaterThanOrEqual(1);
    expect(updatedActions[0]!.attributes("disabled")).toBeDefined();
    expect(wrapper.find("progress").exists()).toBe(false);
    expect(wrapper.find(".about-status--loading").text()).toContain("安装");
  });
});
