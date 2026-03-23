import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import UiIconButton from "../UiIconButton.vue";

describe("UiIconButton", () => {
  it("renders aria-label", () => {
    const wrapper = mount(UiIconButton, {
      props: { ariaLabel: "Close" },
      slots: { default: "x" }
    });

    const button = wrapper.get("button");

    expect(button.attributes("aria-label")).toBe("Close");
    expect(button.attributes("class")).toContain("rounded-control");
  });

  it("applies variant and size props", async () => {
    const wrapper = mount(UiIconButton, {
      props: { ariaLabel: "Delete", variant: "danger", size: "default" },
      slots: { default: "!" }
    });

    const button = wrapper.get("button");
    const dangerDefaultClass = button.attributes("class") ?? "";

    await wrapper.setProps({ size: "small" });
    const dangerSmallClass = button.attributes("class") ?? "";

    await wrapper.setProps({ variant: "muted", size: "small" });
    const mutedSmallClass = button.attributes("class") ?? "";

    expect(dangerDefaultClass).not.toBe(dangerSmallClass);
    expect(dangerSmallClass).not.toBe(mutedSmallClass);
  });

  it("emits click", async () => {
    const wrapper = mount(UiIconButton, {
      props: { ariaLabel: "More" },
      slots: { default: "…" }
    });

    await wrapper.get("button").trigger("click");

    expect(wrapper.emitted("click")).toHaveLength(1);
  });

  it("respects disabled and suppresses click emission", async () => {
    const wrapper = mount(UiIconButton, {
      props: { ariaLabel: "Disabled", disabled: true },
      slots: { default: "x" }
    });

    const button = wrapper.get("button");

    expect(button.attributes("disabled")).toBeDefined();

    await button.trigger("click");

    expect(wrapper.emitted("click")).toBeUndefined();
  });
});
