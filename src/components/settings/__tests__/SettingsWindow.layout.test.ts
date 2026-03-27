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
    terminalReusePolicy: "never",
    selectedTerminalPath: terminalOption.path,
    language: defaults.general.language,
    languageOptions: [
      { value: "zh-CN", label: "简体中文" },
      { value: "en-US", label: "English" }
    ],
    autoCheckUpdate: defaults.general.autoCheckUpdate,
    launchAtLogin: defaults.general.launchAtLogin,
    alwaysElevatedTerminal: defaults.general.alwaysElevatedTerminal,
    showAlwaysElevatedTerminal: true,
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

  it("does not declare legacy close-confirm or error-navigation contract", () => {
    const props = createSettingsWindowProps({ settingsRoute: "general" }) as unknown as Record<string, unknown>;
    const wrapper = mountSettingsWindow(createSettingsWindowProps({ settingsRoute: "general" }));
    const emitsOptions =
      ((wrapper.vm.$ as unknown as { emitsOptions?: Record<string, unknown> }).emitsOptions) ?? {};

    expect("settingsErrorRoute" in props).toBe(false);
    expect("closeConfirmOpen" in props).toBe(false);
    expect(emitsOptions.confirm).toBeUndefined();
    expect(emitsOptions["navigate-to-error"]).toBeUndefined();
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

  it("uses subtle scrollbar on the single settings scroll host", () => {
    const wrapper = mountSettingsWindow(createSettingsWindowProps({ settingsRoute: "general" }));
    const content = wrapper.get(".settings-content");

    expect(content.classes()).toContain("scrollbar-subtle");
    expect(content.classes()).not.toContain("scrollbar-none");
  });

  it("uses commands-specific content width hook only on commands route", async () => {
    const wrapper = mountSettingsWindow(createSettingsWindowProps({ settingsRoute: "commands" }));

    expect(wrapper.get(".settings-content__inner").classes()).toContain("settings-content__inner--commands");
    await wrapper.setProps({ settingsRoute: "general" });
    expect(wrapper.get(".settings-content__inner").classes()).not.toContain("settings-content__inner--commands");
  });

  it("forwards navigation and section events through the window shell", async () => {
    const wrapper = shallowMount(SettingsWindow, {
      props: createSettingsWindowProps({ settingsRoute: "hotkeys" }),
      global: {
        stubs: {
          SSegmentNav: {
            template: "<button class='nav-stub' @click=\"$emit('update:modelValue', 'about')\">nav</button>"
          },
          SettingsHotkeysSection: {
            template:
              "<button class='hotkey-stub' @click=\"$emit('update-hotkey', 'launcher', 'Ctrl+Space')\">hotkey</button>"
          },
          SettingsGeneralSection: {
            template:
              "<div>" +
              "<button class='terminal-stub' @click=\"$emit('select-terminal', 'wt')\">terminal</button>" +
              "<button class='language-stub' @click=\"$emit('select-language', 'en-US')\">language</button>" +
              "<button class='auto-update-stub' @click=\"$emit('set-auto-check-update', false)\">auto</button>" +
              "<button class='login-stub' @click=\"$emit('set-launch-at-login', true)\">login</button>" +
              "<button class='elevated-stub' @click=\"$emit('set-always-elevated-terminal', true)\">elevated</button>" +
              "<button class='reuse-stub' @click=\"$emit('set-terminal-reuse-policy', 'normal-only')\">reuse</button>" +
              "</div>"
          },
          SettingsCommandsSection: {
            template:
              "<div>" +
              "<button class='toggle-command-stub' @click=\"$emit('toggle-command-enabled', 'docker.logs', false)\">toggle</button>" +
              "<button class='filtered-enabled-stub' @click=\"$emit('set-filtered-enabled', true)\">filtered</button>" +
              "<button class='update-view-stub' @click=\"$emit('update-view', { query: 'docker' })\">view</button>" +
              "<button class='reset-filters-stub' @click=\"$emit('reset-filters')\">reset</button>" +
              "</div>"
          },
          SettingsAboutSection: {
            template:
              "<div>" +
              "<button class='check-update-stub' @click=\"$emit('check-update')\">check</button>" +
              "<button class='download-update-stub' @click=\"$emit('download-update')\">download</button>" +
              "<button class='open-homepage-stub' @click=\"$emit('open-homepage')\">home</button>" +
              "</div>"
          },
          SettingsAppearanceSection: {
            template:
              "<div>" +
              "<button class='opacity-stub' @click=\"$emit('update-opacity', 0.9)\">opacity</button>" +
              "<button class='theme-stub' @click=\"$emit('update-theme', 'aurora')\">theme</button>" +
              "<button class='blur-stub' @click=\"$emit('update-blur-enabled', false)\">blur</button>" +
              "</div>"
          }
        }
      }
    });

    await wrapper.get(".nav-stub").trigger("click");
    expect(wrapper.emitted("navigate")?.[0]).toEqual(["about"]);

    await wrapper.get(".hotkey-stub").trigger("click");
    expect(wrapper.emitted("update-hotkey")?.[0]).toEqual(["launcher", "Ctrl+Space"]);

    await wrapper.setProps({ settingsRoute: "general" });
    await wrapper.get(".terminal-stub").trigger("click");
    await wrapper.get(".language-stub").trigger("click");
    await wrapper.get(".auto-update-stub").trigger("click");
    await wrapper.get(".login-stub").trigger("click");
    await wrapper.get(".elevated-stub").trigger("click");
    await wrapper.get(".reuse-stub").trigger("click");
    expect(wrapper.emitted("select-terminal")?.[0]).toEqual(["wt"]);
    expect(wrapper.emitted("select-language")?.[0]).toEqual(["en-US"]);
    expect(wrapper.emitted("set-auto-check-update")?.[0]).toEqual([false]);
    expect(wrapper.emitted("set-launch-at-login")?.[0]).toEqual([true]);
    expect(wrapper.emitted("set-always-elevated-terminal")?.[0]).toEqual([true]);
    expect(wrapper.emitted("set-terminal-reuse-policy")?.[0]).toEqual(["normal-only"]);

    await wrapper.setProps({ settingsRoute: "commands" });
    await wrapper.get(".toggle-command-stub").trigger("click");
    await wrapper.get(".filtered-enabled-stub").trigger("click");
    await wrapper.get(".update-view-stub").trigger("click");
    await wrapper.get(".reset-filters-stub").trigger("click");
    expect(wrapper.emitted("toggle-command-enabled")?.[0]).toEqual(["docker.logs", false]);
    expect(wrapper.emitted("set-filtered-commands-enabled")?.[0]).toEqual([true]);
    expect(wrapper.emitted("update-command-view")?.[0]).toEqual([{ query: "docker" }]);
    expect(wrapper.emitted("reset-command-filters")).toHaveLength(1);

    await wrapper.setProps({ settingsRoute: "about" });
    await wrapper.get(".check-update-stub").trigger("click");
    await wrapper.get(".download-update-stub").trigger("click");
    await wrapper.get(".open-homepage-stub").trigger("click");
    expect(wrapper.emitted("check-update")).toHaveLength(1);
    expect(wrapper.emitted("download-update")).toHaveLength(1);
    expect(wrapper.emitted("open-homepage")).toHaveLength(1);

    await wrapper.setProps({ settingsRoute: "appearance" });
    await wrapper.get(".opacity-stub").trigger("click");
    await wrapper.get(".theme-stub").trigger("click");
    await wrapper.get(".blur-stub").trigger("click");
    expect(wrapper.emitted("update-opacity")?.[0]).toEqual([0.9]);
    expect(wrapper.emitted("update-theme")?.[0]).toEqual(["aurora"]);
    expect(wrapper.emitted("update-blur-enabled")?.[0]).toEqual([false]);
  });
});
