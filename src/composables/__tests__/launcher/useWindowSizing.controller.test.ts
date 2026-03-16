import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import {
  LAUNCHER_FRAME_DESIGN_CAP_PX,
  WINDOW_SIZING_CONSTANTS
} from "../../launcher/useLauncherLayoutMetrics";
import { createWindowSizingController } from "../../launcher/useWindowSizing/controller";
import {
  UI_TOP_ALIGN_OFFSET_PX_FALLBACK,
  type UseWindowSizingOptions
} from "../../launcher/useWindowSizing/model";

describe("createWindowSizingController（CommandPanel floor 捕获）", () => {
  it("进入 CommandPanel 时即使 lastWindowSize 为空也不应缩小（floor 取进入前高度）", async () => {
    const drawerOpen = ref(true);
    const drawerViewportHeight = ref(5_000);
    const pendingCommand = ref<unknown>({ id: "pending" });
    const commandPanelFrameHeightFloor = ref<number | null>(null);

    const requestAnimateMainWindowSize = vi.fn<
      UseWindowSizingOptions["requestAnimateMainWindowSize"]
    >(async (_width, _height) => {});

    const controller = createWindowSizingController({
      constants: WINDOW_SIZING_CONSTANTS,
      isSettingsWindow: ref(false),
      isTauriRuntime: () => true,
      resolveAppWindow: () => null,
      requestSetMainWindowSize: async () => {},
      requestAnimateMainWindowSize,
      searchShellRef: ref(null),
      stagingPanelRef: ref(null),
      stagingExpanded: ref(false),
      pendingCommand,
      commandPanelFrameHeightFloor,
      drawerOpen,
      drawerViewportHeight,
      stagingVisibleRows: ref(0),
      searchMainWidth: ref(680),
      minShellWidth: ref(0),
      windowWidthCap: ref(2000),
      windowHeightCap: ref(2000),
      scheduleSearchInputFocus: () => {},
      loadSettings: () => {}
    });

    // 在 nextTick 前切换到“参数面板”布局：抽走 drawer（高度应被 floor 挡住）
    queueMicrotask(() => {
      drawerOpen.value = false;
      drawerViewportHeight.value = 0;
    });

    await controller.syncWindowSize();

    expect(requestAnimateMainWindowSize).toHaveBeenCalled();
    const lastCall = requestAnimateMainWindowSize.mock.calls.at(-1);
    expect(lastCall?.[1]).toBe(LAUNCHER_FRAME_DESIGN_CAP_PX + UI_TOP_ALIGN_OFFSET_PX_FALLBACK);
  });
});
