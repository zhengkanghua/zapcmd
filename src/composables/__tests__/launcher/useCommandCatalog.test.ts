import { defineComponent, nextTick, ref } from "vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCommandCatalog } from "../../launcher/useCommandCatalog";
import type { CommandTemplate } from "../../../features/commands/types";
import { setAppLocale } from "../../../i18n";
import * as runtimeLoader from "../../../features/commands/runtimeLoader";

async function waitForCondition(
  predicate: () => boolean,
  maxTries = 60
): Promise<void> {
  for (let index = 0; index < maxTries; index += 1) {
    if (predicate()) {
      return;
    }
    await nextTick();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("condition not satisfied in time");
}

function createUserCommandFile(content: string, modifiedMs: number) {
  return {
    path: "C:/Users/test/.zapcmd/commands/custom.json",
    content,
    modifiedMs,
    size: content.length
  };
}

function createScanResult(entries: Array<{ path: string; modifiedMs: number; size: number }>) {
  return {
    files: entries,
    issues: []
  };
}

describe("useCommandCatalog", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  it("keeps builtin templates when not running in tauri", async () => {
    const scanUserCommandFiles = vi.fn(async () => createScanResult([]));
    const readUserCommandFile = vi.fn();
    let getTemplates: () => CommandTemplate[] = () => [];
    let isCatalogReady: () => boolean = () => false;
    const Harness = defineComponent({
      setup() {
        const catalog = useCommandCatalog({
          isTauriRuntime: () => false,
          scanUserCommandFiles,
          readUserCommandFile
        });
        getTemplates = () => catalog.commandTemplates.value;
        isCatalogReady = () => catalog.catalogReady.value;
        return () => null;
      }
    });

    mount(Harness);
    await waitForCondition(() => isCatalogReady());

    expect(scanUserCommandFiles).not.toHaveBeenCalled();
    expect(readUserCommandFile).not.toHaveBeenCalled();
    expect(getTemplates().length).toBeGreaterThan(50);
  });

  it("reports missing scan/read ports when tauri runtime catalog is not wired", async () => {
    let getIssues: () => Array<{ code: string; stage: string; sourceId: string; reason: string }> =
      () => [];
    let isCatalogReady: () => boolean = () => false;

    const Harness = defineComponent({
      setup() {
        const catalog = useCommandCatalog({
          isTauriRuntime: () => true
        });
        getIssues = () => catalog.loadIssues.value;
        isCatalogReady = () => catalog.catalogReady.value;
        return () => null;
      }
    });

    const wrapper = mount(Harness);
    await waitForCondition(() => isCatalogReady());

    expect(getIssues()).toContainEqual(
      expect.objectContaining({
        code: "read-failed",
        stage: "read",
        sourceId: "user-command-files"
      })
    );
    expect(getIssues()[0]?.reason).toContain("ports are not configured");

    wrapper.unmount();
  });

  it("does not reload builtin payload twice during non-tauri startup", async () => {
    const builtinSpy = vi.spyOn(runtimeLoader, "loadBuiltinCommandTemplatesWithReport");

    try {
      let isCatalogReady: () => boolean = () => false;
      const Harness = defineComponent({
        setup() {
          const catalog = useCommandCatalog({
            isTauriRuntime: () => false
          });
          isCatalogReady = () => catalog.catalogReady.value;
          return () => null;
        }
      });

      const wrapper = mount(Harness);
      await waitForCondition(() => isCatalogReady());

      expect(builtinSpy).toHaveBeenCalledTimes(1);

      wrapper.unmount();
    } finally {
      builtinSpy.mockRestore();
    }
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
    const userFile = createUserCommandFile(firstContent, 1);
    const scanUserCommandFiles = vi.fn(async () =>
      createScanResult([
        {
          path: userFile.path,
          modifiedMs: userFile.modifiedMs,
          size: userFile.size ?? firstContent.length
        }
      ])
    );
    const readUserCommandFile = vi.fn(async () => userFile);
    const readRuntimePlatform = vi.fn(async () => "win");

    let getTemplates: () => CommandTemplate[] = () => [];
    let isCatalogReady: () => boolean = () => false;
    const Harness = defineComponent({
      setup() {
        const catalog = useCommandCatalog({
          isTauriRuntime: () => true,
          scanUserCommandFiles,
          readUserCommandFile,
          readRuntimePlatform
        });
        getTemplates = () => catalog.commandTemplates.value;
        isCatalogReady = () => catalog.catalogReady.value;
        return () => null;
      }
    });

    const wrapper = mount(Harness);
    await waitForCondition(() => isCatalogReady());

    const afterFirstLoad = getTemplates();
    expect(afterFirstLoad.some((item: CommandTemplate) => item.id === "custom-hello")).toBe(true);
    expect(afterFirstLoad.find((item: CommandTemplate) => item.id === "docker-ps")?.title).toBe(
      "覆盖：容器列表"
    );
    expect(afterFirstLoad.some((item: CommandTemplate) => item.id === "linux-only-probe")).toBe(false);
    expect(scanUserCommandFiles).toHaveBeenCalledTimes(1);
    expect(readUserCommandFile).toHaveBeenCalledTimes(1);
    expect(readRuntimePlatform).toHaveBeenCalledTimes(1);

    await new Promise((resolve) => setTimeout(resolve, 650));
    expect(scanUserCommandFiles).toHaveBeenCalledTimes(1);
    expect(readUserCommandFile).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it("enters loading before async startup refresh completes in tauri runtime", async () => {
    let resolverReady = false;
    let resolveScan = (_value: ReturnType<typeof createScanResult>): void => {
      throw new Error("scan resolver not initialized");
    };
    const scanUserCommandFiles = vi.fn(
      () =>
        new Promise<ReturnType<typeof createScanResult>>((resolve) => {
          resolverReady = true;
          resolveScan = (value) => {
            resolve(value);
          };
        })
    );
    const readUserCommandFile = vi.fn(async () =>
      createUserCommandFile(
        JSON.stringify({
          commands: []
        }),
        1
      )
    );
    const readRuntimePlatform = vi.fn(async () => "win");

    let getCatalogReady: () => boolean = () => false;
    let getCatalogStatus: () => string = () => "idle";

    const Harness = defineComponent({
      setup() {
        const catalog = useCommandCatalog({
          isTauriRuntime: () => true,
          scanUserCommandFiles,
          readUserCommandFile,
          readRuntimePlatform
        });
        getCatalogReady = () => catalog.catalogReady.value;
        getCatalogStatus = () => catalog.catalogStatus.value;
        return () => null;
      }
    });

    const wrapper = mount(Harness);
    await waitForCondition(() => resolverReady);

    expect(scanUserCommandFiles).toHaveBeenCalledTimes(1);
    expect(getCatalogStatus()).toBe("loading");
    expect(getCatalogReady()).toBe(false);

    resolveScan(createScanResult([]));
    await waitForCondition(() => getCatalogStatus() === "ready");

    expect(getCatalogReady()).toBe(true);
    wrapper.unmount();
  });

  it("falls back to all runtime platform after backend lookup failure and does not resolve it twice", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const content = JSON.stringify({
      commands: [
        {
          id: "custom-platform-fallback",
          name: "平台回退",
          tags: ["custom"],
          category: "custom",
          platform: "all",
          exec: {
            program: "echo",
            args: ["fallback"]
          },
          adminRequired: false
        }
      ]
    });
    const scanUserCommandFiles = vi.fn(async () =>
      createScanResult([
        {
          path: "C:/Users/test/.zapcmd/commands/custom.json",
          modifiedMs: 1,
          size: content.length
        }
      ])
    );
    const readUserCommandFile = vi.fn(async () => ({
      path: "C:/Users/test/.zapcmd/commands/custom.json",
      content,
      modifiedMs: 1,
      size: content.length
    }));
    const readRuntimePlatform = vi.fn(async () => {
      throw new Error("platform probe failed");
    });

    try {
      let getTemplates: () => CommandTemplate[] = () => [];
      let refreshUserCommands: () => Promise<void> = async () => undefined;
      let isCatalogReady: () => boolean = () => false;

      const Harness = defineComponent({
        setup() {
          const catalog = useCommandCatalog({
            isTauriRuntime: () => true,
            scanUserCommandFiles,
            readUserCommandFile,
            readRuntimePlatform
          });
          getTemplates = () => catalog.commandTemplates.value;
          refreshUserCommands = catalog.refreshUserCommands;
          isCatalogReady = () => catalog.catalogReady.value;
          return () => null;
        }
      });

      const wrapper = mount(Harness);
      await waitForCondition(() => isCatalogReady());
      expect(getTemplates().some((item) => item.id === "custom-platform-fallback")).toBe(true);
      expect(readRuntimePlatform).toHaveBeenCalledTimes(1);

      await refreshUserCommands();
      await nextTick();
      await Promise.resolve();

      expect(readRuntimePlatform).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        "[commands] failed to resolve runtime platform from backend",
        expect.any(Error)
      );

      wrapper.unmount();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("supports disabled command filtering and exposes load issues", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const disabledCommandIds = ref(["docker-ps"]);
    const validFile = {
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
      path: "C:/Users/test/.zapcmd/commands/custom.json"
    };
    const brokenPath = "C:/Users/test/.zapcmd/commands/broken.json";
    const scanUserCommandFiles = vi.fn(async () =>
      createScanResult([
        {
          path: validFile.path,
          modifiedMs: validFile.modifiedMs,
          size: validFile.size ?? 0
        },
        {
          path: brokenPath,
          modifiedMs: 2,
          size: 8
        }
      ])
    );
    const readUserCommandFile = vi.fn(async (path: string) => {
      if (path === validFile.path) {
        return validFile;
      }
      return {
        path: brokenPath,
        content: "{invalid",
        modifiedMs: 2,
        size: 8
      };
    });

    try {
      let getTemplates: () => CommandTemplate[] = () => [];
      let getAllTemplates: () => CommandTemplate[] = () => [];
      let getIssues: () => { code: string; stage: string; reason: string }[] = () => [];
      let getOverrides: () => string[] = () => [];
      let isCatalogReady: () => boolean = () => false;

      const Harness = defineComponent({
        setup() {
          const catalog = useCommandCatalog({
            isTauriRuntime: () => true,
            scanUserCommandFiles,
            readUserCommandFile,
            readRuntimePlatform: async () => "win",
            disabledCommandIds
          });
          getTemplates = () => catalog.commandTemplates.value;
          getAllTemplates = () => catalog.allCommandTemplates.value;
          getIssues = () => catalog.loadIssues.value;
          getOverrides = () => catalog.overriddenCommandIds.value;
          isCatalogReady = () => catalog.catalogReady.value;
          return () => null;
        }
      });

      const wrapper = mount(Harness);
      await waitForCondition(() => isCatalogReady());

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

  it("reports scan failure when refreshing user command files throws before any payload is read", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const scanUserCommandFiles = vi.fn(async () => {
      throw new Error("scan broke");
    });
    const readUserCommandFile = vi.fn();

    try {
      let getIssues: () => Array<{ code: string; stage: string; sourceId: string; reason: string }> =
        () => [];
      let isCatalogReady: () => boolean = () => false;

      const Harness = defineComponent({
        setup() {
          const catalog = useCommandCatalog({
            isTauriRuntime: () => true,
            scanUserCommandFiles,
            readUserCommandFile,
            readRuntimePlatform: async () => "win"
          });
          getIssues = () => catalog.loadIssues.value;
          isCatalogReady = () => catalog.catalogReady.value;
          return () => null;
        }
      });

      const wrapper = mount(Harness);
      await waitForCondition(() => isCatalogReady());

      expect(readUserCommandFile).not.toHaveBeenCalled();
      expect(getIssues()).toContainEqual(
        expect.objectContaining({
          code: "scan-failed",
          stage: "scan",
          sourceId: "user-command-files"
        })
      );
      expect(getIssues()[0]?.reason).toContain("scan broke");

      wrapper.unmount();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("reports read failure as load issue instead of silent warning", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const path = "C:/Users/test/.zapcmd/commands/custom.json";
    const scanUserCommandFiles = vi.fn(async () =>
      createScanResult([
        {
          path,
          modifiedMs: 1,
          size: 1
        }
      ])
    );
    const readUserCommandFile = vi.fn(async () => {
      throw new Error("permission denied");
    });

    try {
      let getIssues: () => { code: string; stage: string; sourceId: string; reason: string }[] = () => [];
      let isCatalogReady: () => boolean = () => false;
      const Harness = defineComponent({
        setup() {
          const catalog = useCommandCatalog({
            isTauriRuntime: () => true,
            scanUserCommandFiles,
            readUserCommandFile,
            readRuntimePlatform: async () => "win"
          });
          getIssues = () => catalog.loadIssues.value;
          isCatalogReady = () => catalog.catalogReady.value;
          return () => null;
        }
      });

      const wrapper = mount(Harness);
      await waitForCondition(() => isCatalogReady());

      expect(scanUserCommandFiles).toHaveBeenCalledTimes(1);
      expect(readUserCommandFile).toHaveBeenCalledTimes(1);
      expect(getIssues()).toContainEqual(
        expect.objectContaining({
          code: "read-failed",
          stage: "read",
          sourceId: path
        })
      );
      expect(getIssues()[0]?.reason).toContain("permission denied");
      wrapper.unmount();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("remaps cached user payloads on locale change without calling scan or read again", async () => {
    setAppLocale("zh-CN");
    const locale = ref<"zh-CN" | "en-US">("zh-CN");
    const localizedContent = JSON.stringify({
      commands: [
        {
          id: "custom-localized",
          name: {
            zh: "中文标题",
            en: "English Title"
          },
          description: {
            zh: "中文描述",
            en: "English Description"
          },
          tags: ["custom"],
          category: "custom",
          platform: "all",
          exec: {
            program: "echo",
            args: ["hello"]
          },
          adminRequired: false
        }
      ]
    });
    const scanUserCommandFiles = vi.fn(async () =>
      createScanResult([
        {
          path: "C:/Users/test/.zapcmd/commands/custom.json",
          modifiedMs: 1,
          size: localizedContent.length
        }
      ])
    );
    const readUserCommandFile = vi.fn(async () => ({
      path: "C:/Users/test/.zapcmd/commands/custom.json",
      content: localizedContent,
      modifiedMs: 1,
      size: localizedContent.length
    }));

    let getTemplates: () => CommandTemplate[] = () => [];
    let isCatalogReady: () => boolean = () => false;
    const Harness = defineComponent({
      setup() {
        const catalog = useCommandCatalog({
          isTauriRuntime: () => true,
          scanUserCommandFiles,
          readUserCommandFile,
          readRuntimePlatform: async () => "win",
          locale
        });
        getTemplates = () => catalog.commandTemplates.value;
        isCatalogReady = () => catalog.catalogReady.value;
        return () => null;
      }
    });

    const wrapper = mount(Harness);
    await waitForCondition(() => isCatalogReady());

    expect(getTemplates().find((item) => item.id === "custom-localized")?.title).toBe("中文标题");
    expect(scanUserCommandFiles).toHaveBeenCalledTimes(1);
    expect(readUserCommandFile).toHaveBeenCalledTimes(1);

    locale.value = "en-US";
    await waitForCondition(
      () => getTemplates().find((item) => item.id === "custom-localized")?.title === "English Title"
    );

    expect(getTemplates().find((item) => item.id === "custom-localized")?.title).toBe("English Title");
    expect(scanUserCommandFiles).toHaveBeenCalledTimes(1);
    expect(readUserCommandFile).toHaveBeenCalledTimes(1);

    wrapper.unmount();
    setAppLocale("zh-CN");
  });

  it("preserves scan issues when remapping cached payloads on locale change", async () => {
    setAppLocale("zh-CN");
    const locale = ref<"zh-CN" | "en-US">("zh-CN");
    const localizedContent = JSON.stringify({
      commands: [
        {
          id: "custom-localized",
          name: {
            zh: "中文标题",
            en: "English Title"
          },
          tags: ["custom"],
          category: "custom",
          platform: "all",
          exec: {
            program: "echo",
            args: ["hello"]
          },
          adminRequired: false
        }
      ]
    });
    const scanIssuePath = "C:/Users/test/.zapcmd/commands/nested";
    const scanUserCommandFiles = vi.fn(async () => ({
      files: [
        {
          path: "C:/Users/test/.zapcmd/commands/custom.json",
          modifiedMs: 1,
          size: localizedContent.length
        }
      ],
      issues: [
        {
          path: scanIssuePath,
          reason: "permission denied"
        }
      ]
    }));
    const readUserCommandFile = vi.fn(async () => ({
      path: "C:/Users/test/.zapcmd/commands/custom.json",
      content: localizedContent,
      modifiedMs: 1,
      size: localizedContent.length
    }));

    let getIssues: () => Array<{ code: string; stage: string; sourceId: string; reason: string }> = () => [];
    let getTemplates: () => CommandTemplate[] = () => [];
    let isCatalogReady: () => boolean = () => false;
    const Harness = defineComponent({
      setup() {
        const catalog = useCommandCatalog({
          isTauriRuntime: () => true,
          scanUserCommandFiles,
          readUserCommandFile,
          readRuntimePlatform: async () => "win",
          locale
        });
        getIssues = () => catalog.loadIssues.value;
        getTemplates = () => catalog.commandTemplates.value;
        isCatalogReady = () => catalog.catalogReady.value;
        return () => null;
      }
    });

    const wrapper = mount(Harness);
    await waitForCondition(() => isCatalogReady());

    expect(getTemplates().find((item) => item.id === "custom-localized")?.title).toBe("中文标题");
    expect(getIssues()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "scan-failed",
          stage: "scan",
          sourceId: scanIssuePath
        })
      ])
    );

    locale.value = "en-US";
    await waitForCondition(
      () => getTemplates().find((item) => item.id === "custom-localized")?.title === "English Title"
    );

    expect(scanUserCommandFiles).toHaveBeenCalledTimes(1);
    expect(readUserCommandFile).toHaveBeenCalledTimes(1);
    expect(getIssues()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "scan-failed",
          stage: "scan",
          sourceId: scanIssuePath
        })
      ])
    );

    wrapper.unmount();
    setAppLocale("zh-CN");
  });

  it("only re-reads changed files after scan metadata changes", async () => {
    const aPath = "C:/Users/test/.zapcmd/commands/a.json";
    const bPath = "C:/Users/test/.zapcmd/commands/b.json";
    const scanUserCommandFiles = vi
      .fn(async () =>
        createScanResult([
          { path: aPath, modifiedMs: 1, size: 10 },
          { path: bPath, modifiedMs: 1, size: 10 }
        ])
      )
      .mockImplementationOnce(async () =>
        createScanResult([
          { path: aPath, modifiedMs: 1, size: 10 },
          { path: bPath, modifiedMs: 1, size: 10 }
        ])
      )
      .mockImplementationOnce(async () =>
        createScanResult([
          { path: aPath, modifiedMs: 2, size: 11 },
          { path: bPath, modifiedMs: 1, size: 10 }
        ])
      );
    const readUserCommandFile = vi.fn(async (path: string) => ({
      path,
      content: JSON.stringify({
        commands: [
          {
            id: path.endsWith("a.json") ? "custom-a" : "custom-b",
            name: path.endsWith("a.json") ? "A" : "B",
            tags: ["custom"],
            category: "custom",
            platform: "all",
            exec: {
              program: "echo",
              args: [path.endsWith("a.json") ? "a" : "b"]
            },
            adminRequired: false
          }
        ]
      }),
      modifiedMs: path.endsWith("a.json") ? 2 : 1,
      size: path.endsWith("a.json") ? 11 : 10
    }));

    let refreshUserCommands: () => Promise<void> = async () => undefined;
    const Harness = defineComponent({
      setup() {
        const catalog = useCommandCatalog({
          isTauriRuntime: () => true,
          scanUserCommandFiles,
          readUserCommandFile,
          readRuntimePlatform: async () => "win"
        });
        refreshUserCommands = catalog.refreshUserCommands;
        return () => null;
      }
    });

    const wrapper = mount(Harness);
    await waitForCondition(() => readUserCommandFile.mock.calls.length === 2);

    expect(readUserCommandFile).toHaveBeenCalledTimes(2);
    expect(readUserCommandFile).toHaveBeenNthCalledWith(1, aPath);
    expect(readUserCommandFile).toHaveBeenNthCalledWith(2, bPath);

    await refreshUserCommands();
    await waitForCondition(() => readUserCommandFile.mock.calls.length === 3);

    expect(readUserCommandFile).toHaveBeenCalledTimes(3);
    expect(readUserCommandFile).toHaveBeenLastCalledWith(aPath);

    wrapper.unmount();
  });

  it("remaps builtin titles on locale change without touching scan/read in non-tauri mode", async () => {
    setAppLocale("zh-CN");
    const locale = ref<"zh-CN" | "en-US">("zh-CN");
    const scanUserCommandFiles = vi.fn(async () => createScanResult([]));
    const readUserCommandFile = vi.fn();
    let getTemplates: () => CommandTemplate[] = () => [];
    let isCatalogReady: () => boolean = () => false;

    const Harness = defineComponent({
      setup() {
        const catalog = useCommandCatalog({
          isTauriRuntime: () => false,
          scanUserCommandFiles,
          readUserCommandFile,
          locale
        });
        getTemplates = () => catalog.commandTemplates.value;
        isCatalogReady = () => catalog.catalogReady.value;
        return () => null;
      }
    });

    const wrapper = mount(Harness);
    await waitForCondition(() => isCatalogReady());

    expect(getTemplates().find((item) => item.id === "docker-logs")?.title).toBe("查看容器日志");

    locale.value = "en-US";
    await waitForCondition(
      () => getTemplates().find((item) => item.id === "docker-logs")?.title === "Show Container Logs"
    );

    expect(scanUserCommandFiles).not.toHaveBeenCalled();
    expect(readUserCommandFile).not.toHaveBeenCalled();

    wrapper.unmount();
    setAppLocale("zh-CN");
  });

  it("remaps builtin locale without rebuilding builtin payload on every switch", async () => {
    setAppLocale("zh-CN");
    const locale = ref<"zh-CN" | "en-US">("zh-CN");

    try {
      let isCatalogReady: () => boolean = () => false;
      const Harness = defineComponent({
        setup() {
          const catalog = useCommandCatalog({
            isTauriRuntime: () => false,
            locale
          });
          isCatalogReady = () => catalog.catalogReady.value;
          return () => null;
        }
      });

      const wrapper = mount(Harness);
      await waitForCondition(() => isCatalogReady());
      const mountedBuildCount = runtimeLoader.getBuiltinCommandPayloadBuildCountForTest();

      locale.value = "en-US";
      await waitForCondition(() => isCatalogReady());

      expect(runtimeLoader.getBuiltinCommandPayloadBuildCountForTest()).toBe(mountedBuildCount);

      wrapper.unmount();
    } finally {
      setAppLocale("zh-CN");
    }
  });
});
