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
    const variants = [false, true] as const;
    for (const stagingExpandedValue of variants) {
      const metrics = useLauncherLayoutMetrics({
        query: ref("q"),
        filteredResults: ref([]),
        stagedCommands: ref([]),
        stagingExpanded: ref(stagingExpandedValue)
      });

      expect(metrics.searchMainWidth.value).toBe(680);
      expect(metrics.minShellWidth.value).toBe(700);
      expect(metrics.searchShellStyle.value["--search-main-width"]).toBe("680px");
      expect(metrics.searchShellStyle.value["--shell-gap"]).toBe("0px");
      expect(metrics.searchShellStyle.value["--staging-collapsed-width"]).toBe("0px");
      expect(metrics.searchShellStyle.value["--review-width"]).toBe("453px");
      expect(metrics.searchShellStyle.value["--staging-expanded-width"]).toBe("453px");
    }
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

    expect(metrics.stagingVisibleRows.value).toBe(1);
    expect(metrics.stagingListShouldScroll.value).toBe(false);
    expect(metrics.stagingListMaxHeight.value).toBe("140px");

    stagingExpanded.value = true;
    expect(metrics.stagingListShouldScroll.value).toBe(true);
  });

  it("applies drawer floor height only when stagingExpanded=true and results < 4", () => {
    setScreenSize(1600, 1000);

    const floorViewportHeight = 322;
    const viewportChromeHeight = 12 + 22;
    const rowHeight = 72;

    const counts = [0, 1, 3, 4] as const;
    const stagingExpandedVariants = [false, true] as const;

    for (const stagingExpandedValue of stagingExpandedVariants) {
      for (const resultCount of counts) {
        const query = ref("dock");
        const filteredResults = ref(Array.from({ length: resultCount }, (_, idx) => ({ id: idx })));
        const stagedCommands = ref<unknown[]>([]);
        const stagingExpanded = ref(stagingExpandedValue);

        const metrics = useLauncherLayoutMetrics({
          query,
          filteredResults,
          stagedCommands,
          stagingExpanded
        });

        const naturalViewportHeight =
          Math.max(resultCount, 1) * rowHeight + viewportChromeHeight;
        const shouldUseFloorHeight = stagingExpandedValue && resultCount < 4;

        const expectedViewportHeight = shouldUseFloorHeight
          ? floorViewportHeight
          : naturalViewportHeight;
        const expectedFillerHeight = shouldUseFloorHeight
          ? floorViewportHeight - naturalViewportHeight
          : 0;

        const snapshot = {
          resultCount,
          stagingExpanded: stagingExpandedValue,
          usesFloor: metrics.drawerUsesFloorHeight.value,
          drawerVisibleRows: metrics.drawerVisibleRows.value,
          drawerViewportHeight: metrics.drawerViewportHeight.value,
          drawerFillerHeight: metrics.drawerFillerHeight.value
        };

        if (metrics.drawerUsesFloorHeight.value !== shouldUseFloorHeight) {
          throw new Error(`drawerUsesFloorHeight mismatch: ${JSON.stringify(snapshot)}`);
        }
        if (metrics.drawerViewportHeight.value !== expectedViewportHeight) {
          throw new Error(`drawerViewportHeight mismatch: ${JSON.stringify(snapshot)}`);
        }
        if (metrics.drawerFillerHeight.value !== expectedFillerHeight) {
          throw new Error(`drawerFillerHeight mismatch: ${JSON.stringify(snapshot)}`);
        }
      }
    }
  });

  it("stagingExpanded=true 且 query 为空时仍提供 drawerFloorViewportHeight（用于 Review 对齐）", () => {
    setScreenSize(1600, 900);
    const metrics = useLauncherLayoutMetrics({
      query: ref(""),
      filteredResults: ref([]),
      stagedCommands: ref([{ id: "staged-1" }]),
      stagingExpanded: ref(true)
    });

    expect(metrics.drawerOpen.value).toBe(false);
    expect(metrics.drawerFloorViewportHeight.value).toBe(322);
  });
});
