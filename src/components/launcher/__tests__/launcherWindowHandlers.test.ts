import { describe, expect, it, vi } from "vitest";

import type { CommandTemplate } from "../../../features/commands/commandTemplates";
import { createLauncherWindowHandlers } from "../launcherWindowHandlers";

function createCommand(id = "docker-ps"): CommandTemplate {
  return {
    id,
    title: "Docker PS",
    description: "list containers",
    preview: "docker ps",
    execution: {
      kind: "exec",
      program: "docker",
      args: ["ps"]
    },
    folder: "@_docker",
    category: "docker",
    needsArgs: false
  };
}

function createVm() {
  return {
    search: {},
    command: {},
    nav: {
      currentPage: { type: "search" as "search" | "command-action", props: undefined as unknown },
      canGoBack: false,
      popPage: vi.fn()
    },
    queue: {
      queueOpen: false
    },
    dom: {},
    actions: {
      submitParamInput: vi.fn(() => true),
      requestCommandPanelExit: vi.fn(),
      onQueryInput: vi.fn(),
      enqueueResult: vi.fn(),
      executeResult: vi.fn(),
      openActionPanel: vi.fn(),
      dispatchCommandIntent: vi.fn(),
      toggleQueue: vi.fn(),
      onQueueDragStart: vi.fn(),
      onQueueDragOver: vi.fn(),
      onQueueDragEnd: vi.fn(),
      setQueueGripReorderActive: vi.fn(),
      onFocusQueueIndex: vi.fn(),
      removeQueuedCommand: vi.fn(),
      updateQueuedArg: vi.fn(),
      clearQueue: vi.fn(),
      executeQueue: vi.fn(),
      refreshAllQueuedPreflight: vi.fn(),
      refreshQueuedCommandPreflight: vi.fn(),
      selectActionPanelIntent: vi.fn(),
      updatePendingArgValue: vi.fn(),
      notifyFlowPanelPrepared: vi.fn(),
      notifyFlowPanelHeightChange: vi.fn(),
      notifyFlowPanelSettled: vi.fn(),
      confirmSafetyExecution: vi.fn(),
      cancelSafetyExecution: vi.fn()
    }
  };
}

describe("createLauncherWindowHandlers", () => {
  it("closes command page first when search capsule back is pressed on action page", () => {
    const launcherVm = createVm() as unknown as Parameters<typeof createLauncherWindowHandlers>[0]["launcherVm"];
    launcherVm.nav.currentPage = {
      type: "command-action",
      props: { command: createCommand(), panel: "actions" }
    } as never;
    const handlers = createLauncherWindowHandlers({
      launcherVm,
      dismissDanger: vi.fn()
    });

    handlers.onSearchCapsuleBack();

    expect(launcherVm.actions.requestCommandPanelExit).toHaveBeenCalledTimes(1);
    expect(launcherVm.nav.popPage).not.toHaveBeenCalled();
  });

  it("dismisses stored danger confirmation before submitting param input", () => {
    const launcherVm = createVm() as unknown as Parameters<typeof createLauncherWindowHandlers>[0]["launcherVm"];
    const command = createCommand("dangerous-command");
    launcherVm.nav.currentPage = {
      type: "command-action",
      props: { command, panel: "params" }
    } as never;
    const dismissDanger = vi.fn();
    const handlers = createLauncherWindowHandlers({
      launcherVm,
      dismissDanger
    });

    handlers.onCommandPanelSubmit({}, true);

    expect(dismissDanger).toHaveBeenCalledWith("dangerous-command");
    expect(launcherVm.actions.submitParamInput).toHaveBeenCalledTimes(1);
    expect(launcherVm.actions.requestCommandPanelExit).toHaveBeenCalledTimes(1);
  });

  it("routes copy action through shared command intent dispatcher", () => {
    const launcherVm = createVm() as unknown as Parameters<typeof createLauncherWindowHandlers>[0]["launcherVm"];
    const command = createCommand("copy-me");
    const handlers = createLauncherWindowHandlers({
      launcherVm,
      dismissDanger: vi.fn()
    });

    handlers.onCopyResult(command);

    expect(launcherVm.actions.dispatchCommandIntent).toHaveBeenCalledWith(command, "copy");
  });
});
