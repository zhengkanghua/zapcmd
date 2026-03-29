import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import LauncherQueueSummaryPill from "../LauncherQueueSummaryPill.vue";

describe("LauncherQueueSummaryPill", () => {
  it("uses Queue naming and emits toggle-queue", async () => {
    const wrapper = mount(LauncherQueueSummaryPill, {
      props: { count: 3 }
    });

    expect(wrapper.get(".queue-summary-pill").attributes("title")).toContain("队列");
    await wrapper.get(".queue-summary-pill").trigger("click");
    expect(wrapper.emitted("toggle-queue")).toHaveLength(1);
  });

  it("keeps a 44px hit target floor", () => {
    const wrapper = mount(LauncherQueueSummaryPill, {
      props: { count: 3 }
    });

    const button = wrapper.get(".queue-summary-pill");
    expect(button.classes()).toContain("w-[44px]");
    expect(button.classes()).toContain("h-[44px]");
  });

  it("caps large counts at 99+ in the badge", () => {
    const wrapper = mount(LauncherQueueSummaryPill, {
      props: { count: 120 }
    });

    expect(wrapper.get(".queue-summary-pill__badge").text()).toBe("99+");
  });

  it("formats non-finite badge counts as 0", () => {
    const wrapper = mount(LauncherQueueSummaryPill, {
      props: { count: Number.POSITIVE_INFINITY }
    });

    expect(wrapper.get(".queue-summary-pill__badge").text()).toBe("0");
  });
});
