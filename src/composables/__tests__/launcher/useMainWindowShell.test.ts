import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { isTypingElement, useMainWindowShell } from "../../launcher/useMainWindowShell";

function createHarness() {
  const isSettingsWindow = ref(false);
  const navStackCanGoBack = ref(false);
  const commandPanelOpen = ref(false);
  const navStackPopPage = vi.fn();
  const requestCommandPanelExit = vi.fn();
  const query = ref("");
  const stagingExpanded = ref(false);
  const closeStagingDrawer = vi.fn();
  const requestHideMainWindow = vi.fn(async () => {});
  const close = vi.fn();
  const hide = vi.fn(async () => {});
  const resolveAppWindow = vi.fn(() => ({ close, hide }));
  const isTauriRuntime = vi.fn(() => false);

  const shell = useMainWindowShell({
    isSettingsWindow,
    resolveAppWindow,
    isTauriRuntime,
    requestHideMainWindow,
    navStackCanGoBack,
    navStackPopPage,
    commandPanelOpen,
    requestCommandPanelExit,
    query,
    stagingExpanded,
    closeStagingDrawer
  });

  return {
    shell,
    state: {
      isSettingsWindow,
      navStackCanGoBack,
      commandPanelOpen,
      query,
      stagingExpanded
    },
    spies: {
      navStackPopPage,
      requestCommandPanelExit,
      closeStagingDrawer,
      requestHideMainWindow,
      close,
      hide,
      isTauriRuntime
    }
  };
}

describe("useMainWindowShell", () => {
  it("closes settings window only in settings mode", async () => {
    const harness = createHarness();
    harness.shell.closeSettingsWindow();
    expect(harness.spies.close).not.toHaveBeenCalled();

    harness.state.isSettingsWindow.value = true;
    harness.shell.closeSettingsWindow();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(harness.spies.close).toHaveBeenCalledTimes(1);
    expect(harness.spies.hide).not.toHaveBeenCalled();
  });

  it("导航栈可回退时 Escape 优先 popPage", () => {
    const harness = createHarness();
    harness.state.navStackCanGoBack.value = true;

    harness.shell.handleMainEscape();

    expect(harness.spies.navStackPopPage).toHaveBeenCalledTimes(1);
    expect(harness.spies.hide).not.toHaveBeenCalled();
  });

  it("参数面板打开时 Escape 优先走 requestCommandPanelExit", () => {
    const harness = createHarness();
    harness.state.commandPanelOpen.value = true;

    harness.shell.handleMainEscape();

    expect(harness.spies.requestCommandPanelExit).toHaveBeenCalledTimes(1);
    expect(harness.spies.navStackPopPage).not.toHaveBeenCalled();
    expect(harness.spies.closeStagingDrawer).not.toHaveBeenCalled();
  });

  it("clears query before toggling staging or hiding", () => {
    const harness = createHarness();
    harness.state.query.value = " docker ";

    harness.shell.handleMainEscape();

    expect(harness.state.query.value).toBe("");
    expect(harness.spies.closeStagingDrawer).not.toHaveBeenCalled();
    expect(harness.spies.hide).not.toHaveBeenCalled();
  });

  it("closes staging before clearing query on Escape", () => {
    const harness = createHarness();
    harness.state.query.value = " docker ";
    harness.state.stagingExpanded.value = true;

    harness.shell.handleMainEscape();

    expect(harness.spies.closeStagingDrawer).toHaveBeenCalledTimes(1);
    expect(harness.state.query.value).toBe(" docker ");
    expect(harness.spies.hide).not.toHaveBeenCalled();
  });

  it("uses tauri hide command first and falls back to webview hide", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const harness = createHarness();
    harness.spies.isTauriRuntime.mockReturnValue(true);

    await harness.shell.hideMainWindow();
    expect(harness.spies.requestHideMainWindow).toHaveBeenCalledTimes(1);
    expect(harness.spies.hide).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();

    harness.spies.requestHideMainWindow.mockRejectedValueOnce(new Error("hide failed"));
    await harness.shell.hideMainWindow();
    expect(harness.spies.hide).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "hide_main_window invoke failed; falling back to webview api",
      expect.any(Error)
    );
    warnSpy.mockRestore();
  });

  it("detects typing elements correctly", () => {
    const input = document.createElement("input");
    const textarea = document.createElement("textarea");
    const select = document.createElement("select");
    const div = document.createElement("div");
    const editable = document.createElement("div");
    Object.defineProperty(editable, "isContentEditable", {
      configurable: true,
      value: true
    });

    expect(isTypingElement(input)).toBe(true);
    expect(isTypingElement(textarea)).toBe(true);
    expect(isTypingElement(select)).toBe(true);
    expect(isTypingElement(editable)).toBe(true);
    expect(isTypingElement(div)).toBe(false);
    expect(isTypingElement(null)).toBe(false);
  });
});
