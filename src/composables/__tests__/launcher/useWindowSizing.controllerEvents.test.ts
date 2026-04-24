import { describe, expect, it, vi } from "vitest";

import { createCommandPanelExitCoordinator } from "../../launcher/useWindowSizing/commandPanelExit";
import { createWindowSizingEvents } from "../../launcher/useWindowSizing/controllerEvents";
import type { FlowPanelPreparedGate, WindowSizingState } from "../../launcher/useWindowSizing/controllerState";

function createState(overrides: Partial<WindowSizingState> = {}): WindowSizingState {
  return {
    lastWindowSize: null,
    syncingWindowSize: false,
    queuedWindowSync: false,
    pendingCommandActive: false,
    flowPanelActive: false,
    pendingCommandSettled: false,
    flowPanelSettled: false,
    flowPanelObservationActive: false,
    flowPanelObservationIdleTimer: null,
    flowPanelObservationMaxTimer: null,
    ...overrides
  };
}

describe("createWindowSizingEvents", () => {
  it("notifyFlowPanelSettled 会开启 observation 并触发一次 schedule", () => {
    const state = createState({
      flowPanelActive: true
    });
    const scheduleWindowSync = vi.fn();
    const events = createWindowSizingEvents({
      state,
      commandPanelExit: createCommandPanelExitCoordinator(),
      flowPanelPreparedGate: {
        prepared: false,
        promise: null,
        resolve: null
      },
      scheduleWindowSync
    });

    events.notifyFlowPanelSettled();

    expect(state.flowPanelSettled).toBe(true);
    expect(state.flowPanelObservationActive).toBe(true);
    expect(state.flowPanelObservationIdleTimer).not.toBeNull();
    expect(state.flowPanelObservationMaxTimer).not.toBeNull();
    expect(scheduleWindowSync).toHaveBeenCalledTimes(1);
  });

  it("notifyFlowPanelPrepared 会标记 prepared 并 resolve gate", () => {
    const resolve = vi.fn();
    const flowPanelPreparedGate: FlowPanelPreparedGate = {
      prepared: false,
      promise: Promise.resolve(),
      resolve
    };
    const events = createWindowSizingEvents({
      state: createState(),
      commandPanelExit: createCommandPanelExitCoordinator(),
      flowPanelPreparedGate,
      scheduleWindowSync: vi.fn()
    });

    events.notifyFlowPanelPrepared();

    expect(flowPanelPreparedGate.prepared).toBe(true);
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it("notifyFlowPanelHeightChange 只在观察窗口内刷新 timer 并补跑 sync", () => {
    const state = createState({
      flowPanelActive: true,
      flowPanelSettled: true,
      flowPanelObservationActive: true
    });
    const oldIdleTimer = setTimeout(() => {}, 1_000);
    state.flowPanelObservationIdleTimer = oldIdleTimer;
    const scheduleWindowSync = vi.fn();
    const events = createWindowSizingEvents({
      state,
      commandPanelExit: createCommandPanelExitCoordinator(),
      flowPanelPreparedGate: {
        prepared: false,
        promise: null,
        resolve: null
      },
      scheduleWindowSync
    });

    events.notifyFlowPanelHeightChange();

    expect(state.flowPanelObservationIdleTimer).not.toBe(oldIdleTimer);
    expect(scheduleWindowSync).toHaveBeenCalledTimes(1);
    clearTimeout(state.flowPanelObservationIdleTimer!);
    clearTimeout(state.flowPanelObservationMaxTimer!);
  });

  it("clearResizeTimer 只清 Flow observation timer，不改 public API 之外状态", () => {
    const state = createState({
      flowPanelObservationActive: true,
      flowPanelObservationIdleTimer: setTimeout(() => {}, 1_000),
      flowPanelObservationMaxTimer: setTimeout(() => {}, 1_000),
      pendingCommandSettled: true
    });
    const events = createWindowSizingEvents({
      state,
      commandPanelExit: createCommandPanelExitCoordinator(),
      flowPanelPreparedGate: {
        prepared: false,
        promise: null,
        resolve: null
      },
      scheduleWindowSync: vi.fn()
    });

    events.clearResizeTimer();

    expect(state.flowPanelObservationActive).toBe(false);
    expect(state.flowPanelObservationIdleTimer).toBeNull();
    expect(state.flowPanelObservationMaxTimer).toBeNull();
    expect(state.pendingCommandSettled).toBe(true);
  });
});
