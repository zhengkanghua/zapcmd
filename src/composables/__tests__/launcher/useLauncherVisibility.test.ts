import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useLauncherVisibility } from "../../launcher/useLauncherVisibility";

describe("useLauncherVisibility", () => {
  it("forwards active result visibility context", () => {
    const ensureResultVisible = vi.fn();
    const ensureStagingVisible = vi.fn();
    const visibility = useLauncherVisibility({
      drawerOpen: ref(true),
      activeIndex: ref(3),
      stagingExpanded: ref(false),
      stagingActiveIndex: ref(0),
      ensureResultVisible,
      ensureStagingVisible
    });

    visibility.ensureActiveResultVisible();

    expect(ensureResultVisible).toHaveBeenCalledWith({
      drawerOpen: true,
      activeIndex: 3
    });
    expect(ensureStagingVisible).not.toHaveBeenCalled();
  });

  it("forwards active staging visibility context", () => {
    const ensureResultVisible = vi.fn();
    const ensureStagingVisible = vi.fn();
    const visibility = useLauncherVisibility({
      drawerOpen: ref(false),
      activeIndex: ref(0),
      stagingExpanded: ref(true),
      stagingActiveIndex: ref(2),
      ensureResultVisible,
      ensureStagingVisible
    });

    visibility.ensureActiveStagingVisible();

    expect(ensureStagingVisible).toHaveBeenCalledWith({
      stagingExpanded: true,
      stagingActiveIndex: 2
    });
    expect(ensureResultVisible).not.toHaveBeenCalled();
  });
});


