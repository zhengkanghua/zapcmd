import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { CommandManagementViewState } from "../../../features/settings/types";
import { useCommandManagement } from "../../settings/useCommandManagement";

describe("useCommandManagement", () => {
  it("builds rows/summary and supports filtering + bulk actions", () => {
    const setCommandEnabled = vi.fn();
    const setDisabledCommandIds = vi.fn();
    const setCommandViewState = vi.fn();
    const commandView = ref<CommandManagementViewState>({
      query: "",
      sourceFilter: "all",
      statusFilter: "all",
      overrideFilter: "all",
      issueFilter: "all",
      fileFilter: "all",
      sortBy: "default",
      displayMode: "list"
    });
    const model = useCommandManagement({
      allCommandTemplates: ref([
        {
          id: "docker-ps",
          title: "容器列表",
          description: "desc",
          preview: "docker ps",
          folder: "@_docker",
          category: "docker",
          needsArgs: false
        },
        {
          id: "custom-hello",
          title: "自定义命令",
          description: "desc",
          preview: "echo hello",
          folder: "@_custom",
          category: "custom",
          needsArgs: false
        }
      ]),
      disabledCommandIds: ref(["docker-ps"]),
      commandSourceById: ref({
        "docker-ps": "assets/runtime_templates/commands/builtin/_docker.json",
        "custom-hello": "C:/Users/test/.zapcmd/commands/custom.json"
      }),
      userCommandSourceById: ref({
        "custom-hello": "C:/Users/test/.zapcmd/commands/custom.json"
      }),
      overriddenCommandIds: ref(["custom-hello"]),
      loadIssues: ref([
        {
          code: "invalid-json",
          sourceId: "C:/Users/test/.zapcmd/commands/broken.json"
        }
      ]),
      commandView,
      setCommandEnabled,
      setDisabledCommandIds,
      setCommandViewState
    });

    expect(model.commandRows.value).toHaveLength(2);
    expect(model.commandSummary.value.total).toBe(2);
    expect(model.commandSummary.value.disabled).toBe(1);
    expect(model.commandSummary.value.userDefined).toBe(1);
    expect(model.commandSummary.value.overridden).toBe(1);
    expect(model.commandLoadIssues.value[0].message).toContain("JSON 解析失败");

    model.toggleCommandEnabled("docker-ps", true);
    expect(setCommandEnabled).toHaveBeenCalledWith("docker-ps", true);

    model.updateCommandView({
      query: "自定义"
    });
    expect(setCommandViewState).toHaveBeenCalledWith({
      query: "自定义"
    });

    commandView.value.sourceFilter = "user";
    expect(model.commandRows.value).toHaveLength(1);
    expect(model.commandRows.value[0].id).toBe("custom-hello");
    expect(model.commandGroups.value).toHaveLength(1);
    expect(model.commandGroups.value[0].title).toBe("custom.json");
    expect(model.commandDisplayModeOptions.value).toHaveLength(2);

    model.setFilteredCommandsEnabled(false);
    expect(setDisabledCommandIds).toHaveBeenCalledWith(["docker-ps", "custom-hello"]);

    model.resetCommandFilters();
    expect(setCommandViewState).toHaveBeenCalledWith({
      query: "",
      sourceFilter: "all",
      statusFilter: "all",
      overrideFilter: "all",
      issueFilter: "all",
      fileFilter: "all",
      sortBy: "default",
      displayMode: "list"
    });

    commandView.value.sourceFilter = "all";
    commandView.value.sortBy = "title";
    model.setFilteredCommandsEnabled(true);
    expect(setDisabledCommandIds).toHaveBeenCalledWith([]);
  });
});
