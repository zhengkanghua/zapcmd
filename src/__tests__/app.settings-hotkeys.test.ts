import { createPinia } from "pinia";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "../App.vue";

const hoisted = vi.hoisted(() => ({
  closeSpy: vi.fn(),
  windowMock: {
    label: "settings",
    close: vi.fn(),
    hide: vi.fn()
  }
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  isTauri: vi.fn(() => false)
}));

vi.mock("@tauri-apps/api/window", () => ({
  LogicalSize: class LogicalSize {
    width: number;
    height: number;
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }
  },
  getCurrentWindow: vi.fn(() => ({
    ...hoisted.windowMock,
    close: hoisted.closeSpy
  }))
}));

const wrappers: VueWrapper[] = [];

async function waitForUi(): Promise<void> {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

function dispatchWindowKeydown(key: string, init: KeyboardEventInit = {}): void {
  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      ...init
    })
  );
}

async function pickSettingsSelectOption(wrapper: VueWrapper, selectId: string, optionLabel: string): Promise<void> {
  const trigger = wrapper.get(`#${selectId}`);
  await trigger.trigger("click");
  await waitForUi();
  const option = wrapper
    .findAll(".settings-select-list__item")
    .find((item) => item.text().includes(optionLabel));
  expect(option).toBeTruthy();
  await option!.trigger("click");
  await waitForUi();
}

async function mountAppSettings(): Promise<VueWrapper> {
  const wrapper = mount(App, {
    attachTo: document.body,
    global: {
      plugins: [createPinia()]
    }
  });
  wrappers.push(wrapper);
  await waitForUi();
  return wrapper;
}

afterEach(() => {
  while (wrappers.length > 0) {
    wrappers.pop()?.unmount();
  }
});

beforeEach(() => {
  hoisted.closeSpy.mockReset();
  window.location.hash = "";
  localStorage.clear();
});

describe("App settings hotkeys regression", () => {
  it("records hotkey in settings window", async () => {
    const wrapper = await mountAppSettings();
    expect(wrapper.find(".settings-window-root").exists()).toBe(true);

    const recorder = wrapper.findAll("button.hotkey-recorder")[0];
    expect(recorder.text()).toBe("Alt+V");

    await recorder.trigger("click");
    await waitForUi();
    expect(recorder.text()).toBe("请按快捷键...");

    dispatchWindowKeydown("k", { ctrlKey: true });
    await waitForUi();
    expect(recorder.text()).toBe("Ctrl+K");
  });

  it("ignores modifier-only key while recording hotkey", async () => {
    const wrapper = await mountAppSettings();
    const recorder = wrapper.findAll("button.hotkey-recorder")[0];

    await recorder.trigger("click");
    await waitForUi();
    expect(recorder.text()).toBe("请按快捷键...");

    dispatchWindowKeydown("Control", { ctrlKey: true });
    await waitForUi();
    expect(recorder.text()).toBe("请按快捷键...");

    dispatchWindowKeydown("j", { ctrlKey: true });
    await waitForUi();
    expect(recorder.text()).toBe("Ctrl+J");
  });

  it("cancels hotkey recording with Escape without closing settings window", async () => {
    const wrapper = await mountAppSettings();

    const recorder = wrapper.findAll("button.hotkey-recorder")[0];
    await recorder.trigger("click");
    await waitForUi();
    expect(recorder.text()).toBe("请按快捷键...");

    dispatchWindowKeydown("Escape");
    await waitForUi();
    expect(recorder.text()).toBe("Alt+V");
    expect(hoisted.closeSpy).not.toHaveBeenCalled();
  });

  it("cancels hotkey recording when clicking outside recorder", async () => {
    const wrapper = await mountAppSettings();
    const recorder = wrapper.findAll("button.hotkey-recorder")[0];

    await recorder.trigger("click");
    await waitForUi();
    expect(recorder.text()).toBe("请按快捷键...");

    document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    await waitForUi();

    expect(recorder.text()).toBe("Alt+V");
    expect(hoisted.closeSpy).not.toHaveBeenCalled();
  });

  it("closes terminal dropdown first, then closes settings window on Escape", async () => {
    const wrapper = await mountAppSettings();

    const generalNav = wrapper.findAll("button.settings-nav__item").find((item) => item.text() === "通用");
    expect(generalNav).toBeTruthy();
    await generalNav!.trigger("click");
    await waitForUi();

    const selectButton = wrapper.get("#default-terminal-select");
    await selectButton.trigger("click");
    await waitForUi();
    expect(wrapper.find(".settings-select-list").exists()).toBe(true);

    dispatchWindowKeydown("Escape");
    await waitForUi();
    expect(wrapper.find(".settings-select-list").exists()).toBe(false);
    expect(hoisted.closeSpy).not.toHaveBeenCalled();

    dispatchWindowKeydown("Escape");
    await waitForUi();
    expect(hoisted.closeSpy).toHaveBeenCalledTimes(1);
  });

  it("supports terminal dropdown keyboard navigation and Enter selection", async () => {
    const wrapper = await mountAppSettings();

    const generalNav = wrapper.findAll("button.settings-nav__item").find((item) => item.text() === "通用");
    expect(generalNav).toBeTruthy();
    await generalNav!.trigger("click");
    await waitForUi();

    const selectButton = wrapper.get("#default-terminal-select");
    await selectButton.trigger("click");
    await waitForUi();
    expect(wrapper.find(".settings-select-list").exists()).toBe(true);

    let options = wrapper.findAll(".settings-select-list__item");
    expect(options[0].classes()).toContain("settings-select-list__item--focused");
    const nextLabel = options[1].find(".settings-select-list__label").text();

    dispatchWindowKeydown("ArrowDown");
    await waitForUi();
    options = wrapper.findAll(".settings-select-list__item");
    expect(options[1].classes()).toContain("settings-select-list__item--focused");

    dispatchWindowKeydown("Enter");
    await waitForUi();
    expect(wrapper.find(".settings-select-list").exists()).toBe(false);
    expect(selectButton.text()).toContain(nextLabel);
  });

  it("supports Home/End keys in terminal dropdown", async () => {
    const wrapper = await mountAppSettings();

    const generalNav = wrapper.findAll("button.settings-nav__item").find((item) => item.text() === "通用");
    expect(generalNav).toBeTruthy();
    await generalNav!.trigger("click");
    await waitForUi();

    const selectButton = wrapper.get("#default-terminal-select");
    await selectButton.trigger("click");
    await waitForUi();

    dispatchWindowKeydown("End");
    await waitForUi();
    let options = wrapper.findAll(".settings-select-list__item");
    expect(options[options.length - 1].classes()).toContain("settings-select-list__item--focused");

    dispatchWindowKeydown("Home");
    await waitForUi();
    options = wrapper.findAll(".settings-select-list__item");
    expect(options[0].classes()).toContain("settings-select-list__item--focused");
  });

  it("switches to appearance route and shows opacity slider", async () => {
    const wrapper = await mountAppSettings();
    const appearanceNav = wrapper.findAll("button.settings-nav__item").find((item) => item.text() === "外观");
    expect(appearanceNav).toBeTruthy();

    await appearanceNav!.trigger("click");
    await waitForUi();

    const slider = wrapper.find(".appearance-slider");
    expect(slider.exists()).toBe(true);
  });

  it("supports about route and update check feedback", async () => {
    const wrapper = await mountAppSettings();
    const aboutNav = wrapper.findAll("button.settings-nav__item").find((item) => item.text() === "关于");
    expect(aboutNav).toBeTruthy();

    await aboutNav!.trigger("click");
    await waitForUi();

    expect(wrapper.get(".about-app-name").text()).toBe("ZapCmd");

    const checkButton = wrapper.findAll("button").find((item) => item.text() === "检查更新");
    expect(checkButton).toBeTruthy();
    await checkButton!.trigger("click");
    await waitForUi();
    await waitForUi();

    expect(wrapper.text()).toContain("当前已是最新版本");
  });

  it("supports command management route and persists disabled command ids", async () => {
    const wrapper = await mountAppSettings();
    const commandNav = wrapper.findAll("button.settings-nav__item").find((item) => item.text() === "命令");
    expect(commandNav).toBeTruthy();

    await commandNav!.trigger("click");
    await waitForUi();

    const commandList = wrapper.find("[aria-label='command-management-list']");
    expect(commandList.exists()).toBe(true);
    await wrapper.get("#command-query-input").setValue("docker");
    await pickSettingsSelectOption(wrapper, "command-sort-select", "按标题");
    await wrapper.get("#command-display-mode-grouped").trigger("click");
    await waitForUi();

    const groupedList = wrapper.find("[aria-label='command-management-groups']");
    expect(groupedList.exists()).toBe(true);

    const firstToggle = wrapper.get(".settings-command-list__toggle input[type='checkbox']");
    const toggleId = firstToggle.attributes("id") ?? "";
    expect(toggleId.startsWith("command-toggle-")).toBe(true);
    const commandId = toggleId.replace("command-toggle-", "");

    await firstToggle.setValue(false);
    await waitForUi();
    const applyButton = wrapper.findAll("button.btn-muted").find((item) => item.text() === "应用");
    expect(applyButton).toBeTruthy();
    await applyButton!.trigger("click");
    await waitForUi();

    const raw = localStorage.getItem("zapcmd.settings");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string) as {
      commands?: {
        disabledCommandIds?: string[];
        view?: { query?: string; sortBy?: string; displayMode?: string };
      };
    };
    expect(parsed.commands?.disabledCommandIds).toContain(commandId);
    expect(parsed.commands?.view?.query).toBe("docker");
    expect(parsed.commands?.view?.sortBy).toBe("title");
    expect(parsed.commands?.view?.displayMode).toBe("groupedByFile");
  });

  it("shows conflict error when saving duplicated hotkeys", async () => {
    const wrapper = await mountAppSettings();

    const fields = wrapper.findAll(".settings-field");
    const launcherField = fields.find((item) => item.find("label").text() === "唤起窗口");
    const focusField = fields.find((item) => item.find("label").text() === "切换焦点区域");
    expect(launcherField).toBeTruthy();
    expect(focusField).toBeTruthy();

    await launcherField!.get(".hotkey-recorder").trigger("click");
    await waitForUi();
    dispatchWindowKeydown("k", { ctrlKey: true });
    await waitForUi();

    await focusField!.get(".hotkey-recorder").trigger("click");
    await waitForUi();
    dispatchWindowKeydown("k", { ctrlKey: true });
    await waitForUi();

    const applyButton = wrapper.findAll("button.btn-muted").find((item) => item.text() === "应用");
    expect(applyButton).toBeTruthy();
    await applyButton!.trigger("click");
    await waitForUi();

    const error = wrapper.get(".settings-error").text();
    expect(error).toContain("快捷键冲突");
  });

  it("shows save success for valid settings", async () => {
    const wrapper = await mountAppSettings();
    const applyButton = wrapper.findAll("button.btn-muted").find((item) => item.text() === "应用");
    expect(applyButton).toBeTruthy();
    await applyButton!.trigger("click");
    await waitForUi();

    expect(wrapper.get(".settings-ok").text()).toBe("已保存");
  });

  it("closes settings window on confirm when save succeeds", async () => {
    const wrapper = await mountAppSettings();
    await wrapper.get("button.btn-primary").trigger("click");
    await waitForUi();

    expect(hoisted.closeSpy).toHaveBeenCalledTimes(1);
  });
});
