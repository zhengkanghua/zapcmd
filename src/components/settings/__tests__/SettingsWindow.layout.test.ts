import { shallowMount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import { THEME_REGISTRY } from "../../../features/themes/themeRegistry";
import {
  createDefaultCommandViewState,
  createDefaultSettingsSnapshot,
  type HotkeyFieldId
} from "../../../stores/settingsStore";
import SettingsWindow from "../SettingsWindow.vue";
import type { SettingsWindowProps } from "../types";

const hoisted = vi.hoisted(() => ({
  windowMock: {
    close: vi.fn(),
    minimize: vi.fn(),
    toggleMaximize: vi.fn(),
    isMaximized: vi.fn(async () => false),
    onResized: vi.fn()
  }
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(() => hoisted.windowMock)
}));

function createSettingsWindowProps(
  overrides: Partial<SettingsWindowProps> = {}
): SettingsWindowProps {
  const defaults = createDefaultSettingsSnapshot();
  const terminalOption = {
    id: "powershell",
    label: "PowerShell",
    path: "powershell.exe"
  };
  const getHotkeyValue = (field: HotkeyFieldId) => defaults.hotkeys[field];

  return {
    settingsNavItems: [
      { id: "hotkeys", label: "快捷键", icon: "⌨" },
      { id: "general", label: "通用", icon: "⚙" },
      { id: "commands", label: "命令", icon: "☰" },
      { id: "appearance", label: "外观", icon: "◐" },
      { id: "about", label: "关于", icon: "ⓘ" }
    ],
    settingsRoute: "general",
    hotkeyGlobalFields: [{ id: "launcher", label: "打开启动器", scope: "global" }],
    hotkeySearchFields: [{ id: "navigateDown", label: "向下", scope: "local" }],
    hotkeyQueueFields: [{ id: "executeQueue", label: "执行队列", scope: "local" }],
    getHotkeyValue,
    hotkeyErrorFields: [],
    hotkeyErrorMessage: "",
    availableTerminals: [terminalOption],
    terminalLoading: false,
    defaultTerminal: terminalOption.id,
    selectedTerminalPath: terminalOption.path,
    language: defaults.general.language,
    languageOptions: [
      { value: "zh-CN", label: "简体中文" },
      { value: "en-US", label: "English" }
    ],
    autoCheckUpdate: defaults.general.autoCheckUpdate,
    launchAtLogin: defaults.general.launchAtLogin,
    alwaysElevatedTerminal: defaults.general.alwaysElevatedTerminal,
    commandRows: [],
    commandSummary: {
      total: 0,
      enabled: 0,
      disabled: 0,
      userDefined: 0,
      overridden: 0
    },
    commandLoadIssues: [],
    commandFilteredCount: 0,
    commandView: createDefaultCommandViewState(),
    commandSourceOptions: [],
    commandStatusOptions: [],
    commandCategoryOptions: [],
    commandOverrideOptions: [],
    commandIssueOptions: [],
    commandSortOptions: [],
    commandDisplayModeOptions: [],
    commandSourceFileOptions: [],
    commandGroups: [],
    windowOpacity: defaults.appearance.windowOpacity,
    theme: defaults.appearance.theme,
    blurEnabled: defaults.appearance.blurEnabled,
    themes: THEME_REGISTRY,
    appVersion: "1.0.0",
    runtimePlatform: "win32",
    updateStatus: { state: "idle" },
    ...overrides
  };
}

function mountSettingsWindow(props: SettingsWindowProps) {
  return shallowMount(SettingsWindow, {
    props,
    global: {
      stubs: {
        SSegmentNav: false
      }
    }
  });
}

describe("SettingsWindow stable shell", () => {
  it("does not feed legacy terminal dropdown props into the window shell factory", () => {
    const props = createSettingsWindowProps({ settingsRoute: "general" }) as unknown as Record<string, unknown>;

    expect("alwaysElevatedTerminal" in props).toBe(true);
    expect("terminalDropdownOpen" in props).toBe(false);
    expect("terminalFocusIndex" in props).toBe(false);
    expect("selectedTerminalOption" in props).toBe(false);
  });

  it("renders app topbar without custom window controls", () => {
    const wrapper = mountSettingsWindow(createSettingsWindowProps({ settingsRoute: "general" }));

    const topbar = wrapper.get(".settings-window-topbar");

    expect(topbar.find(".s-segment-nav").exists()).toBe(true);
    expect(wrapper.find(".settings-window-topbar__nav-shell").exists()).toBe(false);
    expect(topbar.attributes("data-tauri-drag-region")).toBeUndefined();
    expect(wrapper.find(".settings-drag-region__controls").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("ZapCmd Settings");
  });

  it("keeps topbar outside the single application-level content container", () => {
    const wrapper = mountSettingsWindow(createSettingsWindowProps({ settingsRoute: "general" }));

    expect(wrapper.find(".settings-window-topbar + .settings-content").exists()).toBe(true);
    expect(wrapper.findAll(".settings-content")).toHaveLength(1);
    expect(wrapper.find(".settings-content > .settings-content__inner").exists()).toBe(true);
  });

  it("uses commands-specific content width hook only on commands route", async () => {
    const wrapper = mountSettingsWindow(createSettingsWindowProps({ settingsRoute: "commands" }));

    expect(wrapper.get(".settings-content__inner").classes()).toContain("settings-content__inner--commands");
    await wrapper.setProps({ settingsRoute: "general" });
    expect(wrapper.get(".settings-content__inner").classes()).not.toContain("settings-content__inner--commands");
  });
});
