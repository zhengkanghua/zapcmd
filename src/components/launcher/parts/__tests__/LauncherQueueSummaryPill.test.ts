import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import LauncherQueueSummaryPill from "../LauncherQueueSummaryPill.vue";

describe("LauncherQueueSummaryPill", () => {
  it("keeps a 36px hit target floor", () => {
    const wrapper = mount(LauncherQueueSummaryPill, {
      props: { count: 3 }
    });

    const button = wrapper.get(".queue-summary-pill");
    expect(button.classes()).toContain("w-[36px]");
    expect(button.classes()).toContain("h-[36px]");
  });
});
