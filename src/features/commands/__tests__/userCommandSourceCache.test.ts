import { afterEach, describe, expect, it, vi } from "vitest";
import { createUserCommandSourceCache } from "../userCommandSourceCache";

function createCommandFile(path: string, label: string) {
  const content = JSON.stringify({
    commands: [
      {
        id: label,
        name: label,
        tags: ["custom"],
        category: "custom",
        platform: "all",
        exec: {
          program: "echo",
          args: [label]
        },
        adminRequired: false
      }
    ]
  });

  return {
    path,
    content,
    modifiedMs: 1,
    size: content.length
  };
}

describe("createUserCommandSourceCache", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("limits concurrent file reads during refresh scans", async () => {
    vi.useFakeTimers();

    const files = Array.from({ length: 9 }, (_, index) => {
      const path = `C:/Users/test/.zapcmd/commands/${index}.json`;
      return {
        path,
        modifiedMs: 1,
        size: 16
      };
    });
    let inFlight = 0;
    let maxInFlight = 0;
    const readUserCommandFile = vi.fn(async (path: string) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 0));
      inFlight -= 1;
      return createCommandFile(path, path.split("/").at(-1) ?? "custom");
    });

    const cache = createUserCommandSourceCache({
      scanUserCommandFiles: async () => ({
        files,
        issues: []
      }),
      readUserCommandFile
    });

    const pending = cache.refreshFromScan();
    await vi.runAllTimersAsync();
    const snapshot = await pending;

    expect(maxInFlight).toBeLessThanOrEqual(4);
    expect(readUserCommandFile).toHaveBeenCalledTimes(files.length);
    expect(snapshot.payloadEntries).toHaveLength(files.length);
  });

  it("remaps from parsed cache without re-reading unchanged files", async () => {
    const path = "C:/Users/test/.zapcmd/commands/custom.json";
    const readUserCommandFile = vi.fn(async () => createCommandFile(path, "custom"));
    const cache = createUserCommandSourceCache({
      scanUserCommandFiles: async () => ({
        files: [
          {
            path,
            modifiedMs: 1,
            size: 16
          }
        ],
        issues: []
      }),
      readUserCommandFile
    });

    const firstSnapshot = await cache.refreshFromScan();
    const secondSnapshot = cache.remapFromCache();

    expect(readUserCommandFile).toHaveBeenCalledTimes(1);
    expect(firstSnapshot.payloadEntries).toEqual(secondSnapshot.payloadEntries);
    expect(secondSnapshot.issues).toEqual(firstSnapshot.issues);
  });
});
