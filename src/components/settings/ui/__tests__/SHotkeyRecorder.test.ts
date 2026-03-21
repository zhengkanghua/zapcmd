import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SHotkeyRecorder from "../SHotkeyRecorder.vue";

describe("SHotkeyRecorder", () => {
  it("displays current hotkey in kbd style", () => {
    const wrapper = mount(SHotkeyRecorder, {
      props: { modelValue: "Alt+V", label: "唤起窗口" },
    });
    expect(wrapper.text()).toContain("Alt");
    expect(wrapper.text()).toContain("V");
  });

  it("shows placeholder when no hotkey is set", () => {
    const wrapper = mount(SHotkeyRecorder, {
      props: { modelValue: "", label: "显示/隐藏执行流" },
    });
    expect(wrapper.find(".s-hotkey-recorder--empty").exists()).toBe(true);
  });

  it("enters recording mode on click", async () => {
    const wrapper = mount(SHotkeyRecorder, {
      props: { modelValue: "Alt+V", label: "唤起窗口" },
    });
    await wrapper.find(".s-hotkey-recorder").trigger("click");
    expect(wrapper.find(".s-hotkey-recorder--recording").exists()).toBe(true);
  });

  it("captures key combination during recording", async () => {
    const wrapper = mount(SHotkeyRecorder, {
      props: { modelValue: "", label: "test" },
      attachTo: document.body,
    });
    await wrapper.find(".s-hotkey-recorder").trigger("click");
    await wrapper.find(".s-hotkey-recorder").trigger("keydown", {
      key: "v", ctrlKey: true, altKey: false, shiftKey: false, metaKey: false,
      preventDefault: vi.fn(),
    });
    // 组件应捕获并显示 Ctrl+V
    expect(wrapper.text()).toContain("Ctrl");
    wrapper.unmount();
  });

  it("cancels recording on Escape", async () => {
    const wrapper = mount(SHotkeyRecorder, {
      props: { modelValue: "Alt+V", label: "test" },
      attachTo: document.body,
    });
    await wrapper.find(".s-hotkey-recorder").trigger("click");
    expect(wrapper.find(".s-hotkey-recorder--recording").exists()).toBe(true);
    await wrapper.find(".s-hotkey-recorder").trigger("keydown", { key: "Escape" });
    expect(wrapper.find(".s-hotkey-recorder--recording").exists()).toBe(false);
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    wrapper.unmount();
  });

  it("emits update:modelValue on blur after recording", async () => {
    const wrapper = mount(SHotkeyRecorder, {
      props: { modelValue: "", label: "test" },
      attachTo: document.body,
    });
    await wrapper.find(".s-hotkey-recorder").trigger("click");
    await wrapper.find(".s-hotkey-recorder").trigger("keydown", {
      key: "v", ctrlKey: true, altKey: false, shiftKey: false, metaKey: false,
      preventDefault: vi.fn(),
    });
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    await wrapper.find(".s-hotkey-recorder").trigger("blur");
    expect(wrapper.emitted("update:modelValue")?.[0][0]).toBe("Ctrl+V");
    expect(wrapper.find(".s-hotkey-recorder--recording").exists()).toBe(false);
    wrapper.unmount();
  });

  it("shows conflict state", () => {
    const wrapper = mount(SHotkeyRecorder, {
      props: { modelValue: "Ctrl+Enter", label: "test", conflict: "与「加入执行流」冲突" },
    });
    expect(wrapper.find(".s-hotkey-recorder--conflict").exists()).toBe(true);
    expect(wrapper.text()).toContain("冲突");
  });

  it("renders a single compact key token for short hotkeys", () => {
    const wrapper = mount(SHotkeyRecorder, {
      props: { modelValue: "Tab", label: "切换焦点区域" },
    });

    expect(wrapper.findAll(".s-hotkey-recorder__kbd")).toHaveLength(1);
  });

  it("keeps recording hint and conflict feedback in the same field flow", async () => {
    const wrapper = mount(SHotkeyRecorder, {
      props: { modelValue: "", label: "执行队列", conflict: "duplicate hotkey" },
      attachTo: document.body,
    });

    await wrapper.find(".s-hotkey-recorder").trigger("click");
    expect(wrapper.text()).toContain("按下新的快捷键");
    expect(wrapper.find(".s-hotkey-recorder-field__conflict").exists()).toBe(true);
    wrapper.unmount();
  });
});
