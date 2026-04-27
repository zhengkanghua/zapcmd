import { onMounted, watch } from "vue";
import { setAppLocale } from "../../../i18n";
import type { UseCommandCatalogOptions } from "./types";

function isCatalogActivated(options: UseCommandCatalogOptions): boolean {
  return options.activated?.value ?? true;
}

function bindCatalogWatchers(params: {
  options: UseCommandCatalogOptions;
  onDisabledCommandIdsChanged: () => void;
  onLocaleChanged: () => void;
}) {
  const { options, onDisabledCommandIdsChanged, onLocaleChanged } = params;

  if (options.disabledCommandIds) {
    watch(
      options.disabledCommandIds,
      () => {
        onDisabledCommandIdsChanged();
      },
      { deep: true }
    );
  }

  if (options.locale) {
    watch(
      options.locale,
      () => {
        // Runtime text mapping 当前仍通过全局 i18n 单例解析，本地切换时必须先同步 locale。
        setAppLocale(options.locale?.value);
        onLocaleChanged();
      },
      { deep: false }
    );
  }
}

function bindCatalogMountedHook(params: {
  options: UseCommandCatalogOptions;
  refreshUserCommands: () => Promise<void>;
}) {
  onMounted(async () => {
    if (!isCatalogActivated(params.options)) {
      return;
    }
    await params.refreshUserCommands();
  });
}

function dispatchCatalogTask(task: () => Promise<void>): void {
  void task().catch((error) => {
    console.warn("[commands] catalog lifecycle task failed", error);
  });
}

function createLocaleRefreshTask(params: {
  options: UseCommandCatalogOptions;
  remapFromCacheIfPrimed: () => Promise<boolean>;
  refreshUserCommands: () => Promise<void>;
}) {
  return async (): Promise<void> => {
    if (!params.options.isTauriRuntime()) {
      await params.refreshUserCommands();
      return;
    }

    try {
      const handled = await params.remapFromCacheIfPrimed();
      if (!handled) {
        await params.refreshUserCommands();
      }
    } catch {
      await params.refreshUserCommands();
    }
  };
}

export function bindCommandCatalogLifecycle(params: {
  options: UseCommandCatalogOptions;
  applyMergedTemplates: () => void;
  refreshUserCommands: () => Promise<void>;
  remapFromCacheIfPrimed: () => Promise<boolean>;
}): void {
  const refreshCatalogForLocaleChange = createLocaleRefreshTask({
    options: params.options,
    remapFromCacheIfPrimed: params.remapFromCacheIfPrimed,
    refreshUserCommands: params.refreshUserCommands
  });
  bindCatalogWatchers({
    options: params.options,
    onDisabledCommandIdsChanged: () => {
      params.applyMergedTemplates();
    },
    onLocaleChanged: () => {
      dispatchCatalogTask(refreshCatalogForLocaleChange);
    }
  });
  if (params.options.activated) {
    watch(
      params.options.activated,
      (activated, previousActivated) => {
        if (!activated || previousActivated) {
          return;
        }
        dispatchCatalogTask(params.refreshUserCommands);
      },
      { immediate: false }
    );
  }
  bindCatalogMountedHook(params);
}
