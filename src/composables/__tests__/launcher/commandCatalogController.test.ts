import { describe, expect, it, vi } from "vitest";
import { customRef, ref } from "vue";
import { createCommandCatalogState } from "../../launcher/useCommandCatalog/state";
import type { UseCommandCatalogOptions } from "../../launcher/useCommandCatalog/types";

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function createReentrantDisabledCommandIds(params: {
  onFirstRead: () => void;
}) {
  return customRef<string[]>((track) => {
    return {
      get() {
        track();
        params.onFirstRead();
        return [];
      },
      set() {
        // 只读测试 ref，不需要响应写入。
      }
    };
  });
}

describe("command catalog controller internals", () => {
  it("request guard only treats the newest request as latest", async () => {
    const { createLatestRequestGuard } = await import(
      "../../launcher/useCommandCatalog/requestGuard"
    );

    const guard = createLatestRequestGuard();
    const first = guard.start();
    const second = guard.start();

    expect(guard.isLatest(first)).toBe(false);
    expect(guard.isLatest(second)).toBe(true);
  });

  it("controller helpers keep missing ports mapped to read-failed", async () => {
    const { setMissingPortsIssue } = await import(
      "../../launcher/useCommandCatalog/controller"
    );

    const options: UseCommandCatalogOptions = {
      isTauriRuntime: () => true,
      disabledCommandIds: ref([])
    };
    const state = createCommandCatalogState(options);

    setMissingPortsIssue(state);

    expect(state.loadIssues.value).toContainEqual(
      expect.objectContaining({
        code: "read-failed",
        stage: "read",
        sourceId: "user-command-files"
      })
    );
  });

  it("remapFromCacheIfPrimed returns false when no primed scan exists", async () => {
    const { createCommandCatalogRuntimeController } = await import(
      "../../launcher/useCommandCatalog/controller"
    );

    const options: UseCommandCatalogOptions = {
      isTauriRuntime: () => true,
      disabledCommandIds: ref([]),
      scanUserCommandFiles: async () => ({ files: [], issues: [] }),
      readUserCommandFile: async () => ({
        path: "C:/Users/test/.zapcmd/commands/custom.json",
        content: "{\"commands\":[]}",
        modifiedMs: 1,
        size: 15
      }),
      readRuntimePlatform: async () => "win"
    };
    const state = createCommandCatalogState(options);

    const controller = createCommandCatalogRuntimeController(options, state);

    await expect(controller.remapFromCacheIfPrimed()).resolves.toBe(false);
    expect(state.catalogStatus.value).toBe("idle");
    expect(state.catalogReady.value).toBe(false);
  });

  it("marks catalog error when builtin loading fails before builtin payload is ready", async () => {
    const runtimePlatformModule = await import(
      "../../launcher/useCommandCatalog/runtimePlatform"
    );
    const { createCommandCatalogRuntimeController } = await import(
      "../../launcher/useCommandCatalog/controller"
    );
    const loadBuiltinSpy = vi
      .spyOn(runtimePlatformModule, "loadBuiltinTemplatesAndSourceForState")
      .mockRejectedValueOnce(new Error("builtin load failed"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    try {
      const options: UseCommandCatalogOptions = {
        isTauriRuntime: () => true,
        disabledCommandIds: ref([]),
        scanUserCommandFiles: async () => ({ files: [], issues: [] }),
        readUserCommandFile: async () => ({
          path: "C:/Users/test/.zapcmd/commands/custom.json",
          content: "{\"commands\":[]}",
          modifiedMs: 1,
          size: 15
        }),
        readRuntimePlatform: async () => "win"
      };
      const state = createCommandCatalogState(options);
      const controller = createCommandCatalogRuntimeController(options, state);

      await controller.refreshUserCommands();

      expect(loadBuiltinSpy).toHaveBeenCalledTimes(1);
      expect(state.catalogStatus.value).toBe("error");
      expect(state.catalogReady.value).toBe(false);
      expect(state.loadIssues.value).toContainEqual(
        expect.objectContaining({
          code: "scan-failed",
          stage: "scan",
          sourceId: "builtin-command-templates"
        })
      );
    } finally {
      loadBuiltinSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it("refresh reuses the in-flight request before runtime platform resolves", async () => {
    const { createCommandCatalogRuntimeController } = await import(
      "../../launcher/useCommandCatalog/controller"
    );

    const firstPlatform = createDeferred<string>();
    const scanUserCommandFiles = vi.fn(async () => ({ files: [], issues: [] }));
    const readRuntimePlatform = vi
      .fn<() => Promise<string>>()
      .mockImplementationOnce(() => firstPlatform.promise)
      .mockImplementationOnce(async () => "win");
    const options: UseCommandCatalogOptions = {
      isTauriRuntime: () => true,
      disabledCommandIds: ref([]),
      scanUserCommandFiles,
      readUserCommandFile: async () => ({
        path: "C:/Users/test/.zapcmd/commands/custom.json",
        content: "{\"commands\":[]}",
        modifiedMs: 1,
        size: 15
      }),
      readRuntimePlatform
    };
    const state = createCommandCatalogState(options);
    const controller = createCommandCatalogRuntimeController(options, state);

    const firstRefresh = controller.refreshUserCommands();
    const secondRefresh = controller.refreshUserCommands();
    firstPlatform.resolve("win");

    await Promise.all([firstRefresh, secondRefresh]);

    expect(readRuntimePlatform).toHaveBeenCalledTimes(1);
    expect(scanUserCommandFiles).toHaveBeenCalledTimes(1);
    expect(state.catalogStatus.value).toBe("ready");
    expect(state.catalogReady.value).toBe(true);
  });

  it("reuses the in-flight refresh instead of starting a second scan", async () => {
    const { createCommandCatalogRuntimeController } = await import(
      "../../launcher/useCommandCatalog/controller"
    );

    const options: UseCommandCatalogOptions = {
      isTauriRuntime: () => true,
      disabledCommandIds: ref([]),
      scanUserCommandFiles: async () => ({ files: [], issues: [] }),
      readUserCommandFile: async () => ({
        path: "C:/Users/test/.zapcmd/commands/custom.json",
        content: "{\"commands\":[]}",
        modifiedMs: 1,
        size: 15
      }),
      readRuntimePlatform: async () => "win"
    };
    const state = createCommandCatalogState(options);
    const refreshDeferred = createDeferred<{ payloadEntries: []; issues: [] }>();
    const refreshFromScan = vi.fn(async () => refreshDeferred.promise);
    (state as { userCommandSourceCache: unknown }).userCommandSourceCache = {
      hasPrimedScan: () => false,
      remapFromCache: vi.fn(() => ({ payloadEntries: [], issues: [] })),
      refreshFromScan,
      clear: vi.fn()
    };
    const controller = createCommandCatalogRuntimeController(options, state);

    const firstRefresh = controller.refreshUserCommands();
    await flushMicrotasks();
    const secondRefresh = controller.refreshUserCommands();
    refreshDeferred.resolve({ payloadEntries: [], issues: [] });

    await Promise.all([firstRefresh, secondRefresh]);

    expect(refreshFromScan).toHaveBeenCalledTimes(1);
    expect(state.catalogReady.value).toBe(true);
  });

  it("refresh reuses the in-flight request before builtin templates finish loading", async () => {
    const runtimePlatformModule = await import(
      "../../launcher/useCommandCatalog/runtimePlatform"
    );
    const { createCommandCatalogRuntimeController } = await import(
      "../../launcher/useCommandCatalog/controller"
    );
    const originalLoadBuiltin = runtimePlatformModule.loadBuiltinTemplatesAndSourceForState;
    const firstBuiltin = createDeferred<void>();
    const loadBuiltinSpy = vi
      .spyOn(runtimePlatformModule, "loadBuiltinTemplatesAndSourceForState")
      .mockImplementationOnce(async () => firstBuiltin.promise)
      .mockImplementation(async (params) => originalLoadBuiltin(params));

    try {
      const scanUserCommandFiles = vi.fn(async () => ({ files: [], issues: [] }));
      const options: UseCommandCatalogOptions = {
        isTauriRuntime: () => true,
        disabledCommandIds: ref([]),
        scanUserCommandFiles,
        readUserCommandFile: async () => ({
          path: "C:/Users/test/.zapcmd/commands/custom.json",
          content: "{\"commands\":[]}",
          modifiedMs: 1,
          size: 15
        }),
        readRuntimePlatform: async () => "win"
      };
      const state = createCommandCatalogState(options);
      const controller = createCommandCatalogRuntimeController(options, state);

      const firstRefresh = controller.refreshUserCommands();
      await flushMicrotasks();
      const secondRefresh = controller.refreshUserCommands();
      firstBuiltin.resolve(undefined);

      await Promise.all([firstRefresh, secondRefresh]);

      expect(loadBuiltinSpy).toHaveBeenCalledTimes(1);
      expect(scanUserCommandFiles).toHaveBeenCalledTimes(1);
      expect(state.catalogStatus.value).toBe("ready");
      expect(state.catalogReady.value).toBe(true);
    } finally {
      loadBuiltinSpy.mockRestore();
    }
  });

  it("remapFromCacheIfPrimed ignores stale request after runtime platform resolve", async () => {
    const { createCommandCatalogRuntimeController } = await import(
      "../../launcher/useCommandCatalog/controller"
    );

    const firstPlatform = createDeferred<string>();
    const readRuntimePlatform = vi
      .fn<() => Promise<string>>()
      .mockImplementationOnce(() => firstPlatform.promise)
      .mockImplementationOnce(async () => "win");
    const options: UseCommandCatalogOptions = {
      isTauriRuntime: () => true,
      disabledCommandIds: ref([]),
      scanUserCommandFiles: async () => ({ files: [], issues: [] }),
      readUserCommandFile: async () => ({
        path: "C:/Users/test/.zapcmd/commands/custom.json",
        content: "{\"commands\":[]}",
        modifiedMs: 1,
        size: 15
      }),
      readRuntimePlatform
    };
    const state = createCommandCatalogState(options);
    const remapFromCache = vi.fn(() => ({
      payloadEntries: [],
      issues: []
    }));
    (state as { userCommandSourceCache: unknown }).userCommandSourceCache = {
      hasPrimedScan: () => true,
      remapFromCache,
      refreshFromScan: vi.fn(async () => ({ payloadEntries: [], issues: [] })),
      clear: vi.fn()
    };
    const controller = createCommandCatalogRuntimeController(options, state);

    const staleRemap = controller.remapFromCacheIfPrimed();
    const newerRefresh = controller.refreshUserCommands();
    firstPlatform.resolve("win");

    await expect(staleRemap).resolves.toBe(true);
    await newerRefresh;

    expect(remapFromCache).not.toHaveBeenCalled();
    expect(state.catalogReady.value).toBe(true);
  });

  it("remapFromCacheIfPrimed ignores stale request after builtin templates finish loading", async () => {
    const runtimePlatformModule = await import(
      "../../launcher/useCommandCatalog/runtimePlatform"
    );
    const { createCommandCatalogRuntimeController } = await import(
      "../../launcher/useCommandCatalog/controller"
    );
    const originalLoadBuiltin = runtimePlatformModule.loadBuiltinTemplatesAndSourceForState;
    const firstBuiltin = createDeferred<void>();
    const loadBuiltinSpy = vi
      .spyOn(runtimePlatformModule, "loadBuiltinTemplatesAndSourceForState")
      .mockImplementationOnce(async () => firstBuiltin.promise)
      .mockImplementation(async (params) => originalLoadBuiltin(params));

    try {
      const options: UseCommandCatalogOptions = {
        isTauriRuntime: () => true,
        disabledCommandIds: ref([]),
        scanUserCommandFiles: async () => ({ files: [], issues: [] }),
        readUserCommandFile: async () => ({
          path: "C:/Users/test/.zapcmd/commands/custom.json",
          content: "{\"commands\":[]}",
          modifiedMs: 1,
          size: 15
        }),
        readRuntimePlatform: async () => "win"
      };
      const state = createCommandCatalogState(options);
      const remapFromCache = vi.fn(() => ({
        payloadEntries: [],
        issues: []
      }));
      (state as { userCommandSourceCache: unknown }).userCommandSourceCache = {
        hasPrimedScan: () => true,
        remapFromCache,
        refreshFromScan: vi.fn(async () => ({ payloadEntries: [], issues: [] })),
        clear: vi.fn()
      };
      const controller = createCommandCatalogRuntimeController(options, state);

      const staleRemap = controller.remapFromCacheIfPrimed();
      await flushMicrotasks();
      const newerRefresh = controller.refreshUserCommands();
      firstBuiltin.resolve(undefined);

      await expect(staleRemap).resolves.toBe(true);
      await newerRefresh;

      expect(remapFromCache).not.toHaveBeenCalled();
      expect(state.catalogReady.value).toBe(true);
    } finally {
      loadBuiltinSpy.mockRestore();
    }
  });

  it("non-tauri refresh tolerates re-entrant merge without letting stale request overwrite ready state", async () => {
    const { createCommandCatalogRuntimeController } = await import(
      "../../launcher/useCommandCatalog/controller"
    );

    let controller: ReturnType<typeof createCommandCatalogRuntimeController> | null = null;
    let reentered = false;
    const disabledCommandIds = createReentrantDisabledCommandIds({
      onFirstRead: () => {
        if (!reentered && controller) {
          reentered = true;
          void controller.refreshUserCommands();
        }
      }
    });
    const options: UseCommandCatalogOptions = {
      isTauriRuntime: () => false,
      disabledCommandIds
    };
    const state = createCommandCatalogState(options);
    controller = createCommandCatalogRuntimeController(options, state);

    await controller.refreshUserCommands();
    await flushMicrotasks();

    expect(reentered).toBe(true);
    expect(state.catalogStatus.value).toBe("ready");
    expect(state.catalogReady.value).toBe(true);
  });

  it("missing-port refresh tolerates re-entrant merge without letting stale request overwrite ready state", async () => {
    const { createCommandCatalogRuntimeController } = await import(
      "../../launcher/useCommandCatalog/controller"
    );

    let controller: ReturnType<typeof createCommandCatalogRuntimeController> | null = null;
    let reentered = false;
    const disabledCommandIds = createReentrantDisabledCommandIds({
      onFirstRead: () => {
        if (!reentered && controller) {
          reentered = true;
          void controller.refreshUserCommands();
        }
      }
    });
    const options: UseCommandCatalogOptions = {
      isTauriRuntime: () => true,
      disabledCommandIds,
      readRuntimePlatform: async () => "win"
    };
    const state = createCommandCatalogState(options);
    controller = createCommandCatalogRuntimeController(options, state);

    await controller.refreshUserCommands();
    await flushMicrotasks();

    expect(reentered).toBe(true);
    expect(state.catalogStatus.value).toBe("ready");
    expect(state.catalogReady.value).toBe(true);
    expect(state.loadIssues.value).toContainEqual(
      expect.objectContaining({
        code: "read-failed",
        stage: "read",
        sourceId: "user-command-files"
      })
    );
  });
});
