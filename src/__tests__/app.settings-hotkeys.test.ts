import { createPinia } from "pinia";
import { mount, type DOMWrapper, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AppSettings from "../AppSettings.vue";
import { SETTINGS_STORAGE_KEY, useSettingsStore } from "../stores/settingsStore";

type HotkeyRecorderButton = Omit<DOMWrapper<Element>, "exists">;

const hoisted = vi.hoisted(() => ({
  closeSpy: vi.fn(),
  invokeSpy: vi.fn(),
  isTauriRuntime: false,
  windowMock: {
    label: "settings",
    close: vi.fn(),
    minimize: vi.fn(),
    toggleMaximize: vi.fn()
  }
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: hoisted.invokeSpy,
  isTauri: vi.fn(() => hoisted.isTauriRuntime)
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(() => ({
    ...hoisted.windowMock,
    close: hoisted.closeSpy
  }))
}));

const wrappers: VueWrapper[] = [];

async function waitForUi(): Promise<void> {
  await nextTick();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  if (typeof window.requestAnimationFrame === "function") {
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  }
  await nextTick();
}

async function mountAppSettings(): Promise<VueWrapper> {
  const wrapper = mount(AppSettings, {
    attachTo: document.body,
    global: {
      plugins: [createPinia()]
    }
  });
  wrappers.push(wrapper);
  await waitForUi();
  return wrapper;
}

function getSettingsStoreFromWrapper(wrapper: VueWrapper) {
  const vm = wrapper.vm as unknown as {
    $pinia: Parameters<typeof useSettingsStore>[0];
  };
  return useSettingsStore(vm.$pinia);
}

function findSegmentTab(wrapper: VueWrapper, label: string): DOMWrapper<Element> {
  const tab = wrapper.findAll(".s-segment-nav__tab").find((item) => item.text().includes(label));
  expect(tab).toBeTruthy();
  return tab!;
}

function findHotkeyRecorder(wrapper: VueWrapper, label: string): HotkeyRecorderButton {
  const field = wrapper
    .findAll(".s-hotkey-recorder-field")
    .find((item) => item.find(".s-hotkey-recorder-field__label").text() === label);
  expect(field).toBeTruthy();
  return field!.get("button.s-hotkey-recorder");
}

async function selectDropdownOption(
  wrapper: VueWrapper,
  label: string,
  optionLabel: string
): Promise<void> {
  const row = wrapper
    .findAll(".settings-hotkeys-row")
    .find((item) => item.find(".settings-card__label").text().includes(label));
  expect(row).toBeTruthy();

  await row!.get(".s-dropdown__trigger").trigger("click");
  await waitForUi();

  const option = Array.from(document.body.querySelectorAll<HTMLButtonElement>(".s-dropdown__option")).find(
    (item) => item.textContent?.includes(optionLabel)
  );
  expect(option).toBeTruthy();
  option!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await waitForUi();
}

async function recordHotkey(
  recorder: HotkeyRecorderButton,
  init: KeyboardEventInit
): Promise<void> {
  await recorder.trigger("click");
  await waitForUi();
  await recorder.trigger("keydown", init);
  await waitForUi();
  await recorder.trigger("blur");
  await waitForUi();
}

function readPersistedSettings(): unknown {
  const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
  expect(raw).toBeTruthy();
  return JSON.parse(raw!);
}

afterEach(() => {
  while (wrappers.length > 0) {
    wrappers.pop()?.unmount();
  }
});

beforeEach(() => {
  hoisted.closeSpy.mockReset();
  hoisted.invokeSpy.mockReset();
  hoisted.invokeSpy.mockImplementation((command: string) => {
    if (command === "get_available_terminals") {
      return [];
    }
    if (command === "get_autostart_enabled") {
      return false;
    }
    if (command === "get_launcher_hotkey") {
      return "";
    }
    if (command === "get_runtime_platform") {
      return "";
    }
    if (command === "scan_user_command_files") {
      return { files: [], issues: [] };
    }
    if (command === "read_user_command_file") {
      return {
        path: "",
        content: "",
        modified_ms: 0,
        size: 0
      };
    }
    return undefined;
  });
  hoisted.isTauriRuntime = false;
  window.location.hash = "";
  localStorage.clear();
});

describe("AppSettings hotkeys regression", () => {
  it("requests show_settings_window_when_ready after the settings shell mounts", async () => {
    hoisted.isTauriRuntime = true;

    const wrapper = await mountAppSettings();

    expect(wrapper.findComponent({ name: "SettingsWindow" }).exists()).toBe(true);
    expect(hoisted.invokeSpy).toHaveBeenCalledWith("get_available_terminals");
    expect(hoisted.invokeSpy).toHaveBeenCalledWith("show_settings_window_when_ready");
  });

  it("records and persists launcher hotkey on blur", async () => {
    const wrapper = await mountAppSettings();
    const settingsStore = getSettingsStoreFromWrapper(wrapper);

    const recorder = findHotkeyRecorder(wrapper, "唤起窗口");
    expect(recorder.text()).toContain("Alt");

    await recordHotkey(recorder, { key: "k", ctrlKey: true });

    expect(settingsStore.hotkeys.launcher).toBe("Ctrl+K");
    expect(recorder.text()).toContain("Ctrl");
    expect(hoisted.closeSpy).not.toHaveBeenCalled();

    const persisted = readPersistedSettings() as { hotkeys?: { launcher?: string } };
    expect(persisted.hotkeys?.launcher).toBe("Ctrl+K");
  });

  it("ignores modifier-only key while recording hotkey", async () => {
    const wrapper = await mountAppSettings();
    const settingsStore = getSettingsStoreFromWrapper(wrapper);

    const recorder = findHotkeyRecorder(wrapper, "唤起窗口");
    await recorder.trigger("click");
    await waitForUi();
    expect(recorder.text()).toContain("按下新的快捷键");

    await recorder.trigger("keydown", { key: "Control", ctrlKey: true });
    await waitForUi();
    expect(recorder.text()).toContain("按下新的快捷键");

    await recorder.trigger("keydown", { key: "j", ctrlKey: true });
    await waitForUi();
    expect(recorder.text()).toContain("Ctrl");

    await recorder.trigger("blur");
    await waitForUi();
    expect(settingsStore.hotkeys.launcher).toBe("Ctrl+J");
  });

  it("cancels hotkey recording with Escape without closing settings window", async () => {
    hoisted.isTauriRuntime = true;

    const wrapper = await mountAppSettings();
    const settingsStore = getSettingsStoreFromWrapper(wrapper);
    const original = settingsStore.hotkeys.launcher;

    const recorder = findHotkeyRecorder(wrapper, "唤起窗口");
    await recorder.trigger("click");
    await waitForUi();
    expect(recorder.text()).toContain("按下新的快捷键");

    await recorder.trigger("keydown", { key: "Escape" });
    await waitForUi();

    expect(settingsStore.hotkeys.launcher).toBe(original);
    expect(hoisted.closeSpy).not.toHaveBeenCalled();
  });

  it("does not close settings window when Escape comes from the commands search input", async () => {
    hoisted.isTauriRuntime = true;

    const wrapper = await mountAppSettings();
    const commandsNav = findSegmentTab(wrapper, "命令");
    await commandsNav.trigger("click");
    await waitForUi();

    const search = wrapper.get("input.settings-commands-toolbar__search");
    (search.element as HTMLInputElement).focus();
    await search.trigger("keydown", { key: "Escape" });
    await waitForUi();

    expect(hoisted.closeSpy).not.toHaveBeenCalled();
  });

  it("shows conflict state when duplicate hotkeys are entered", async () => {
    const wrapper = await mountAppSettings();

    const launcher = findHotkeyRecorder(wrapper, "唤起窗口");
    await recordHotkey(launcher, { key: "k", ctrlKey: true });

    const focus = findHotkeyRecorder(wrapper, "切换焦点区域");
    await recordHotkey(focus, { key: "k", ctrlKey: true });

    const conflicts = wrapper.findAll("button.s-hotkey-recorder.s-hotkey-recorder--conflict");
    expect(conflicts.length).toBeGreaterThanOrEqual(2);
    expect(wrapper.text()).toContain("冲突");

    const focusField = wrapper
      .findAll(".s-hotkey-recorder-field")
      .find((item) => item.find(".s-hotkey-recorder-field__label").text() === "切换焦点区域");
    expect(focusField).toBeTruthy();
    expect(focusField?.find(".s-hotkey-recorder-field__conflict").exists()).toBe(true);
    expect(focusField!.get(".s-hotkey-recorder-field__conflict-text").text().toLowerCase()).toContain("ctrl+k");
  });

  it("在搜索区快捷键分组暴露 openActionPanel 和 copySelected", async () => {
    const wrapper = await mountAppSettings();

    const searchGroup = wrapper
      .findAll(".settings-hotkeys-group")
      .find((item) => item.find(".settings-hotkeys-group__title").text().includes("搜索区快捷键"));

    expect(searchGroup).toBeTruthy();
    expect(searchGroup!.text()).toContain("打开动作面板");
    expect(searchGroup!.text()).toContain("复制当前命令");
  });

  it("supports segment navigation to appearance", async () => {
    const wrapper = await mountAppSettings();

    const appearanceNav = findSegmentTab(wrapper, "外观");
    await appearanceNav.trigger("click");
    await waitForUi();

    expect(wrapper.get("[role='tabpanel']").attributes("id")).toBe("settings-panel-appearance");
    expect(wrapper.find(".s-slider__input").exists()).toBe(true);
  });

  it("persists pointer action mapping from the hotkeys page", async () => {
    const wrapper = await mountAppSettings();

    await selectDropdownOption(wrapper, "搜索结果左键", "复制");

    const persisted = readPersistedSettings() as {
      general?: { pointerActions?: { leftClick?: string } };
    };
    expect(persisted.general?.pointerActions?.leftClick).toBe("copy");
  });

  it("keeps command search transient while persisting disabled command ids", async () => {
    const wrapper = await mountAppSettings();
    const settingsStore = getSettingsStoreFromWrapper(wrapper);

    const commandsNav = findSegmentTab(wrapper, "命令");
    await commandsNav.trigger("click");
    await waitForUi();

    const rawBeforeSearch = localStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(rawBeforeSearch).toBeTruthy();

    const search = wrapper.get("input.settings-commands-toolbar__search");
    await search.setValue("docker");
    await waitForUi();

    const rawAfterSearch = localStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(rawAfterSearch).toBe(rawBeforeSearch);
    expect(rawAfterSearch).not.toContain('"view"');

    const firstRow = wrapper.findAll(".settings-commands-table__row")[0];
    expect(firstRow).toBeTruthy();

    const commandId = firstRow!.get(".settings-commands-table__id").text().trim();
    expect(commandId.length).toBeGreaterThan(0);

    const toggle = firstRow!.get("button.s-toggle");
    const wasEnabled = toggle.attributes("aria-checked") === "true";
    await toggle.trigger("click");
    await waitForUi();

    expect(wrapper.find(".settings-commands-toolbar__more-filters").exists()).toBe(true);
    expect(wrapper.find(".settings-commands-toolbar__summary").exists()).toBe(true);

    if (wasEnabled) {
      expect(settingsStore.disabledCommandIds).toContain(commandId);
      const persisted = readPersistedSettings() as { commands?: { disabledCommandIds?: string[] } };
      expect(persisted.commands?.disabledCommandIds).toContain(commandId);
      expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).not.toContain('"view"');
    } else {
      expect(settingsStore.disabledCommandIds).not.toContain(commandId);
    }
  });
});
