import { nextTick, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import {
  LAUNCHER_SESSION_STORAGE_KEY,
  useLauncherSessionState
} from "../../launcher/useLauncherSessionState";
import type { StagedCommand } from "../../../features/launcher/types";

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
    renderedCommand: `echo ${id}`,
    args: [],
    argValues: {}
  };
}

describe("useLauncherSessionState", () => {
  it("restores queue snapshot and drawer state from storage", () => {
    const snapshot = JSON.stringify({
      version: 1,
      stagingExpanded: true,
      stagedCommands: [createStagedCommand("restored")]
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

    expect(stagedCommands.value).toHaveLength(1);
    expect(stagedCommands.value[0]?.id).toBe("restored");
    expect(openStagingDrawer).toHaveBeenCalledTimes(1);
  });

  it("removes invalid snapshot payload and continues safely", () => {
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
    expect(storage.removeItem).toHaveBeenCalledWith(LAUNCHER_SESSION_STORAGE_KEY);
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
      stagedCommands: Array<{ id: string }>;
    };
    expect(payload.version).toBe(1);
    expect(payload.stagingExpanded).toBe(true);
    expect(payload.stagedCommands.map((item) => item.id)).toEqual(["a", "b"]);
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
});
