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

  it("stops scheduling remaining file reads when refresh is cancelled", async () => {
    const files = Array.from({ length: 6 }, (_, index) => ({
      path: `C:/Users/test/.zapcmd/commands/${index}.json`,
      modifiedMs: 1,
      size: 16
    }));
    let shouldContinue = true;
    const pendingResolvers: Array<() => void> = [];
    const readUserCommandFile = vi.fn((path: string) => {
      return new Promise<ReturnType<typeof createCommandFile>>((resolve) => {
        pendingResolvers.push(() => {
          resolve(createCommandFile(path, path.split("/").at(-1) ?? "custom"));
        });
      });
    });

    const cache = createUserCommandSourceCache({
      scanUserCommandFiles: async () => ({
        files,
        issues: []
      }),
      readUserCommandFile
    });

    const pending = (
      cache as unknown as {
        refreshFromScan: (options: { shouldContinue: () => boolean }) => Promise<unknown>;
      }
    ).refreshFromScan({
      shouldContinue: () => shouldContinue
    });

    await vi.waitFor(() => {
      expect(readUserCommandFile).toHaveBeenCalledTimes(4);
    });

    shouldContinue = false;
    for (const resolve of pendingResolvers.splice(0)) {
      resolve();
    }

    await pending;

    expect(readUserCommandFile).toHaveBeenCalledTimes(4);
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

  it("skips re-reading unchanged files on subsequent refresh scans", async () => {
    const path = "C:/Users/test/.zapcmd/commands/custom.json";
    const file = createCommandFile(path, "custom");
    const scanUserCommandFiles = vi.fn(async () => ({
      files: [
        {
          path,
          modifiedMs: file.modifiedMs,
          size: file.size
        }
      ],
      issues: []
    }));
    const readUserCommandFile = vi.fn(async () => file);
    const cache = createUserCommandSourceCache({
      scanUserCommandFiles,
      readUserCommandFile
    });

    const firstSnapshot = await cache.refreshFromScan();
    const secondSnapshot = await cache.refreshFromScan();

    expect(scanUserCommandFiles).toHaveBeenCalledTimes(2);
    expect(readUserCommandFile).toHaveBeenCalledTimes(1);
    expect(secondSnapshot.payloadEntries).toEqual(firstSnapshot.payloadEntries);
    expect(secondSnapshot.issues).toEqual(firstSnapshot.issues);
  });

  it("drops removed files from cached snapshot after a later scan", async () => {
    const keepPath = "C:/Users/test/.zapcmd/commands/keep.json";
    const removePath = "C:/Users/test/.zapcmd/commands/remove.json";
    const scanUserCommandFiles = vi
      .fn(async () => ({
        files: [
          { path: keepPath, modifiedMs: 1, size: 16 },
          { path: removePath, modifiedMs: 1, size: 16 }
        ],
        issues: []
      }))
      .mockImplementationOnce(async () => ({
        files: [
          { path: keepPath, modifiedMs: 1, size: 16 },
          { path: removePath, modifiedMs: 1, size: 16 }
        ],
        issues: []
      }))
      .mockImplementationOnce(async () => ({
        files: [{ path: keepPath, modifiedMs: 1, size: 16 }],
        issues: []
      }));
    const readUserCommandFile = vi.fn(async (path: string) =>
      createCommandFile(path, path.split("/").at(-1) ?? "custom")
    );
    const cache = createUserCommandSourceCache({
      scanUserCommandFiles,
      readUserCommandFile
    });

    await cache.refreshFromScan();
    const refreshedSnapshot = await cache.refreshFromScan();

    expect(
      refreshedSnapshot.payloadEntries.some((entry) => entry.sourceId === keepPath)
    ).toBe(true);
    expect(
      refreshedSnapshot.payloadEntries.some((entry) => entry.sourceId === removePath)
    ).toBe(false);
  });

  it("keeps the previously committed snapshot stable when a later refresh is cancelled mid-flight", async () => {
    const stablePath = "C:/Users/test/.zapcmd/commands/stable.json";
    const cancelledPath = "C:/Users/test/.zapcmd/commands/cancelled.json";
    let shouldContinue = true;
    let releaseCancelledRead!: () => void;
    const scanUserCommandFiles = vi
      .fn(async () => ({
        files: [{ path: stablePath, modifiedMs: 1, size: 16 }],
        issues: []
      }))
      .mockImplementationOnce(async () => ({
        files: [{ path: stablePath, modifiedMs: 1, size: 16 }],
        issues: []
      }))
      .mockImplementationOnce(async () => ({
        files: [{ path: cancelledPath, modifiedMs: 2, size: 16 }],
        issues: []
      }));
    const readUserCommandFile = vi.fn((path: string) => {
      if (path === stablePath) {
        return Promise.resolve(createCommandFile(path, "stable"));
      }
      return new Promise<ReturnType<typeof createCommandFile>>((resolve) => {
        releaseCancelledRead = () => {
          resolve(createCommandFile(path, "cancelled"));
        };
      });
    });
    const cache = createUserCommandSourceCache({
      scanUserCommandFiles,
      readUserCommandFile
    });

    const stableSnapshot = await cache.refreshFromScan();
    const pending = cache.refreshFromScan({
      shouldContinue: () => shouldContinue
    });
    await vi.waitFor(() => {
      expect(readUserCommandFile).toHaveBeenCalledWith(cancelledPath);
    });

    shouldContinue = false;
    releaseCancelledRead();
    await pending;

    expect(cache.remapFromCache()).toEqual(stableSnapshot);
  });

  it("keeps scan issues for files rejected by backend limits", async () => {
    const path = "C:/Users/test/.zapcmd/commands/huge.json";
    const cache = createUserCommandSourceCache({
      scanUserCommandFiles: async () => ({
        files: [],
        issues: [{ path, reason: "Command file exceeds maximum size of 1048576 bytes." }]
      }),
      readUserCommandFile: vi.fn()
    });

    const snapshot = await cache.refreshFromScan();

    expect(snapshot.payloadEntries).toEqual([]);
    expect(snapshot.issues).toEqual([
      expect.objectContaining({
        sourceId: path,
        code: "scan-failed"
      })
    ]);
  });

  it("falls back to default parse error reason for unknown/blank thrown values", async () => {
    const blankPath = "C:/Users/test/.zapcmd/commands/blank.json";
    const unknownPath = "C:/Users/test/.zapcmd/commands/unknown.json";
    const parseSpy = vi.spyOn(JSON, "parse");
    parseSpy
      .mockImplementationOnce(() => {
        throw "   ";
      })
      .mockImplementationOnce(() => {
        throw Object.create(null) as object;
      });
    const cache = createUserCommandSourceCache({
      scanUserCommandFiles: async () => ({
        files: [
          { path: blankPath, modifiedMs: 1, size: 8 },
          { path: unknownPath, modifiedMs: 1, size: 8 }
        ],
        issues: []
      }),
      readUserCommandFile: vi.fn(async (path: string) => ({
        path,
        content: "{\"commands\":[]}",
        modifiedMs: 1,
        size: 15
      }))
    });

    try {
      const snapshot = await cache.refreshFromScan();

      expect(snapshot.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            sourceId: blankPath,
            code: "invalid-json",
            reason: "JSON parse failed."
          }),
          expect.objectContaining({
            sourceId: unknownPath,
            code: "invalid-json",
            reason: "JSON parse failed."
          })
        ])
      );
    } finally {
      parseSpy.mockRestore();
    }
  });
});
