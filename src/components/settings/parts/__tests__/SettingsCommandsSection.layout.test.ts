import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import SettingsCommandsSection from "../SettingsCommandsSection.vue";

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
          sortBy: "default",
          displayMode: "list"
        },
        commandSourceOptions: [{ value: "all", label: "全部来源" }],
        commandStatusOptions: [{ value: "all", label: "全部状态" }],
        commandCategoryOptions: [{ value: "all", label: "全部分类" }],
        commandOverrideOptions: [{ value: "all", label: "全部冲突状态" }],
        commandIssueOptions: [{ value: "all", label: "全部问题" }],
        commandSortOptions: [{ value: "default", label: "默认" }],
        commandDisplayModeOptions: [{ value: "list", label: "列表" }],
        commandSourceFileOptions: [],
        commandGroups: []
      }
    });

    expect(wrapper.find(".settings-commands-toolbar__search-row").exists()).toBe(true);
    expect(wrapper.find(".settings-commands-toolbar__search").exists()).toBe(true);
    expect(wrapper.find(".settings-commands-toolbar__summary-row").exists()).toBe(true);

    const headers = wrapper
      .findAll(".settings-commands-table__header [role='columnheader']")
      .map((header) => header.text().trim());
    expect(headers).toEqual(["命令", "分类", "来源", "启用"]);

    expect(wrapper.find(".settings-commands-table__row--disabled").exists()).toBe(true);
  });
});
