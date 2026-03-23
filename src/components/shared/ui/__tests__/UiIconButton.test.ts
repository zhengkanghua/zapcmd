import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import UiIconButton from "../UiIconButton.vue";

describe("UiIconButton", () => {
  it("renders aria-label and btn-icon class", () => {
    const wrapper = mount(UiIconButton, {
      props: { ariaLabel: "Close" },
      slots: { default: "x" }
    });

    const button = wrapper.get("button");

    expect(button.attributes("aria-label")).toBe("Close");
    expect(button.classes()).toContain("btn-icon");
  });

  it("supports variant and size props via legacy btn-* classes", () => {
    const wrapper = mount(UiIconButton, {
      props: { ariaLabel: "Delete", variant: "danger", size: "small" },
      slots: { default: "!" }
    });

    const button = wrapper.get("button");

    expect(button.classes()).toContain("btn-icon");
    expect(button.classes()).toContain("btn-danger");
    expect(button.classes()).toContain("btn-small");
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

