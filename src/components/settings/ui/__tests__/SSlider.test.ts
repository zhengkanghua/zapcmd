import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import SSlider from "../SSlider.vue";

describe("SSlider", () => {
  it("renders with current value", () => {
    const wrapper = mount(SSlider, {
      props: { modelValue: 0.96, min: 0.2, max: 1, step: 0.01 }
    });
    const input = wrapper.find("input[type='range']");
    expect((input.element as HTMLInputElement).value).toBe("0.96");
  });

  it("emits update:modelValue on input", async () => {
    const wrapper = mount(SSlider, {
      props: { modelValue: 0.96, min: 0.2, max: 1, step: 0.01 }
    });
    await wrapper.find("input[type='range']").setValue("0.5");
    expect(wrapper.emitted("update:modelValue")?.[0][0]).toBeCloseTo(0.5);
  });

  it("displays formatted value when showValue is true", () => {
    const wrapper = mount(SSlider, {
      props: {
        modelValue: 0.96,
        min: 0.2,
        max: 1,
        step: 0.01,
        showValue: true,
        formatValue: (v: number) => `${Math.round(v * 100)}%`
      }
    });
    expect(wrapper.text()).toContain("96%");
  });
});

