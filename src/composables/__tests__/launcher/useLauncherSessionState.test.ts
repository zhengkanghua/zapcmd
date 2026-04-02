import { nextTick, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import {
  LAUNCHER_SESSION_STORAGE_KEY,
  useLauncherSessionState
} from "../../launcher/useLauncherSessionState";
import type { StagedCommand } from "../../../features/launcher/types";
import type {
  CommandExecutionTemplate,
  ResolvedCommandExecution
} from "../../../features/commands/types";

const SESSION_VERSION = 2;

interface MockStorage {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
}

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

function createStagedCommand(id: string): StagedCommand {
  return {
    id,
    title: id,
    rawPreview: `echo ${id}`,
    renderedPreview: `echo ${id}`,
    executionTemplate: createExecTemplate("echo", [id]),
    execution: createExecExecution("echo", [id]),
    args: [],
    argValues: {}
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

describe("useLauncherSessionState", () => {
  it("uses window.localStorage when storage is omitted", () => {
    const snapshot = JSON.stringify({
      version: SESSION_VERSION,
      stagingExpanded: false,
      stagedCommands: [createStagedCommand("restored")]
    });
    window.localStorage.setItem(LAUNCHER_SESSION_STORAGE_KEY, snapshot);

    const stagedCommands = ref<StagedCommand[]>([]);
    const openStagingDrawer = vi.fn();

    useLauncherSessionState({
      enabled: ref(true),
      stagedCommands,
      stagingExpanded: ref(false),
      openStagingDrawer
    });

    expect(stagedCommands.value.map((item) => item.id)).toEqual(["restored"]);
    expect(openStagingDrawer).not.toHaveBeenCalled();

    window.localStorage.removeItem(LAUNCHER_SESSION_STORAGE_KEY);
  });

  it("restores queue snapshot but does not auto-open review drawer", () => {
    const snapshot = JSON.stringify({
      version: SESSION_VERSION,
      stagingExpanded: true,
      stagedCommands: [createStagedCommand("restored")]
    });
    const storage = createStorage(snapshot);
    const stagedCommands = ref<StagedCommand[]>([]);
    const stagingExpanded = ref(false);
    const openStagingDrawer = vi.fn();

    useLauncherSessionState({
      enabled: ref(true),
      stagedCommands,
      stagingExpanded,
      openStagingDrawer,
      storage
    });

    expect(stagedCommands.value).toHaveLength(1);
    expect(stagedCommands.value[0]?.id).toBe("restored");
    expect(stagingExpanded.value).toBe(false);
    expect(openStagingDrawer).not.toHaveBeenCalled();
  });

  it("clears snapshot when version is mismatched", () => {
    const snapshot = JSON.stringify({
      version: 1,
      stagingExpanded: true,
      stagedCommands: [createStagedCommand("restored")]
    });
    const storage = createStorage(snapshot);
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
    const snapshot = JSON.stringify({
      version: String(SESSION_VERSION),
      stagingExpanded: false,
      stagedCommands: [createStagedCommand("restored")]
    });
    const storage = createStorage(snapshot);
    const stagedCommands = ref<StagedCommand[]>([]);

    useLauncherSessionState({
      enabled: ref(true),
      stagedCommands,
      stagingExpanded: ref(false),
      openStagingDrawer: vi.fn(),
      storage
    });

    expect(stagedCommands.value.map((item) => item.id)).toEqual(["restored"]);
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("ignores snapshots where stagedCommands is not an array (but does not crash)", () => {
    const snapshot = JSON.stringify({
      version: SESSION_VERSION,
      stagingExpanded: true,
      stagedCommands: { not: "array" }
    });
    const storage = createStorage(snapshot);
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
    const snapshot = JSON.stringify({
      version: SESSION_VERSION,
      stagingExpanded: false,
      stagedCommands: [
        null,
        createStagedCommand("ok"),
        {
          id: 1,
          title: "bad-id-type",
          rawPreview: "echo bad",
          renderedPreview: "echo bad",
          executionTemplate: createExecTemplate("echo", ["bad"]),
          execution: createExecExecution("echo", ["bad"]),
          args: [],
          argValues: {}
        },
        {
          id: "bad",
          title: "",
          rawPreview: "echo bad",
          renderedPreview: "echo bad",
          executionTemplate: createExecTemplate("echo", ["bad"]),
          execution: createExecExecution("echo", ["bad"]),
          args: [],
          argValues: {}
        }
      ]
    });
    const storage = createStorage(snapshot);
    const stagedCommands = ref<StagedCommand[]>([]);

    useLauncherSessionState({
      enabled: ref(true),
      stagedCommands,
      stagingExpanded: ref(false),
      openStagingDrawer: vi.fn(),
      storage
    });

    expect(stagedCommands.value.map((item) => item.id)).toEqual(["ok"]);
  });

  it("keeps stagedCommands where args is not an array (sanitizes to empty args)", () => {
    const snapshot = JSON.stringify({
      version: SESSION_VERSION,
      stagingExpanded: false,
      stagedCommands: [
        {
          id: "args-not-array",
          title: "args-not-array",
          rawPreview: "echo args-not-array",
          renderedPreview: "echo args-not-array",
          executionTemplate: createExecTemplate("echo", ["args-not-array"]),
          execution: createExecExecution("echo", ["args-not-array"]),
          args: "oops",
          argValues: {}
        }
      ]
    });
    const storage = createStorage(snapshot);
    const stagedCommands = ref<StagedCommand[]>([]);

    useLauncherSessionState({
      enabled: ref(true),
      stagedCommands,
      stagingExpanded: ref(false),
      openStagingDrawer: vi.fn(),
      storage
    });

    expect(stagedCommands.value).toHaveLength(1);
    expect(stagedCommands.value[0]?.args).toEqual([]);
  });

  it("sanitizes args, argValues, and boolean flags during restore", () => {
    const snapshot = JSON.stringify({
      version: SESSION_VERSION,
      stagingExpanded: false,
      stagedCommands: [
        {
          id: "with-args",
          title: "with-args",
          rawPreview: "echo {{pid}}",
          renderedPreview: "echo 123",
          executionTemplate: createExecTemplate("echo", ["{{pid}}"]),
          execution: createExecExecution("echo", ["123"]),
          adminRequired: true,
          dangerous: false,
          args: [
            null,
            {
              key: 123,
              label: "PID",
              token: "{{pid}}"
            },
            {
              key: "pid",
              label: 123,
              token: "{{pid}}"
            },
            {
              key: "pid",
              label: "PID",
              token: 123
            },
            {
              key: "pid",
              label: "PID",
              token: "{{pid}}",
              placeholder: "123",
              required: true,
              defaultValue: "1",
              argType: "number",
              validationPattern: "^\\d+$",
              validationError: "bad",
              options: ["a", " ", 1]
            },
            {
              key: "broken",
              label: "Broken",
              token: ""
            }
          ],
          argValues: {
            pid: "123",
            extra: 1
          }
        },
        {
          id: "bad-argValues",
          title: "bad-argValues",
          rawPreview: "echo bad",
          renderedPreview: "echo bad",
          executionTemplate: createExecTemplate("echo", ["bad"]),
          execution: createExecExecution("echo", ["bad"]),
          args: [],
          argValues: "not-an-object"
        }
      ]
    });
    const storage = createStorage(snapshot);
    const stagedCommands = ref<StagedCommand[]>([]);

    useLauncherSessionState({
      enabled: ref(true),
      stagedCommands,
      stagingExpanded: ref(false),
      openStagingDrawer: vi.fn(),
      storage
    });

    expect(stagedCommands.value.map((item) => item.id)).toEqual(["with-args"]);
    const restored = stagedCommands.value[0] as StagedCommand;
    expect(restored.adminRequired).toBe(true);
    expect(restored.dangerous).toBe(false);
    expect(restored.argValues).toEqual({ pid: "123" });
    expect(restored.args).toHaveLength(1);
    expect(restored.args[0]).toMatchObject({
      key: "pid",
      label: "PID",
      token: "{{pid}}",
      placeholder: "123",
      required: true,
      defaultValue: "1",
      argType: "number",
      validationPattern: "^\\d+$",
      validationError: "bad",
      options: ["a"]
    });
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
    const snapshot = JSON.stringify({
      version: SESSION_VERSION,
      stagingExpanded: true,
      stagedCommands: [createStagedCommand("restored")]
    });
    const storage = createStorage(snapshot);
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

  it("persists queue updates when enabled", async () => {
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

    stagedCommands.value = [createStagedCommand("a"), createStagedCommand("b")];
    stagingExpanded.value = true;
    await nextTick();

    expect(storage.setItem).toHaveBeenCalled();
    const payload = JSON.parse(storage.setItem.mock.calls.at(-1)?.[1] as string) as {
      version: number;
      stagingExpanded: boolean;
      stagedCommands: Array<{ id: string; executionTemplate: { kind: string } }>;
    };
    expect(payload.version).toBe(SESSION_VERSION);
    expect(payload.stagedCommands[0]?.executionTemplate.kind).toBe("exec");
    expect(payload.stagingExpanded).toBe(true);
    expect(payload.stagedCommands.map((item) => item.id)).toEqual(["a", "b"]);
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
    const firstCallCount = storage.setItem.mock.calls.length;
    expect(firstCallCount).toBeGreaterThan(0);

    enabled.value = false;
    stagedCommands.value = [createStagedCommand("b")];
    await nextTick();

    expect(storage.setItem.mock.calls.length).toBe(firstCallCount);
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

    expect(storage.setItem).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(storage.setItem.mock.calls[0]?.[1] as string) as {
      stagedCommands: Array<{ id: string }>;
      stagingExpanded: boolean;
    };
    expect(payload.stagingExpanded).toBe(true);
    expect(payload.stagedCommands.map((item) => item.id)).toEqual(["b", "a"]);
  });
});
