import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { describe, expect, it, vi } from "vitest";

import SettingsCommandsSection from "../SettingsCommandsSection.vue";
import SettingsCommandsTable from "../settingsCommands/SettingsCommandsTable.vue";
import SettingsCommandsToolbar from "../settingsCommands/SettingsCommandsToolbar.vue";

describe("SettingsCommandsSection layout", () => {
  it("renders a two-stage toolbar and a bounded table structure", () => {
    const wrapper = mount(SettingsCommandsSection, {
      props: {
        commandRows: [
          {
            id: "docker.logs",
            title: "查看容器日志",
            category: "docker",
            source: "builtin",
            enabled: true,
            overridesBuiltin: false,
            hasLoadIssue: false
          },
          {
            id: "user.echo",
            title: "用户命令",
            category: "custom",
            source: "user",
            enabled: false,
            overridesBuiltin: false,
            hasLoadIssue: false
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
        commandView: {
          query: "",
          sourceFilter: "all",
          statusFilter: "all",
          categoryFilter: "all",
          overrideFilter: "all",
          issueFilter: "all",
          fileFilter: "all",
          sortBy: "default"
        },
        commandSourceOptions: [{ value: "all", label: "全部来源" }],
        commandStatusOptions: [{ value: "all", label: "全部状态" }],
        commandCategoryOptions: [{ value: "all", label: "全部分类" }],
        commandOverrideOptions: [{ value: "all", label: "全部冲突状态" }],
        commandIssueOptions: [{ value: "all", label: "全部问题" }],
        commandSortOptions: [{ value: "default", label: "默认" }],
        commandSourceFileOptions: []
      }
    });

    expect(wrapper.find(".settings-commands-toolbar--sticky").exists()).toBe(true);
    expect(wrapper.findComponent(SettingsCommandsToolbar).exists()).toBe(true);
    expect(wrapper.find(".settings-commands-toolbar--underlap").exists()).toBe(true);
    expect(wrapper.find(".settings-commands-toolbar__search-row").exists()).toBe(true);
    expect(wrapper.find(".settings-commands-toolbar__search").exists()).toBe(true);
    expect(wrapper.find(".settings-commands-toolbar__summary-row").exists()).toBe(true);
    expect(wrapper.findAll(".settings-commands-toolbar__primary-filter")).toHaveLength(4);
    expect(wrapper.find(".settings-commands-toolbar__more-filters").exists()).toBe(true);
    expect(wrapper.find(".settings-commands-toolbar__more-filters").classes()).toContain("min-h-[36px]");
    expect(wrapper.text()).toContain("更多筛选");
    expect(wrapper.text()).not.toContain("全部文件");

    const headers = wrapper
      .findAll(".settings-commands-table__header [role='columnheader']")
      .map((header) => header.text().trim());
    expect(headers).toEqual(["命令", "分类", "来源", "启用"]);

    expect(wrapper.find(".settings-commands-table__container").exists()).toBe(true);
    expect(wrapper.findComponent(SettingsCommandsTable).exists()).toBe(true);
    expect(wrapper.find(".settings-commands-table__badge").exists()).toBe(true);
    expect(wrapper.find(".settings-commands-table__row--disabled").exists()).toBe(true);
  });

  it("caps first paint rows and progressively hydrates long command lists", async () => {
    vi.useFakeTimers();

    try {
      const commandRows = Array.from({ length: 260 }, (_, index) => ({
        id: `cmd-${index + 1}`,
        title: `命令 ${index + 1}`,
        category: index % 2 === 0 ? "docker" : "custom",
        source: index % 3 === 0 ? ("user" as const) : ("builtin" as const),
        enabled: index % 5 !== 0,
        overridesBuiltin: false,
        hasLoadIssue: false
      }));

      const wrapper = mount(SettingsCommandsSection, {
        props: {
          commandRows,
          commandSummary: {
            total: 260,
            enabled: commandRows.filter((row) => row.enabled).length,
            disabled: commandRows.filter((row) => !row.enabled).length,
            userDefined: commandRows.filter((row) => row.source === "user").length,
            overridden: 0
          },
          commandLoadIssues: [],
          commandFilteredCount: 260,
          commandView: {
            query: "",
            sourceFilter: "all",
            statusFilter: "all",
            categoryFilter: "all",
            overrideFilter: "all",
            issueFilter: "all",
            fileFilter: "all",
            sortBy: "default"
          },
          commandSourceOptions: [{ value: "all", label: "全部来源" }],
          commandStatusOptions: [{ value: "all", label: "全部状态" }],
          commandCategoryOptions: [{ value: "all", label: "全部分类" }],
          commandOverrideOptions: [{ value: "all", label: "全部冲突状态" }],
          commandIssueOptions: [{ value: "all", label: "全部问题" }],
          commandSortOptions: [{ value: "default", label: "默认" }],
          commandSourceFileOptions: []
        }
      });

      expect(wrapper.findAll(".settings-commands-table__row")).toHaveLength(120);
      expect(wrapper.get(".settings-commands-table__container").attributes("data-rendered-rows")).toBe("120");

      await vi.runAllTimersAsync();
      await nextTick();

      expect(wrapper.findAll(".settings-commands-table__row")).toHaveLength(260);
      expect(wrapper.get(".settings-commands-table__container").attributes("data-rendered-rows")).toBe("260");
    } finally {
      vi.useRealTimers();
    }
  });

  it("enforces heading-led aria contracts for the commands section", () => {
    const wrapper = mount(SettingsCommandsSection, {
      props: {
        commandRows: [],
        commandSummary: {
          total: 0,
          enabled: 0,
          disabled: 0,
          userDefined: 0,
          overridden: 0
        },
        commandLoadIssues: [],
        commandFilteredCount: 0,
        commandView: {
          query: "",
          sourceFilter: "all",
          statusFilter: "all",
          categoryFilter: "all",
          overrideFilter: "all",
          issueFilter: "all",
          fileFilter: "all",
          sortBy: "default"
        },
        commandSourceOptions: [{ value: "all", label: "全部来源" }],
        commandStatusOptions: [{ value: "all", label: "全部状态" }],
        commandCategoryOptions: [{ value: "all", label: "全部分类" }],
        commandOverrideOptions: [{ value: "all", label: "全部冲突状态" }],
        commandIssueOptions: [{ value: "all", label: "全部问题" }],
        commandSortOptions: [{ value: "default", label: "默认" }],
        commandSourceFileOptions: []
      }
    });

    const commandsSection = wrapper.get("section.settings-commands");
    const commandsRegionLabelId = commandsSection.attributes("aria-labelledby");
    expect(commandsRegionLabelId).toBeTruthy();
    const commandsHeading = wrapper.get(`#${commandsRegionLabelId}`);
    expect(commandsHeading.element.tagName).toBe("H2");
    expect(commandsHeading.text().trim().length).toBeGreaterThan(0);

    const toolbar = wrapper.get(".settings-commands-toolbar");
    const toolbarLabelId = toolbar.attributes("aria-labelledby");
    expect(toolbarLabelId).toBeTruthy();
    const toolbarHeading = wrapper.get(`#${toolbarLabelId}`);
    expect(toolbarHeading.element.tagName).toBe("H3");
    expect(toolbarHeading.text().trim().length).toBeGreaterThan(0);

    const summary = wrapper.get(".settings-commands-toolbar__summary");
    expect(summary.attributes("aria-labelledby")).toBe(toolbarLabelId);

    expect(wrapper.find("[aria-label='command-management']").exists()).toBe(false);
    expect(wrapper.find("[aria-label='command-management-toolbar']").exists()).toBe(false);
    expect(wrapper.find("[aria-label='command-management-summary']").exists()).toBe(false);
    expect(wrapper.find("[aria-label='command-management-filters']").exists()).toBe(false);
  });
});
