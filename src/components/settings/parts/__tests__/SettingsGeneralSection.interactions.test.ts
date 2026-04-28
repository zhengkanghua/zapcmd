import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { describe, expect, it } from "vitest";

import SDropdown from "../../ui/SDropdown.vue";
import SettingsGeneralSection from "../SettingsGeneralSection.vue";

function createProps(
  overrides: Partial<InstanceType<typeof SettingsGeneralSection>["$props"]> = {}
) {
  return {
    availableTerminals: [{ id: "powershell", label: "PowerShell", path: "powershell.exe" }],
    terminalLoading: false,
    defaultTerminal: "powershell",
    terminalReusePolicy: "never" as const,
    selectedTerminalPath: "powershell.exe",
    language: "zh-CN" as const,
    languageOptions: [
      { value: "zh-CN" as const, label: "简体中文" },
      { value: "en-US" as const, label: "English" }
    ],
    autoCheckUpdate: true,
    launchAtLogin: false,
    alwaysElevatedTerminal: false,
    queueAutoClearOnSuccess: true,
    generalErrorMessage: "",
    showAlwaysElevatedTerminal: true,
    ...overrides
  };
}

describe("SettingsGeneralSection interactions", () => {
  it("emits refresh-terminals when the rescan button is clicked", async () => {
    const wrapper = mount(SettingsGeneralSection, {
      props: createProps()
    });

    await wrapper.get(".settings-general__refresh-terminals").trigger("click");

    expect(wrapper.emitted("refresh-terminals")).toHaveLength(1);
  });

  it("forwards dropdown and toggle actions", async () => {
    const wrapper = mount(SettingsGeneralSection, {
      props: createProps()
    });

    const dropdowns = wrapper.findAllComponents(SDropdown);
    dropdowns[0]!.vm.$emit("update:modelValue", "powershell");
    dropdowns[1]!.vm.$emit("update:modelValue", "normal-and-elevated");
    dropdowns[2]!.vm.$emit("update:modelValue", "en-US");
    await nextTick();

    const toggles = wrapper.findAll(".s-toggle");
    await toggles[0]!.trigger("click");
    await toggles[1]!.trigger("click");
    await toggles[2]!.trigger("click");
    await toggles[3]!.trigger("click");

    expect(wrapper.emitted("select-terminal")?.[0]).toEqual(["powershell"]);
    expect(wrapper.emitted("set-terminal-reuse-policy")?.[0]).toEqual(["normal-and-elevated"]);
    expect(wrapper.emitted("select-language")?.[0]).toEqual(["en-US"]);
    expect(wrapper.emitted("set-auto-check-update")?.[0]).toEqual([false]);
    expect(wrapper.emitted("set-launch-at-login")?.[0]).toEqual([true]);
    expect(wrapper.emitted("set-queue-auto-clear-on-success")?.[0]).toEqual([false]);
    expect(wrapper.emitted("set-always-elevated-terminal")?.[0]).toEqual([true]);
  });

  it("switches terminal dropdown between loading, empty and normal states", async () => {
    const wrapper = mount(SettingsGeneralSection, {
      props: createProps({
        terminalLoading: true,
        availableTerminals: [],
        defaultTerminal: "",
        selectedTerminalPath: ""
      })
    });

    let dropdowns = wrapper.findAllComponents(SDropdown);
    expect(dropdowns[0]!.props("disabled")).toBe(true);
    expect((dropdowns[0]!.props("options") as Array<{ value: string; label: string }>)[0]?.value).toBe(
      "__loading__"
    );
    expect(wrapper.get(".settings-general__refresh-terminals").attributes("disabled")).toBeDefined();
    expect(wrapper.find(".settings-status--loading").exists()).toBe(true);

    await wrapper.setProps({
      terminalLoading: false,
      availableTerminals: []
    });
    await nextTick();

    dropdowns = wrapper.findAllComponents(SDropdown);
    expect(dropdowns[0]!.props("disabled")).toBe(true);
    expect((dropdowns[0]!.props("options") as Array<{ value: string; label: string }>)[0]?.value).toBe("");
    expect(wrapper.get(".settings-general__refresh-terminals").attributes("disabled")).toBeUndefined();
    expect(wrapper.find(".settings-status--loading").exists()).toBe(false);

    await wrapper.setProps({
      availableTerminals: [{ id: "wt", label: "Windows Terminal", path: "wt.exe" }],
      defaultTerminal: "wt",
      selectedTerminalPath: "wt.exe"
    });
    await nextTick();

    dropdowns = wrapper.findAllComponents(SDropdown);
    expect(dropdowns[0]!.props("disabled")).toBe(false);
    expect(dropdowns[0]!.props("modelValue")).toBe("wt");
    expect(wrapper.get(".settings-general__refresh-terminals").attributes("disabled")).toBeUndefined();
    expect(wrapper.get("code.settings-card__mono").text()).toBe("wt.exe");
  });

  it("renders a visible error banner for general settings failures", () => {
    const wrapper = mount(SettingsGeneralSection, {
      props: createProps({
        generalErrorMessage: "autostart read failed"
      }) as never
    });

    expect(wrapper.get(".settings-status--error").text()).toContain("autostart read failed");
  });
});
