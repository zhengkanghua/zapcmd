import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import type { StagedCommand } from "../../../../features/launcher/types";
import type { LauncherStagingPanelProps } from "../../types";
import LauncherStagingPanel from "../LauncherStagingPanel.vue";

function createStagedCommand(overrides: Partial<StagedCommand> = {}): StagedCommand {
  return {
    id: "cmd-1",
    title: "查看日志",
    rawPreview: "docker logs app",
    renderedCommand: "docker logs app",
    args: [],
    argValues: {},
    ...overrides
  };
}

function createProps(
  overrides: Partial<LauncherStagingPanelProps> = {}
): LauncherStagingPanelProps {
  return {
    stagingDrawerState: "open",
    stagingExpanded: false,
    stagedCommands: [],
    stagingHints: [],
    focusZone: "search",
    stagingActiveIndex: 0,
    executing: false,
    setStagingPanelRef: () => {},
    setStagingListRef: () => {},
    ...overrides
  };
}

describe("LauncherStagingPanel", () => {
  it("collapsed state only renders queue chip and forwards toggle", async () => {
    const wrapper = mount(LauncherStagingPanel, {
      props: createProps({
        stagedCommands: [createStagedCommand()]
      })
    });

    const chip = wrapper.get(".staging-chip");
    expect(chip.attributes("aria-expanded")).toBe("false");
    expect(wrapper.find(".staging-panel__header").exists()).toBe(false);
    expect(wrapper.find(".staging-list").exists()).toBe(false);

    await chip.trigger("click");
    expect(wrapper.emitted("toggle-staging")).toHaveLength(1);
  });

  it("expanded empty state renders empty copy without hint text", () => {
    const wrapper = mount(LauncherStagingPanel, {
      props: createProps({
        stagingExpanded: true
      })
    });

    expect(wrapper.find(".staging-panel__header").exists()).toBe(true);
    expect(wrapper.find(".staging-empty").exists()).toBe(true);
    expect(wrapper.find(".staging-panel__hint").exists()).toBe(false);
    expect(wrapper.find(".staging-list").exists()).toBe(false);
  });

  it("expanded list state renders hints and forwards card interactions", async () => {
    const stagingPanelRef = vi.fn();
    const stagingListRef = vi.fn();
    const wrapper = mount(LauncherStagingPanel, {
      props: createProps({
        stagingExpanded: true,
        focusZone: "staging",
        stagingActiveIndex: 0,
        stagedCommands: [
          createStagedCommand({
            args: [{ key: "tail", label: "行数", token: "{{tail}}", placeholder: "100" }],
            argValues: { tail: "200" }
          }),
          createStagedCommand({
            id: "cmd-2",
            title: "重启服务",
            renderedCommand: "docker restart app"
          })
        ],
        stagingHints: [
          { keys: ["Ctrl", "Enter"], action: "执行全部" },
          { keys: ["Esc"], action: "返回" }
        ],
        setStagingPanelRef: stagingPanelRef,
        setStagingListRef: stagingListRef
      })
    });

    expect(stagingPanelRef).toHaveBeenCalled();
    expect(stagingListRef).toHaveBeenCalled();
    expect(wrapper.get(".staging-panel__hint").text()).toBe("Ctrl+Enter 执行全部 · Esc 返回");
    expect(wrapper.get(".staging-card").classes()).toContain("staging-card--active");

    const items = wrapper.findAll("[data-staging-index]");
    await items[1]!.trigger("dragstart");
    await items[1]!.trigger("dragover");
    await items[1]!.trigger("dragend");
    await items[0]!.trigger("click");

    expect(wrapper.emitted("staging-drag-start")?.[0]?.[0]).toBe(1);
    expect(wrapper.emitted("staging-drag-over")?.[0]?.[0]).toBe(1);
    expect(wrapper.emitted("staging-drag-end")).toHaveLength(1);
    expect(wrapper.emitted("focus-staging-index")?.[0]).toEqual([0]);

    await wrapper.get(".staging-card__arg input").setValue("500");
    expect(wrapper.emitted("update-staged-arg")?.[0]).toEqual(["cmd-1", "tail", "500"]);

    await wrapper.get(".staging-card__head button").trigger("click");
    expect(wrapper.emitted("remove-staged-command")?.[0]).toEqual(["cmd-1"]);

    const footerButtons = wrapper.findAll(".staging-panel__footer button");
    await footerButtons[0]!.trigger("click");
    await footerButtons[1]!.trigger("click");
    expect(wrapper.emitted("clear-staging")).toHaveLength(1);
    expect(wrapper.emitted("execute-staged")).toHaveLength(1);
  });

  it("disables execute button while executing or when queue is empty", async () => {
    const wrapper = mount(LauncherStagingPanel, {
      props: createProps({
        stagingExpanded: true,
        stagedCommands: [createStagedCommand()],
        executing: true
      })
    });

    const footerButtons = wrapper.findAll(".staging-panel__footer button");
    expect(footerButtons).toHaveLength(2);
    const executeButton = footerButtons[1]!;
    expect(executeButton.attributes("disabled")).toBeDefined();

    await wrapper.setProps({
      executing: false,
      stagedCommands: []
    });

    const updatedFooterButtons = wrapper.findAll(".staging-panel__footer button");
    expect(updatedFooterButtons).toHaveLength(2);
    expect(updatedFooterButtons[1]!.attributes("disabled")).toBeDefined();
  });
});
