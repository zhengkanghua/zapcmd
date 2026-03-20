import { describe, expect, it } from "vitest";

import {
  beginCommandPanelSession,
  beginFlowPanelSession,
  clearFlowPanelSession,
  createPanelHeightSession,
  lockCommandPanelHeight,
  lockFlowPanelHeight
} from "../../launcher/useWindowSizing/panelHeightSession";

describe("panelHeightSession", () => {
  it("Flow 打开后不会覆盖 commandPanelLockedHeight", () => {
    const session = createPanelHeightSession();
    beginCommandPanelSession(session, 420);
    lockCommandPanelHeight(session, 560);

    beginFlowPanelSession(session, 560);

    expect(session.commandPanelLockedHeight.value).toBe(560);
    expect(session.flowPanelLockedHeight.value).toBeNull();
  });

  it("首次 lock 后再次 lock 不会覆写已锁高度", () => {
    const session = createPanelHeightSession();
    beginCommandPanelSession(session, 420);
    lockCommandPanelHeight(session, 560);

    lockCommandPanelHeight(session, 600);

    expect(session.commandPanelLockedHeight.value).toBe(560);
  });

  it("Flow 关闭时只清 Flow 状态，不污染 Command 锁高", () => {
    const session = createPanelHeightSession();
    beginCommandPanelSession(session, 420);
    lockCommandPanelHeight(session, 560);
    beginFlowPanelSession(session, 560);
    lockFlowPanelHeight(session, 620);

    clearFlowPanelSession(session);

    expect(session.flowPanelInheritedHeight.value).toBeNull();
    expect(session.flowPanelLockedHeight.value).toBeNull();
    expect(session.commandPanelLockedHeight.value).toBe(560);
  });

  it("Flow 首次 lock 后再次 lock 不会覆写已锁高度", () => {
    const session = createPanelHeightSession();
    beginCommandPanelSession(session, 420);
    beginFlowPanelSession(session, 560);

    lockFlowPanelHeight(session, 620);
    lockFlowPanelHeight(session, 680);

    expect(session.flowPanelLockedHeight.value).toBe(620);
  });
});
