import { defineComponent, nextTick, ref } from "vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { useCommandCatalog } from "../../launcher/useCommandCatalog";
import type { CommandTemplate } from "../../../features/commands/types";

function createUserCommandFile(content: string, modifiedMs: number) {
  return [
    {
      path: "C:/Users/test/.zapcmd/commands/custom.json",
      content,
      modifiedMs
    }
  ];
}

describe("useCommandCatalog", () => {
  it("keeps builtin templates when not running in tauri", async () => {
    const readUserCommandFiles = vi.fn(async () => []);
    let latestCount = 0;
    const Harness = defineComponent({
      setup() {
        const catalog = useCommandCatalog({
          isTauriRuntime: () => false,
          readUserCommandFiles
        });
        latestCount = catalog.commandTemplates.value.length;
        return () => null;
      }
    });

    mount(Harness);
    await nextTick();

    expect(readUserCommandFiles).not.toHaveBeenCalled();
    expect(latestCount).toBeGreaterThan(50);
  });

  it("loads user command files once on startup and merges with builtin templates", async () => {
    const firstContent = JSON.stringify({
      commands: [
        {
          id: "docker-ps",
          name: "覆盖：容器列表",
          tags: ["docker", "ps"],
          category: "docker",
          platform: "all",
          exec: {
            program: "docker",
            args: ["ps", "--format", "{{.Names}}"]
          },
          adminRequired: false
        },
        {
          id: "custom-hello",
          name: "自定义命令",
          tags: ["custom"],
          category: "custom",
          platform: "all",
          exec: {
            program: "echo",
            args: ["hello"]
          },
          adminRequired: false
        },
        {
          id: "linux-only-probe",
          name: "仅 Linux",
          tags: ["linux"],
          category: "custom",
          platform: "linux",
          exec: {
            program: "echo",
            args: ["linux"]
          },
          adminRequired: false
        }
      ]
    });
    const readUserCommandFiles = vi
      .fn(async () => createUserCommandFile(firstContent, 1))
      .mockImplementationOnce(async () => createUserCommandFile(firstContent, 1));
    const readRuntimePlatform = vi.fn(async () => "win");

    let getTemplates: () => CommandTemplate[] = () => [];
    const Harness = defineComponent({
      setup() {
        const catalog = useCommandCatalog({
          isTauriRuntime: () => true,
          readUserCommandFiles,
          readRuntimePlatform
        });
        getTemplates = () => catalog.commandTemplates.value;
        return () => null;
      }
    });

    const wrapper = mount(Harness);
    await nextTick();
    await Promise.resolve();
    await nextTick();

    const afterFirstLoad = getTemplates();
    expect(afterFirstLoad.some((item: CommandTemplate) => item.id === "custom-hello")).toBe(true);
    expect(afterFirstLoad.find((item: CommandTemplate) => item.id === "docker-ps")?.title).toBe(
      "覆盖：容器列表"
    );
    expect(afterFirstLoad.some((item: CommandTemplate) => item.id === "linux-only-probe")).toBe(false);
    expect(readUserCommandFiles).toHaveBeenCalledTimes(1);
    expect(readRuntimePlatform).toHaveBeenCalledTimes(1);

    await new Promise((resolve) => setTimeout(resolve, 650));
    expect(readUserCommandFiles).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it("supports disabled command filtering and exposes load issues", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const disabledCommandIds = ref(["docker-ps"]);
    const readUserCommandFiles = vi.fn(async () => [
      ...createUserCommandFile(
        JSON.stringify({
          commands: [
            {
              id: "docker-ps",
              name: "覆盖：容器列表",
              tags: ["docker"],
              category: "docker",
              platform: "all",
              exec: {
                program: "docker",
                args: ["ps", "-a"]
              },
              adminRequired: false
            }
          ]
        }),
        2
      ),
      {
        path: "C:/Users/test/.zapcmd/commands/broken.json",
        content: "{invalid",
        modifiedMs: 2
      }
    ]);

    try {
      let getTemplates: () => CommandTemplate[] = () => [];
      let getAllTemplates: () => CommandTemplate[] = () => [];
      let getIssues: () => { code: string; stage: string; reason: string }[] = () => [];
      let getOverrides: () => string[] = () => [];

      const Harness = defineComponent({
        setup() {
          const catalog = useCommandCatalog({
            isTauriRuntime: () => true,
            readUserCommandFiles,
            readRuntimePlatform: async () => "win",
            disabledCommandIds
          });
          getTemplates = () => catalog.commandTemplates.value;
          getAllTemplates = () => catalog.allCommandTemplates.value;
          getIssues = () => catalog.loadIssues.value;
          getOverrides = () => catalog.overriddenCommandIds.value;
          return () => null;
        }
      });

      const wrapper = mount(Harness);
      await nextTick();
      await Promise.resolve();
      await nextTick();

      expect(getAllTemplates().some((item) => item.id === "docker-ps")).toBe(true);
      expect(getTemplates().some((item) => item.id === "docker-ps")).toBe(false);
      expect(getOverrides()).toContain("docker-ps");
      expect(getIssues().some((item) => item.code === "invalid-json")).toBe(true);
      const parseIssue = getIssues().find((item) => item.code === "invalid-json");
      expect(parseIssue).toMatchObject({
        code: "invalid-json",
        stage: "parse"
      });
      expect(parseIssue?.reason.length).toBeGreaterThan(0);

      disabledCommandIds.value = [];
      await nextTick();
      expect(getTemplates().some((item) => item.id === "docker-ps")).toBe(true);

      wrapper.unmount();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("reports read failure as load issue instead of silent warning", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const readUserCommandFiles = vi.fn(async () => {
      throw new Error("permission denied");
    });

    try {
      let getIssues: () => { code: string; stage: string; sourceId: string; reason: string }[] = () => [];
      const Harness = defineComponent({
        setup() {
          const catalog = useCommandCatalog({
            isTauriRuntime: () => true,
            readUserCommandFiles,
            readRuntimePlatform: async () => "win"
          });
          getIssues = () => catalog.loadIssues.value;
          return () => null;
        }
      });

      const wrapper = mount(Harness);
      await nextTick();
      await Promise.resolve();
      await nextTick();

      expect(readUserCommandFiles).toHaveBeenCalledTimes(1);
      expect(getIssues()).toContainEqual(
        expect.objectContaining({
          code: "read-failed",
          stage: "read",
          sourceId: "user-command-files"
        })
      );
      expect(getIssues()[0]?.reason).toContain("permission denied");
      wrapper.unmount();
    } finally {
      warnSpy.mockRestore();
    }
  });
});
