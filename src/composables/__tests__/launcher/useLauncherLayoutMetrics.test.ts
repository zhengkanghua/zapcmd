import { ref } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import {
  LAUNCHER_DRAWER_MAX_ROWS,
  LAUNCHER_DRAWER_MAX_VIEWPORT_HEIGHT_DESIGN_PX,
  LAUNCHER_DRAWER_ROW_HEIGHT_PX,
  LAUNCHER_FRAME_DESIGN_CAP_PX,
  LAUNCHER_DRAWER_VIEWPORT_CHROME_HEIGHT_PX,
  WINDOW_SIZING_CONSTANTS,
  useLauncherLayoutMetrics
} from "../../launcher/useLauncherLayoutMetrics";

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
    setScreenSize(1600, 2000);
    const query = ref("dock");
    const filteredResults = ref(Array.from({ length: 99 }, (_, idx) => ({ id: idx })));
    const stagedCommands = ref<unknown[]>([]);
    const stagingExpanded = ref(false);

    const metrics = useLauncherLayoutMetrics({
      query,
      filteredResults,
      stagedCommands,
      stagingExpanded,
      flowOpen: ref(false)
    });

    expect(metrics.drawerOpen.value).toBe(true);
    expect(metrics.drawerVisibleRows.value).toBe(LAUNCHER_DRAWER_MAX_ROWS);
    expect(metrics.drawerViewportHeight.value).toBe(
      LAUNCHER_DRAWER_MAX_ROWS * LAUNCHER_DRAWER_ROW_HEIGHT_PX +
        LAUNCHER_DRAWER_VIEWPORT_CHROME_HEIGHT_PX
    );
    expect(metrics.searchShellStyle.value["--drawer-row-height"]).toBe(
      `${LAUNCHER_DRAWER_ROW_HEIGHT_PX}px`
    );
  });

  it("computes search width style and shell width lower bound", () => {
    setScreenSize(1600, 900);
    const variants = [false, true] as const;
    for (const stagingExpandedValue of variants) {
      const metrics = useLauncherLayoutMetrics({
        query: ref("q"),
        filteredResults: ref([]),
        stagedCommands: ref([]),
        stagingExpanded: ref(stagingExpandedValue),
        flowOpen: ref(false)
      });

      expect(metrics.searchMainWidth.value).toBe(680);
      expect(metrics.minShellWidth.value).toBe(700);
      expect(metrics.searchShellStyle.value["--search-main-width"]).toBe("680px");
      expect(metrics.searchShellStyle.value["--shell-gap"]).toBe("0px");
      expect(metrics.searchShellStyle.value["--staging-collapsed-width"]).toBe("0px");
      expect(metrics.searchShellStyle.value["--flow-panel-width"]).toBe("453px");
      expect(metrics.searchShellStyle.value["--staging-expanded-width"]).toBe("453px");
      expect(metrics.searchShellStyle.value["--launcher-panel-max-height"]).toBe(
        `${LAUNCHER_FRAME_DESIGN_CAP_PX}px`
      );
    }
  });

  it("Flow + Review 并存时左右抽屉均分宽度（1/2 + 1/2）", () => {
    setScreenSize(1600, 900);
    const metrics = useLauncherLayoutMetrics({
      query: ref("q"),
      filteredResults: ref([]),
      stagedCommands: ref([]),
      stagingExpanded: ref(true),
      flowOpen: ref(true)
    });

    expect(metrics.searchMainWidth.value).toBe(680);
    expect(metrics.searchShellStyle.value["--flow-panel-width"]).toBe("340px");
    expect(metrics.searchShellStyle.value["--flow-width"]).toBe("340px");
  });

  it("不再暴露 stagingVisibleRows / stagingListShouldScroll / stagingListMaxHeight 旧职责", () => {
    setScreenSize(1200, 600);
    const metrics = useLauncherLayoutMetrics({
      query: ref(""),
      filteredResults: ref([]),
      stagedCommands: ref(Array.from({ length: 5 }, (_, idx) => ({ id: idx }))),
      stagingExpanded: ref(false),
      flowOpen: ref(false)
    });

    expect("stagingVisibleRows" in metrics).toBe(false);
    expect("stagingListShouldScroll" in metrics).toBe(false);
    expect("stagingListMaxHeight" in metrics).toBe(false);
  });

  it("overlay 打开也不再抬高 Search drawer 到 floor height", () => {
    setScreenSize(1600, 1000);
    const metrics = useLauncherLayoutMetrics({
      query: ref("dock"),
      filteredResults: ref([]),
      stagedCommands: ref([{ id: "staged-1" }]),
      stagingExpanded: ref(true),
      flowOpen: ref(true)
    });

    expect("drawerFloorViewportHeight" in metrics).toBe(false);
    expect("drawerFillerHeight" in metrics).toBe(false);
  });

  it("query 为空时 searchPanelEffectiveHeight 仅为 searchCapsuleHeight", () => {
    setScreenSize(1440, 900);
    const metrics = useLauncherLayoutMetrics({
      query: ref(""),
      filteredResults: ref([{ id: "r1" }, { id: "r2" }]),
      stagedCommands: ref([{ id: "s1" }]),
      stagingExpanded: ref(true),
      flowOpen: ref(true)
    });

    expect(metrics.drawerOpen.value).toBe(false);
    expect(metrics.searchPanelEffectiveHeight.value).toBe(
      WINDOW_SIZING_CONSTANTS.windowBaseHeight
    );
  });

  it("sharedPanelMaxHeight 与 stagingExpanded/flowOpen 无关，只取搜索最大结果口径", () => {
    setScreenSize(1600, 900);
    const variants = [
      { stagingExpanded: false, flowOpen: false },
      { stagingExpanded: true, flowOpen: false },
      { stagingExpanded: false, flowOpen: true },
      { stagingExpanded: true, flowOpen: true }
    ] as const;

    for (const variant of variants) {
      const metrics = useLauncherLayoutMetrics({
        query: ref("dock"),
        filteredResults: ref(Array.from({ length: 99 }, (_, idx) => ({ id: idx }))),
        stagedCommands: ref(Array.from({ length: 12 }, (_, idx) => ({ id: idx }))),
        stagingExpanded: ref(variant.stagingExpanded),
        flowOpen: ref(variant.flowOpen)
      });

      expect(metrics.sharedPanelMaxHeight.value).toBe(
        WINDOW_SIZING_CONSTANTS.windowBaseHeight + LAUNCHER_DRAWER_MAX_VIEWPORT_HEIGHT_DESIGN_PX
      );
    }
  });
});
