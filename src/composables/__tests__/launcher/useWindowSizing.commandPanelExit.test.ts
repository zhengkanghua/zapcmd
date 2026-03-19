import { describe, expect, it } from "vitest";

import { createCommandPanelExitCoordinator } from "../../launcher/useWindowSizing/commandPanelExit";

describe("createCommandPanelExitCoordinator", () => {
  it("beginExit 会记录锁高并进入 command-exiting", () => {
    const exit = createCommandPanelExitCoordinator();

    exit.beginExit(520);

    expect(exit.snapshot()).toMatchObject({
      phase: "command-exiting",
      lockedExitFrameHeight: 520,
      restoreTargetFrameHeight: null
    });
  });

  it("markSearchSettled 后只允许记录一次 restore target", () => {
    const exit = createCommandPanelExitCoordinator();

    exit.beginExit(520);
    exit.markSearchSettled();
    exit.captureRestoreTarget(404);
    exit.captureRestoreTarget(390);

    expect(exit.snapshot().restoreTargetFrameHeight).toBe(404);
  });
});
