import { effectScope, nextTick, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LAUNCHER_SESSION_STORAGE_KEY,
  useLauncherSessionState
} from "../../launcher/useLauncherSessionState";
import type { StagedCommand, StagedCommandPreflightCache } from "../../../features/launcher/types";
import type {
  CommandExecutionTemplate,
  ResolvedCommandExecution
} from "../../../features/commands/types";

const SESSION_VERSION = 3;

interface MockStorage {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
}

type SessionCommandLike = Pick<
  StagedCommand,
  "id" | "sourceCommandId" | "title" | "rawPreview"
>;

function createStorage(initialValue: string | null): MockStorage {
  let value = initialValue;
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, next: string) => {
      value = next;
    }),
    removeItem: vi.fn(() => {
      value = null;
    })
  };
}

function createExecTemplate(program: string, args: string[]): CommandExecutionTemplate {
  return {
    kind: "exec",
    program,
    args
  };
}

function createExecExecution(program: string, args: string[]): ResolvedCommandExecution {
  return {
    kind: "exec",
    program,
    args
  };
}

function createPreflightCache(
  overrides: Partial<StagedCommandPreflightCache> = {}
): StagedCommandPreflightCache {
  return {
    checkedAt: 1743648000000,
    issueCount: 1,
    source: "issues",
    issues: ["未检测到 Docker Desktop。"],
    ...overrides
  };
}

function createStagedCommand(id: string, overrides: Partial<StagedCommand> = {}): StagedCommand {
  return {
    id,
    sourceCommandId: id,
    title: id,
    rawPreview: `echo ${id}`,
    renderedPreview: `echo ${id}`,
    executionTemplate: createExecTemplate("echo", [id]),
    execution: createExecExecution("echo", [id]),
    args: [],
    argValues: {},
    ...overrides
  };
}

function createPersistedCommandSnapshot(
  id: string,
  overrides: Partial<SessionCommandLike> = {}
): SessionCommandLike {
  return {
    id,
    sourceCommandId: id,
    title: id,
    rawPreview: `echo ${id}`,
    ...overrides
  };
}

function createLegacySessionCommand(
  id: string,
  overrides: Partial<StagedCommand> = {}
): Record<string, unknown> {
  return {
    ...createStagedCommand(id),
    prerequisites: [
      {
        id: "docker",
        type: "binary",
        required: true,
        check: "docker",
        displayName: "Docker Desktop",
        resolutionHint: "安装 Docker Desktop 后重试"
      }
    ],
    preflightCache: createPreflightCache(),
    ...overrides
  };
}

function restoreSnapshots(commands: readonly SessionCommandLike[]): StagedCommand[] {
  return commands.map((command) =>
    createStagedCommand(command.id, {
      sourceCommandId: command.sourceCommandId,
      title: command.title,
      rawPreview: command.rawPreview
    })
  );
}

function readLatestPayload(storage: MockStorage): {
  version: number;
  stagingExpanded: boolean;
  stagedCommands: SessionCommandLike[];
} {
  const raw = storage.setItem.mock.calls.at(-1)?.[1];
  if (typeof raw !== "string") {
    throw new Error("expected launcher session payload to be written");
  }
  return JSON.parse(raw) as {
    version: number;
    stagingExpanded: boolean;
    stagedCommands: SessionCommandLike[];
  };
}

describe("useLauncherSessionState", () => {
  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.removeItem(LAUNCHER_SESSION_STORAGE_KEY);
  });

  it("uses window.localStorage when storage is omitted", () => {
    window.localStorage.setItem(
      LAUNCHER_SESSION_STORAGE_KEY,
      JSON.stringify({
        version: SESSION_VERSION,
        stagingExpanded: false,
        stagedCommands: [createPersistedCommandSnapshot("restored")]
      })
    );

    const stagedCommands = ref<StagedCommand[]>([]);
    const openStagingDrawer = vi.fn();

    useLauncherSessionState({
      enabled: ref(true),
      stagedCommands,
      stagingExpanded: ref(false),
      openStagingDrawer,
      restoreStagedCommands: restoreSnapshots
    });

    expect(stagedCommands.value.map((item) => item.id)).toEqual(["restored"]);
    expect(openStagingDrawer).not.toHaveBeenCalled();
  });

  it("projects legacy queue snapshots to minimal DTOs before passing them to the restore hook", () => {
    const storage = createStorage(
      JSON.stringify({
        version: SESSION_VERSION,
        stagingExpanded: true,
        stagedCommands: [
          createLegacySessionCommand("restored", {
            sourceCommandId: "docker-logs",
            title: "Docker Logs",
            rawPreview: "docker logs {{target}}"
          })
        ]
      })
    );
    const stagedCommands = ref<StagedCommand[]>([]);
    const restoreStagedCommands = vi.fn((commands: readonly SessionCommandLike[]) =>
      restoreSnapshots(commands)
    );

    useLauncherSessionState({
      enabled: ref(true),
      stagedCommands,
      stagingExpanded: ref(false),
      openStagingDrawer: vi.fn(),
      storage,
      restoreStagedCommands
    });

    expect(restoreStagedCommands).toHaveBeenCalledWith([
      createPersistedCommandSnapshot("restored", {
        sourceCommandId: "docker-logs",
        title: "Docker Logs",
        rawPreview: "docker logs {{target}}"
      })
    ]);
    expect(stagedCommands.value[0]?.title).toBe("Docker Logs");
    expect(stagedCommands.value[0]?.preflightCache).toBeUndefined();
    expect(stagedCommands.value[0]?.prerequisites).toBeUndefined();
  });

  it("clears snapshot when version is mismatched", () => {
    const storage = createStorage(
      JSON.stringify({
        version: 1,
        stagingExpanded: true,
        stagedCommands: [createPersistedCommandSnapshot("restored")]
      })
    );
    const stagedCommands = ref<StagedCommand[]>([]);

    useLauncherSessionState({
      enabled: ref(true),
      stagedCommands,
      stagingExpanded: ref(false),
      openStagingDrawer: vi.fn(),
      storage
    });

    expect(stagedCommands.value).toHaveLength(0);
    expect(storage.removeItem).toHaveBeenCalledWith(LAUNCHER_SESSION_STORAGE_KEY);
  });

  it("accepts snapshot when version is a numeric string", () => {
    const storage = createStorage(
      JSON.stringify({
        version: String(SESSION_VERSION),
        stagingExpanded: false,
        stagedCommands: [createPersistedCommandSnapshot("restored")]
      })
    );
    const stagedCommands = ref<StagedCommand[]>([]);

    useLauncherSessionState({
      enabled: ref(true),
      stagedCommands,
      stagingExpanded: ref(false),
      openStagingDrawer: vi.fn(),
      storage,
      restoreStagedCommands: restoreSnapshots
    });

    expect(stagedCommands.value.map((item) => item.id)).toEqual(["restored"]);
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("ignores snapshots where stagedCommands is not an array (but does not crash)", () => {
    const storage = createStorage(
      JSON.stringify({
        version: SESSION_VERSION,
        stagingExpanded: true,
        stagedCommands: { not: "array" }
      })
    );
    const stagedCommands = ref<StagedCommand[]>([]);
    const openStagingDrawer = vi.fn();

    useLauncherSessionState({
      enabled: ref(true),
      stagedCommands,
      stagingExpanded: ref(false),
      openStagingDrawer,
      storage
    });

    expect(stagedCommands.value).toHaveLength(0);
    expect(openStagingDrawer).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("filters invalid stagedCommands safely during restore", () => {
    const storage = createStorage(
      JSON.stringify({
        version: SESSION_VERSION,
        stagingExpanded: false,
        stagedCommands: [
          null,
          createPersistedCommandSnapshot("ok"),
          {
            id: 1,
            title: "bad-id-type",
            rawPreview: "echo bad"
          },
          {
            id: "bad-title",
            title: "",
            rawPreview: "echo bad-title"
          }
        ]
      })
    );
    const stagedCommands = ref<StagedCommand[]>([]);

    useLauncherSessionState({
      enabled: ref(true),
      stagedCommands,
      stagingExpanded: ref(false),
      openStagingDrawer: vi.fn(),
      storage,
      restoreStagedCommands: restoreSnapshots
    });

    expect(stagedCommands.value.map((item) => item.id)).toEqual(["ok"]);
  });

  it("removes invalid snapshot payload and continues safely", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const storage = createStorage("{invalid json");
    const stagedCommands = ref<StagedCommand[]>([]);

    useLauncherSessionState({
      enabled: ref(true),
      stagedCommands,
      stagingExpanded: ref(false),
      openStagingDrawer: vi.fn(),
      storage
    });

    expect(stagedCommands.value).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith("launcher session snapshot invalid; clearing", expect.any(Error));
    expect(storage.removeItem).toHaveBeenCalledWith(LAUNCHER_SESSION_STORAGE_KEY);
    warnSpy.mockRestore();
  });

  it("ignores session restore when storage getItem throws", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const storage: MockStorage = {
      getItem: vi.fn(() => {
        throw new Error("storage blocked");
      }),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    const stagedCommands = ref<StagedCommand[]>([]);

    useLauncherSessionState({
      enabled: ref(true),
      stagedCommands,
      stagingExpanded: ref(false),
      openStagingDrawer: vi.fn(),
      storage
    });

    expect(stagedCommands.value).toHaveLength(0);
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "launcher session snapshot read failed; skipping restore",
      expect.any(Error)
    );
    warnSpy.mockRestore();
  });

  it("clears snapshot when parsed payload is null", () => {
    const storage = createStorage("null");
    const stagedCommands = ref<StagedCommand[]>([]);

    useLauncherSessionState({
      enabled: ref(true),
      stagedCommands,
      stagingExpanded: ref(false),
      openStagingDrawer: vi.fn(),
      storage
    });

    expect(stagedCommands.value).toHaveLength(0);
    expect(storage.removeItem).toHaveBeenCalledWith(LAUNCHER_SESSION_STORAGE_KEY);
  });

  it("skips restore when disabled (does not read from storage)", () => {
    const storage = createStorage(
      JSON.stringify({
        version: SESSION_VERSION,
        stagingExpanded: true,
        stagedCommands: [createPersistedCommandSnapshot("restored")]
      })
    );
    const stagedCommands = ref<StagedCommand[]>([]);

    useLauncherSessionState({
      enabled: ref(false),
      stagedCommands,
      stagingExpanded: ref(false),
      openStagingDrawer: vi.fn(),
      storage
    });

    expect(stagedCommands.value).toHaveLength(0);
    expect(storage.getItem).not.toHaveBeenCalled();
  });

  it("persists queue structure asynchronously using only the minimal snapshot payload", async () => {
    vi.useFakeTimers();
    const storage = createStorage(null);
    const stagedCommands = ref<StagedCommand[]>([]);
    const stagingExpanded = ref(false);

    useLauncherSessionState({
      enabled: ref(true),
      stagedCommands,
      stagingExpanded,
      openStagingDrawer: vi.fn(),
      storage
    });

    stagedCommands.value = [
      createStagedCommand("a", {
        sourceCommandId: "docker-logs",
        title: "Docker Logs",
        rawPreview: "docker logs {{target}}",
        renderedPreview: "docker logs api",
        argValues: {
          target: "api"
        },
        prerequisites: [
          {
            id: "docker",
            type: "binary",
            required: true,
            check: "docker"
          }
        ],
        preflightCache: createPreflightCache()
      }),
      createStagedCommand("b")
    ];
    stagingExpanded.value = true;
    await nextTick();

    expect(storage.setItem).not.toHaveBeenCalled();

    await vi.runOnlyPendingTimersAsync();
    await nextTick();

    const payload = readLatestPayload(storage);
    expect(payload.version).toBe(SESSION_VERSION);
    expect(payload.stagingExpanded).toBe(true);
    expect(payload.stagedCommands).toEqual([
      createPersistedCommandSnapshot("a", {
        sourceCommandId: "docker-logs",
        title: "Docker Logs",
        rawPreview: "docker logs {{target}}"
      }),
      createPersistedCommandSnapshot("b")
    ]);
  });

  it("does not persist when storage is explicitly null", async () => {
    const stagedCommands = ref<StagedCommand[]>([]);
    const stagingExpanded = ref(false);

    useLauncherSessionState({
      enabled: ref(true),
      stagedCommands,
      stagingExpanded,
      openStagingDrawer: vi.fn(),
      storage: null
    });

    stagedCommands.value = [createStagedCommand("x")];
    stagingExpanded.value = true;
    await nextTick();
  });

  it("stops persisting when enabled becomes false", async () => {
    vi.useFakeTimers();
    const storage = createStorage(null);
    const stagedCommands = ref<StagedCommand[]>([]);
    const stagingExpanded = ref(false);
    const enabled = ref(true);

    useLauncherSessionState({
      enabled,
      stagedCommands,
      stagingExpanded,
      openStagingDrawer: vi.fn(),
      storage
    });

    stagedCommands.value = [createStagedCommand("a")];
    await nextTick();
    await vi.runOnlyPendingTimersAsync();
    await nextTick();
    const firstCallCount = storage.setItem.mock.calls.length;
    expect(firstCallCount).toBeGreaterThan(0);

    enabled.value = false;
    stagedCommands.value = [createStagedCommand("b")];
    await nextTick();

    expect(storage.setItem.mock.calls.length).toBe(firstCallCount);
  });

  it("restores after enabled flips true and rehydrates restored commands through the hook", async () => {
    const storage = createStorage(
      JSON.stringify({
        version: SESSION_VERSION,
        stagingExpanded: false,
        stagedCommands: [
          createPersistedCommandSnapshot("docker-logs-1710000000000", {
            sourceCommandId: "docker-logs",
            title: "旧标题",
            rawPreview: "docker logs {{target}} --tail 120"
          })
        ]
      })
    );
    const stagedCommands = ref<StagedCommand[]>([]);
    const enabled = ref(false);

    useLauncherSessionState({
      enabled,
      stagedCommands,
      stagingExpanded: ref(false),
      openStagingDrawer: vi.fn(),
      storage,
      restoreStagedCommands: (commands) =>
        restoreSnapshots(commands).map((command) => ({
          ...command,
          title: "Docker Logs",
          rawPreview: "docker logs {{target}} --tail 30",
          renderedPreview: "docker logs old-target --tail 30"
        }))
    });

    expect(stagedCommands.value).toHaveLength(0);

    enabled.value = true;
    await nextTick();

    expect(stagedCommands.value).toHaveLength(1);
    expect(stagedCommands.value[0]?.title).toBe("Docker Logs");
    expect(stagedCommands.value[0]?.renderedPreview).toBe("docker logs old-target --tail 30");
  });

  it("skips persistence when disabled", async () => {
    const storage = createStorage(null);
    const stagedCommands = ref<StagedCommand[]>([]);
    const stagingExpanded = ref(false);

    useLauncherSessionState({
      enabled: ref(false),
      stagedCommands,
      stagingExpanded,
      openStagingDrawer: vi.fn(),
      storage
    });

    stagedCommands.value = [createStagedCommand("x")];
    stagingExpanded.value = true;
    await nextTick();

    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("defers persistence while suspendPersistence is true and flushes once after resume", async () => {
    vi.useFakeTimers();
    const storage = createStorage(null);
    const stagedCommands = ref<StagedCommand[]>([]);
    const stagingExpanded = ref(true);
    const suspendPersistence = ref(true);

    useLauncherSessionState({
      enabled: ref(true),
      stagedCommands,
      stagingExpanded,
      suspendPersistence,
      openStagingDrawer: vi.fn(),
      storage
    });

    stagedCommands.value = [createStagedCommand("a"), createStagedCommand("b")];
    await nextTick();
    stagedCommands.value = [createStagedCommand("b"), createStagedCommand("a")];
    await nextTick();

    expect(storage.setItem).not.toHaveBeenCalled();

    suspendPersistence.value = false;
    await nextTick();
    await vi.runOnlyPendingTimersAsync();
    await nextTick();

    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(readLatestPayload(storage).stagedCommands.map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("does not persist when only argValues and renderedPreview change", async () => {
    vi.useFakeTimers();
    const storage = createStorage(null);
    const stagedCommands = ref<StagedCommand[]>([
      createStagedCommand("debounced", {
        rawPreview: "echo {{pid}}",
        renderedPreview: "echo 0",
        argValues: {
          pid: "0"
        }
      })
    ]);

    useLauncherSessionState({
      enabled: ref(true),
      stagedCommands,
      stagingExpanded: ref(false),
      openStagingDrawer: vi.fn(),
      storage
    });

    stagedCommands.value[0]!.argValues = {
      pid: "123"
    };
    stagedCommands.value[0]!.renderedPreview = "echo 123";
    await nextTick();

    vi.runAllTimers();
    await nextTick();

    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("does not persist when only preflightCache changes", async () => {
    vi.useFakeTimers();
    const storage = createStorage(null);
    const stagedCommands = ref<StagedCommand[]>([createStagedCommand("queued")]);

    useLauncherSessionState({
      enabled: ref(true),
      stagedCommands,
      stagingExpanded: ref(false),
      openStagingDrawer: vi.fn(),
      storage
    });

    stagedCommands.value[0]!.preflightCache = createPreflightCache({
      issues: ["网络异常，稍后重试。"],
      source: "system-failure"
    });
    await nextTick();

    vi.runAllTimers();
    await nextTick();

    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("does not persist when only runtime-only execution fields change", async () => {
    vi.useFakeTimers();
    const storage = createStorage(null);
    const stagedCommands = ref<StagedCommand[]>([
      createStagedCommand("queued", {
        executionTemplate: createExecTemplate("echo", ["{{value}}"]),
        execution: createExecExecution("echo", ["123"]),
        args: [
          {
            key: "value",
            label: "值",
            token: "{{value}}",
            required: true,
            argType: "text"
          }
        ],
        argValues: {
          value: "123"
        },
        rawPreview: "echo {{value}}",
        renderedPreview: "echo 123"
      })
    ]);

    useLauncherSessionState({
      enabled: ref(true),
      stagedCommands,
      stagingExpanded: ref(false),
      openStagingDrawer: vi.fn(),
      storage
    });

    stagedCommands.value[0]!.execution = createExecExecution("printf", ["123"]);
    stagedCommands.value[0]!.executionTemplate = createExecTemplate("printf", ["{{value}}"]);
    stagedCommands.value[0]!.args = [
      {
        key: "value",
        label: "新的值标签",
        token: "{{value}}",
        required: true,
        argType: "text"
      }
    ];
    await nextTick();

    vi.runAllTimers();
    await nextTick();

    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("persists the latest queue order after delete and reorder, then restores that order", async () => {
    vi.useFakeTimers();
    const storage = createStorage(null);
    const writerCommands = ref<StagedCommand[]>([]);

    useLauncherSessionState({
      enabled: ref(true),
      stagedCommands: writerCommands,
      stagingExpanded: ref(true),
      openStagingDrawer: vi.fn(),
      storage
    });

    writerCommands.value = [
      createStagedCommand("a"),
      createStagedCommand("b"),
      createStagedCommand("c")
    ];
    await nextTick();

    writerCommands.value = [createStagedCommand("c"), createStagedCommand("a")];
    await nextTick();
    await vi.runOnlyPendingTimersAsync();
    await nextTick();

    const restoredCommands = ref<StagedCommand[]>([]);
    useLauncherSessionState({
      enabled: ref(true),
      stagedCommands: restoredCommands,
      stagingExpanded: ref(false),
      openStagingDrawer: vi.fn(),
      storage,
      restoreStagedCommands: restoreSnapshots
    });

    expect(restoredCommands.value.map((item) => item.id)).toEqual(["c", "a"]);
  });

  it("flushes pending structural persistence when the scope is disposed", async () => {
    vi.useFakeTimers();
    const storage = createStorage(null);
    const stagedCommands = ref<StagedCommand[]>([]);
    const scope = effectScope();

    scope.run(() => {
      useLauncherSessionState({
        enabled: ref(true),
        stagedCommands,
        stagingExpanded: ref(false),
        openStagingDrawer: vi.fn(),
        storage
      });
    });

    stagedCommands.value = [createStagedCommand("debounced")];
    await nextTick();
    scope.stop();
    await nextTick();

    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(readLatestPayload(storage).stagedCommands[0]).toEqual(
      createPersistedCommandSnapshot("debounced", {
        rawPreview: "echo debounced"
      })
    );
  });

  it("does not crash when window.localStorage getter throws", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, "localStorage");
    const stagedCommands = ref<StagedCommand[]>([]);

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("getter blocked");
      }
    });

    try {
      expect(() =>
        useLauncherSessionState({
          enabled: ref(true),
          stagedCommands,
          stagingExpanded: ref(false),
          openStagingDrawer: vi.fn(),
          restoreStagedCommands: restoreSnapshots
        })
      ).not.toThrow();
      expect(stagedCommands.value).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledWith(
        "launcher session storage unavailable",
        expect.any(Error)
      );
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(window, "localStorage", originalDescriptor);
      }
      warnSpy.mockRestore();
    }
  });
});
