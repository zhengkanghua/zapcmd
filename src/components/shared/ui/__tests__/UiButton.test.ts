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
    expect(button.attributes("class")).toContain("rounded-control");
  });

  it("applies variant and size props", async () => {
    const wrapper = mount(UiButton, {
      props: { variant: "primary", size: "default" },
      slots: { default: "Save" }
    });

    const button = wrapper.get("button");
    const primaryDefaultClass = button.attributes("class") ?? "";

    await wrapper.setProps({ size: "small" });
    const primarySmallClass = button.attributes("class") ?? "";

    await wrapper.setProps({ variant: "muted", size: "small" });
    const mutedSmallClass = button.attributes("class") ?? "";

    expect(primaryDefaultClass).not.toBe(primarySmallClass);
    expect(primarySmallClass).not.toBe(mutedSmallClass);
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
    expect(button.attributes("class")).toContain("disabled:opacity-[0.56]");
    expect(button.attributes("class")).toContain("disabled:cursor-default");

    await button.trigger("click");

    expect(wrapper.emitted("click")).toBeUndefined();
  });

  it("adds consistent disabled visuals for danger variant", () => {
    const wrapper = mount(UiButton, {
      props: { variant: "danger", disabled: true },
      slots: { default: "Delete" }
    });

    const button = wrapper.get("button");

    expect(button.attributes("class")).toContain("disabled:opacity-[0.56]");
    expect(button.attributes("class")).toContain("disabled:cursor-default");
  });
});
