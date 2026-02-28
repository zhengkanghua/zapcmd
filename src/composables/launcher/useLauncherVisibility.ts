import type { Ref } from "vue";

interface UseLauncherVisibilityOptions {
  drawerOpen: Ref<boolean>;
  activeIndex: Ref<number>;
  stagingExpanded: Ref<boolean>;
  stagingActiveIndex: Ref<number>;
  ensureResultVisible: (options: { drawerOpen: boolean; activeIndex: number }) => void;
  ensureStagingVisible: (options: { stagingExpanded: boolean; stagingActiveIndex: number }) => void;
}

export function useLauncherVisibility(options: UseLauncherVisibilityOptions) {
  function ensureActiveResultVisible(): void {
    options.ensureResultVisible({
      drawerOpen: options.drawerOpen.value,
      activeIndex: options.activeIndex.value
    });
  }

  function ensureActiveStagingVisible(): void {
    options.ensureStagingVisible({
      stagingExpanded: options.stagingExpanded.value,
      stagingActiveIndex: options.stagingActiveIndex.value
    });
  }

  return {
    ensureActiveResultVisible,
    ensureActiveStagingVisible
  };
}
