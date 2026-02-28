import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useLauncherWatchers } from "../../launcher/useLauncherWatchers";
import { useLauncherWatcherBindings } from "../../launcher/useLauncherWatcherBindings";

vi.mock("../../launcher/useLauncherWatchers", () => ({
  useLauncherWatchers: vi.fn()
}));

describe("useLauncherWatcherBindings", () => {
  it("delegates watcher wiring to useLauncherWatchers", () => {
    const windowSizing = {
      scheduleWindowSync: vi.fn(),
      syncWindowSizeImmediate: vi.fn()
    };
    const drawerOpen = ref(true);
    const drawerVisibleRows = ref(4);
    const stagingVisibleRows = ref(2);
    const pendingCommand = ref<unknown>(null);
    const stagingDrawerState = ref<"closed" | "opening" | "open" | "closing">("open");
    const filteredResults = ref<unknown[]>([]);
    const resultButtons = ref<Array<HTMLElement | null>>([]);
    const activeIndex = ref(0);
    const drawerRef = ref<HTMLElement | null>(null);
    const ensureActiveResultVisible = vi.fn();
    const paramInputRef = ref<HTMLInputElement | null>(null);

    useLauncherWatcherBindings({
      drawerOpen,
      drawerVisibleRows,
      stagingVisibleRows,
      pendingCommand,
      stagingDrawerState,
      filteredResults,
      resultButtons,
      activeIndex,
      drawerRef,
      ensureActiveResultVisible,
      paramInputRef,
      windowSizing
    });

    const mocked = vi.mocked(useLauncherWatchers);
    expect(mocked).toHaveBeenCalledTimes(1);
    expect(mocked.mock.calls[0]?.[0]).toMatchObject({
      drawerOpen,
      drawerVisibleRows,
      stagingVisibleRows,
      pendingCommand,
      stagingDrawerState,
      filteredResults,
      resultButtons,
      activeIndex,
      drawerRef,
      ensureActiveResultVisible,
      paramInputRef
    });
    expect(mocked.mock.calls[0]?.[0].scheduleWindowSync).toBe(windowSizing.scheduleWindowSync);
    expect(mocked.mock.calls[0]?.[0].syncWindowSizeImmediate).toBe(
      windowSizing.syncWindowSizeImmediate
    );
  });
});


