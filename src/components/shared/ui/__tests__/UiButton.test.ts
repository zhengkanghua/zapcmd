import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import UiButton from "../UiButton.vue";

describe("UiButton", () => {
  it("renders a button with default type=button", () => {
    const wrapper = mount(UiButton, {
      slots: { default: "OK" }
    });

    const button = wrapper.get("button");

    expect(button.attributes("type")).toBe("button");
    expect(button.text()).toBe("OK");
  });

  it("supports variant and size props via legacy btn-* classes", () => {
    const wrapper = mount(UiButton, {
      props: { variant: "primary", size: "small" },
      slots: { default: "Save" }
    });

    const button = wrapper.get("button");

    expect(button.classes()).toContain("btn-primary");
    expect(button.classes()).toContain("btn-small");
  });

  it("emits click", async () => {
    const wrapper = mount(UiButton, {
      props: { variant: "muted" },
      slots: { default: "Click" }
    });

    await wrapper.get("button").trigger("click");

    expect(wrapper.emitted("click")).toHaveLength(1);
  });

  it("respects disabled and suppresses click emission", async () => {
    const wrapper = mount(UiButton, {
      props: { disabled: true },
      slots: { default: "Disabled" }
    });

    const button = wrapper.get("button");

    expect(button.attributes("disabled")).toBeDefined();

    await button.trigger("click");

    expect(wrapper.emitted("click")).toBeUndefined();
  });
});

