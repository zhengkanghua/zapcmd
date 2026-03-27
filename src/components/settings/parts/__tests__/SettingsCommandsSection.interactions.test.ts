import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, describe, expect, it } from "vitest";

import type { CommandManagementViewState } from "../../../../features/settings/types";
import type { SettingsCommandsProps } from "../../types";
import SDropdown from "../../ui/SDropdown.vue";
import SettingsCommandsSection from "../SettingsCommandsSection.vue";

function createCommandView(
  overrides: Partial<CommandManagementViewState> = {}
): CommandManagementViewState {
  return {
    query: "",
    sourceFilter: "all",
    statusFilter: "all",
    categoryFilter: "all",
    overrideFilter: "all",
    issueFilter: "all",
    fileFilter: "all",
    sortBy: "default",
    displayMode: "list",
    ...overrides
  };
}

function createProps(
  overrides: Partial<SettingsCommandsProps> = {}
): SettingsCommandsProps {
  return {
    commandRows: [
      {
        id: "docker.logs",
        title: "查看容器日志",
        category: "docker",
        source: "builtin" as const,
        enabled: true,
        overridesBuiltin: false,
        hasLoadIssue: false
      },
      {
        id: "user.echo",
        title: "用户命令",
        category: "custom",
        source: "user" as const,
        sourcePath: "commands/user.json",
        enabled: false,
        overridesBuiltin: false,
        hasLoadIssue: true
      }
    ],
    commandSummary: {
      total: 2,
      enabled: 1,
      disabled: 1,
      userDefined: 1,
      overridden: 0
    },
    commandLoadIssues: [],
    commandFilteredCount: 2,
    commandView: createCommandView(),
    commandSourceOptions: [
      { value: "all" as const, label: "来源-全部" },
      { value: "builtin" as const, label: "来源-内置" },
      { value: "user" as const, label: "来源-用户" }
    ],
    commandStatusOptions: [
      { value: "all" as const, label: "状态-全部" },
      { value: "enabled" as const, label: "状态-启用" },
      { value: "disabled" as const, label: "状态-禁用" }
    ],
    commandCategoryOptions: [
      { value: "all", label: "分类-全部" },
      { value: "docker", label: "分类-docker" },
      { value: "custom", label: "分类-custom" }
    ],
    commandOverrideOptions: [
      { value: "all" as const, label: "覆盖-全部" },
      { value: "overridden" as const, label: "覆盖-仅覆盖" }
    ],
    commandIssueOptions: [
      { value: "all" as const, label: "问题-全部" },
      { value: "with-issues" as const, label: "问题-仅问题" }
    ],
    commandSortOptions: [
      { value: "default" as const, label: "排序-默认" },
      { value: "title" as const, label: "排序-标题" }
    ],
    commandDisplayModeOptions: [{ value: "list" as const, label: "列表" }],
    commandSourceFileOptions: [
      { value: "builtin.json", label: "内置文件", count: 1 },
      { value: "user.json", label: "用户文件", count: 1 }
    ],
    commandGroups: [],
    ...overrides
  };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("SettingsCommandsSection interactions", () => {
  it("emits search, primary filter and toggle patches", async () => {
    const wrapper = mount(SettingsCommandsSection, {
      props: createProps()
    });

    await wrapper.get(".settings-commands-toolbar__search").setValue("docker");

    const dropdowns = wrapper.findAllComponents(SDropdown);
    dropdowns[0]!.vm.$emit("update:modelValue", "user");
    dropdowns[1]!.vm.$emit("update:modelValue", "docker");
    dropdowns[2]!.vm.$emit("update:modelValue", "disabled");
    dropdowns[3]!.vm.$emit("update:modelValue", "title");
    await nextTick();

    await wrapper.findAll(".s-toggle")[1]!.trigger("click");

    const patches = (wrapper.emitted("update-view") ?? []).map((event) => event[0]);
    expect(patches).toContainEqual({ query: "docker" });
    expect(patches).toContainEqual({ sourceFilter: "user" });
    expect(patches).toContainEqual({ categoryFilter: "docker" });
    expect(patches).toContainEqual({ statusFilter: "disabled" });
    expect(patches).toContainEqual({ sortBy: "title" });
    expect(wrapper.emitted("toggle-command-enabled")?.[0]).toEqual(["user.echo", true]);
  });

  it("manages more filters panel, secondary filters, reset and outside close", async () => {
    const wrapper = mount(SettingsCommandsSection, {
      attachTo: document.body,
      props: createProps({
        commandLoadIssues: [
          {
            code: "invalid-json",
            stage: "parse",
            sourceId: "user.json",
            reason: "Unexpected token",
            message: "user.json 解析失败"
          }
        ],
        commandView: createCommandView({
          query: "docker",
          fileFilter: "builtin.json"
        })
      })
    });

    expect(wrapper.get("[aria-label='command-load-issues']").text()).toContain("user.json 解析失败");
    expect(wrapper.get(".settings-commands-toolbar__more-filters-count").text()).toBe("1");

    const moreFiltersButton = wrapper.get(".settings-commands-toolbar__more-filters");
    await moreFiltersButton.trigger("click");
    expect(wrapper.find("#settings-commands-more-filters").exists()).toBe(true);

    const panel = wrapper.get("#settings-commands-more-filters");
    panel.element.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    await nextTick();
    expect(wrapper.find("#settings-commands-more-filters").exists()).toBe(true);

    const dropdowns = wrapper.findAllComponents(SDropdown);
    dropdowns[4]!.vm.$emit("update:modelValue", "user.json");
    dropdowns[5]!.vm.$emit("update:modelValue", "overridden");
    dropdowns[6]!.vm.$emit("update:modelValue", "with-issues");
    await nextTick();

    const patches = (wrapper.emitted("update-view") ?? []).map((event) => event[0]);
    expect(patches).toContainEqual({ fileFilter: "user.json" });
    expect(patches).toContainEqual({ overrideFilter: "overridden" });
    expect(patches).toContainEqual({ issueFilter: "with-issues" });

    await wrapper.get(".settings-commands-toolbar__reset").trigger("click");
    expect(wrapper.emitted("reset-filters")).toHaveLength(1);
    expect(wrapper.find("#settings-commands-more-filters").exists()).toBe(false);

    await moreFiltersButton.trigger("click");
    expect(wrapper.find("#settings-commands-more-filters").exists()).toBe(true);

    moreFiltersButton.element.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    await nextTick();
    expect(wrapper.find("#settings-commands-more-filters").exists()).toBe(true);

    document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    await nextTick();
    expect(wrapper.find("#settings-commands-more-filters").exists()).toBe(false);

    wrapper.unmount();
  });

  it("counts override and issue filters as active secondary filters and disables reset when nothing is active", async () => {
    const wrapper = mount(SettingsCommandsSection, {
      props: createProps({
        commandView: createCommandView({
          overrideFilter: "overridden",
          issueFilter: "with-issues"
        })
      })
    });

    expect(wrapper.get(".settings-commands-toolbar__more-filters-count").text()).toBe("2");

    await wrapper.get(".settings-commands-toolbar__more-filters").trigger("click");
    expect(wrapper.get(".settings-commands-toolbar__reset").attributes("disabled")).toBeUndefined();

    await wrapper.setProps({
      commandView: createCommandView()
    });
    await nextTick();

    expect(wrapper.get(".settings-commands-toolbar__reset").attributes("disabled")).toBeDefined();
    wrapper.unmount();
  });

  it("treats more filters as a dialog with initial focus, focus trap, Escape close and return focus", async () => {
    const wrapper = mount(SettingsCommandsSection, {
      attachTo: document.body,
      props: createProps({
        commandView: createCommandView({
          fileFilter: "user.json"
        })
      })
    });

    const trigger = wrapper.get(".settings-commands-toolbar__more-filters");
    await trigger.trigger("click");
    await nextTick();

    const dialog = wrapper.get("#settings-commands-more-filters");
    const dropdownTriggers = dialog.findAll(".settings-commands-toolbar__secondary-filter .s-dropdown__trigger");
    const resetButton = dialog.get(".settings-commands-toolbar__reset");

    expect(document.activeElement).toBe(dropdownTriggers[0]?.element ?? null);

    (resetButton.element as HTMLButtonElement).focus();
    const tabEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true
    });
    dialog.element.dispatchEvent(tabEvent);
    await nextTick();

    expect(tabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(dropdownTriggers[0]?.element ?? null);

    (dropdownTriggers[0]?.element as HTMLButtonElement).focus();
    const reverseTabEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true
    });
    dialog.element.dispatchEvent(reverseTabEvent);
    await nextTick();

    expect(reverseTabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(resetButton.element);

    const escapeEvent = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true
    });
    dialog.element.dispatchEvent(escapeEvent);
    await nextTick();

    expect(wrapper.find("#settings-commands-more-filters").exists()).toBe(false);
    expect(document.activeElement).toBe(trigger.element);

    wrapper.unmount();
  });
});
