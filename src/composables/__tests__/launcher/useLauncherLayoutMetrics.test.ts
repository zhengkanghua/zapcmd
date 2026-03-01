import { ref } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import { useLauncherLayoutMetrics } from "../../launcher/useLauncherLayoutMetrics";

const originalAvailWidthDescriptor = Object.getOwnPropertyDescriptor(window.screen, "availWidth");
const originalAvailHeightDescriptor = Object.getOwnPropertyDescriptor(window.screen, "availHeight");

function setScreenSize(width: number, height: number): void {
  Object.defineProperty(window.screen, "availWidth", {
    configurable: true,
    value: width
  });
  Object.defineProperty(window.screen, "availHeight", {
    configurable: true,
    value: height
  });
}

function restoreScreenSize(): void {
  if (originalAvailWidthDescriptor) {
    Object.defineProperty(window.screen, "availWidth", originalAvailWidthDescriptor);
  }
  if (originalAvailHeightDescriptor) {
    Object.defineProperty(window.screen, "availHeight", originalAvailHeightDescriptor);
  }
}

afterEach(() => {
  restoreScreenSize();
});

describe("useLauncherLayoutMetrics", () => {
  it("caps drawer rows and viewport height by defaults and screen height", () => {
    setScreenSize(1600, 1000);
    const query = ref("dock");
    const filteredResults = ref(Array.from({ length: 10 }, (_, idx) => ({ id: idx })));
    const stagedCommands = ref<unknown[]>([]);
    const stagingExpanded = ref(false);

    const metrics = useLauncherLayoutMetrics({
      query,
      filteredResults,
      stagedCommands,
      stagingExpanded
    });

    expect(metrics.drawerOpen.value).toBe(true);
    expect(metrics.drawerVisibleRows.value).toBe(8);
    expect(metrics.drawerViewportHeight.value).toBe(610);
  });

  it("computes search width style and shell width lower bound", () => {
    setScreenSize(1600, 900);
    const metrics = useLauncherLayoutMetrics({
      query: ref("q"),
      filteredResults: ref([]),
      stagedCommands: ref([]),
      stagingExpanded: ref(false)
    });

    expect(metrics.searchMainWidth.value).toBe(680);
    expect(metrics.minShellWidth.value).toBe(784);
    expect(metrics.searchShellStyle.value["--search-main-width"]).toBe("680px");
    expect(metrics.searchShellStyle.value["--staging-expanded-width"]).toBe("300px");
  });

  it("computes staging scroll and max height from expansion and row estimation", () => {
    setScreenSize(1200, 600);
    const stagingExpanded = ref(false);
    const metrics = useLauncherLayoutMetrics({
      query: ref(""),
      filteredResults: ref([]),
      stagedCommands: ref(Array.from({ length: 5 }, (_, idx) => ({ id: idx }))),
      stagingExpanded
    });

    expect(metrics.stagingVisibleRows.value).toBe(2);
    expect(metrics.stagingListShouldScroll.value).toBe(false);
    expect(metrics.stagingListMaxHeight.value).toBe("200px");

    stagingExpanded.value = true;
    expect(metrics.stagingListShouldScroll.value).toBe(true);
  });
});


