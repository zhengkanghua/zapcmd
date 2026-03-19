import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { CommandLoadIssue } from "../../../features/commands/runtimeLoader";
import type { CommandManagementViewState } from "../../../features/settings/types";
import { useCommandManagement } from "../../settings/useCommandManagement";

const BUILTIN_PATH = "assets/runtime_templates/commands/builtin/_docker.json";
const USER_PATH = "C:\\Users\\test\\.zapcmd\\commands\\custom.json";

function createDefaultViewState(): CommandManagementViewState {
  return {
    query: "",
    sourceFilter: "all",
    statusFilter: "all",
    categoryFilter: "all",
    overrideFilter: "all",
    issueFilter: "all",
    fileFilter: "all",
    sortBy: "default",
    displayMode: "list"
  };
}

function createFixture() {
  const setCommandEnabled = vi.fn();
  const setDisabledCommandIds = vi.fn();

  const allCommandTemplates = ref([
    {
      id: "cmd-a",
      title: "Alpha",
      description: "desc",
      preview: "docker ps",
      folder: "@_docker",
      category: "docker",
      needsArgs: false
    },
    {
      id: "cmd-b",
      title: "Beta",
      description: "desc",
      preview: "echo hello",
      folder: "@_custom",
      category: "custom",
      needsArgs: false
    },
    {
      id: "cmd-c",
      title: "Gamma",
      description: "desc",
      preview: "docker images",
      folder: "@_docker",
      category: "docker",
      needsArgs: false
    },
    {
      id: "cmd-no-source",
      title: "NoSource",
      description: "desc",
      preview: "echo missing",
      folder: "@_dev",
      category: "dev",
      needsArgs: false
    }
  ]);

  const disabledCommandIds = ref<string[]>([]);
  const overriddenCommandIds = ref<string[]>([]);
  const loadIssues = ref<CommandLoadIssue[]>([]);

  const commandSourceById = ref<Record<string, string>>({
    "cmd-a": BUILTIN_PATH,
    "cmd-b": USER_PATH,
    "cmd-c": BUILTIN_PATH
  });

  const userCommandSourceById = ref<Record<string, string>>({
    "cmd-b": USER_PATH
  });

  const model = useCommandManagement({
    allCommandTemplates,
    disabledCommandIds,
    commandSourceById,
    userCommandSourceById,
    overriddenCommandIds,
    loadIssues,
    setCommandEnabled,
    setDisabledCommandIds
  });

  return {
    model,
    refs: {
      commandView: model.commandView,
      disabledCommandIds,
      overriddenCommandIds,
      loadIssues,
      commandSourceById,
      userCommandSourceById
    },
    spies: { setCommandEnabled, setDisabledCommandIds }
  };
}

describe("useCommandManagement", () => {
  it("formats issue messages for all known codes", () => {
    const { model, refs } = createFixture();
    refs.loadIssues.value = [
      { code: "read-failed", stage: "read", sourceId: USER_PATH, reason: "permission denied" },
      { code: "invalid-json", stage: "parse", sourceId: USER_PATH, reason: "Unexpected token" },
      { code: "invalid-schema", stage: "schema", sourceId: BUILTIN_PATH, reason: "commands[0].id invalid" },
      { code: "duplicate-id", stage: "merge", sourceId: BUILTIN_PATH, commandId: "cmd-a", reason: "duplicate id" },
      { code: "duplicate-id", stage: "merge", sourceId: BUILTIN_PATH, reason: "duplicate id" },
      { code: "shell-ignored", stage: "merge", sourceId: BUILTIN_PATH, reason: "shell ignored" }
    ];

    expect(model.commandLoadIssues.value).toHaveLength(6);
    expect(model.commandLoadIssues.value.at(0)).toMatchObject({
      code: "read-failed",
      stage: "read",
      reason: "permission denied"
    });
    for (const issue of model.commandLoadIssues.value) {
      expect(typeof issue.message).toBe("string");
      expect(issue.message.length).toBeGreaterThan(0);
      expect(issue.message).toContain(issue.sourceId);
      expect(issue.message).toContain(issue.reason);
    }
  });

  it("sorts rows by title/category/source/status/default", () => {
    const { model, refs } = createFixture();

    refs.commandView.value.sortBy = "title";
    expect(model.commandRows.value.map((row) => row.id)).toEqual(["cmd-a", "cmd-b", "cmd-c", "cmd-no-source"]);

    refs.commandView.value.sortBy = "category";
    expect(model.commandRows.value.map((row) => row.id)).toEqual(["cmd-b", "cmd-no-source", "cmd-a", "cmd-c"]);

    refs.commandView.value.sortBy = "source";
    expect(model.commandRows.value.map((row) => row.id).slice(0, 2)).toEqual(["cmd-a", "cmd-c"]);

    refs.disabledCommandIds.value = ["cmd-a"];
    refs.commandView.value.sortBy = "status";
    expect(model.commandRows.value.at(0)?.id).toBe("cmd-a");

    refs.overriddenCommandIds.value = ["cmd-b"];
    refs.commandView.value.sortBy = "default";
    const ids = model.commandRows.value.map((row) => row.id);
    expect(ids.includes("cmd-a")).toBe(true);
    expect(ids.includes("cmd-b")).toBe(true);
  });

  it("filters rows across query/source/status/override/issue/file", () => {
    const { model, refs } = createFixture();

    refs.commandView.value.query = "beta";
    expect(model.commandRows.value.map((row) => row.id)).toEqual(["cmd-b"]);

    refs.commandView.value.query = "not-found";
    expect(model.commandRows.value).toHaveLength(0);

    refs.commandView.value.query = "";
    refs.commandView.value.sourceFilter = "user";
    expect(model.commandRows.value.map((row) => row.id)).toEqual(["cmd-b"]);

    refs.commandView.value.sourceFilter = "all";
    refs.disabledCommandIds.value = ["cmd-c"];
    refs.commandView.value.statusFilter = "disabled";
    expect(model.commandRows.value.map((row) => row.id)).toEqual(["cmd-c"]);

    refs.commandView.value.statusFilter = "all";
    refs.overriddenCommandIds.value = ["cmd-b"];
    refs.commandView.value.overrideFilter = "overridden";
    expect(model.commandRows.value.map((row) => row.id)).toEqual(["cmd-b"]);

    refs.commandView.value.overrideFilter = "all";
    refs.loadIssues.value = [{ code: "invalid-json", stage: "parse", sourceId: BUILTIN_PATH, reason: "bad json" }];
    refs.commandView.value.issueFilter = "with-issues";
    expect(model.commandRows.value.map((row) => row.id).sort()).toEqual(["cmd-a", "cmd-c"]);

    refs.commandView.value.issueFilter = "all";
    refs.commandView.value.fileFilter = BUILTIN_PATH;
    expect(model.commandRows.value.map((row) => row.id).sort()).toEqual(["cmd-a", "cmd-c"]);
  });

  it("builds source file options and groups (including unknown source)", () => {
    const { model } = createFixture();

    const options = model.commandSourceFileOptions.value;
    expect(options.map((item) => item.value).sort()).toEqual([BUILTIN_PATH, USER_PATH].sort());
    const builtinOption = options.find((item) => item.value === BUILTIN_PATH);
    expect(builtinOption?.count).toBe(2);

    const groupKeys = model.commandGroups.value.map((group) => group.key);
    expect(groupKeys).toContain("__unknown_source__");
  });

  it("supports bulk enable/disable and skips when filtered result is empty", () => {
    const { model, refs, spies } = createFixture();

    refs.commandView.value.query = "not-found";
    model.setFilteredCommandsEnabled(false);
    expect(spies.setDisabledCommandIds).not.toHaveBeenCalled();

    refs.disabledCommandIds.value = ["cmd-a"];
    refs.commandView.value.query = "";
    refs.commandView.value.sourceFilter = "user";
    model.setFilteredCommandsEnabled(false);
    expect(spies.setDisabledCommandIds).toHaveBeenCalledWith(["cmd-a", "cmd-b"]);

    refs.commandView.value.sourceFilter = "all";
    model.setFilteredCommandsEnabled(true);
    expect(spies.setDisabledCommandIds).toHaveBeenLastCalledWith([]);
  });

  it("supports toggle/update/reset view actions", () => {
    const { model, refs, spies } = createFixture();

    model.toggleCommandEnabled("cmd-a", false);
    expect(spies.setCommandEnabled).toHaveBeenCalledWith("cmd-a", false);

    model.updateCommandView({ query: "docker" });
    expect(model.commandView.value.query).toBe("docker");

    model.updateCommandView({ sourceFilter: "user" });
    expect(model.commandView.value.sourceFilter).toBe("user");

    model.resetCommandFilters();
    expect(model.commandView.value).toEqual(createDefaultViewState());
    expect(model.commandRows.value).toHaveLength(4);
  });
});
