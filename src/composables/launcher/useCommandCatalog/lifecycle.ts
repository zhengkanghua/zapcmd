import { onMounted, watch } from "vue";
import { setAppLocale } from "../../../i18n";
import type { UseCommandCatalogOptions } from "./types";

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
    await params.refreshUserCommands();
  });
}

export function bindCommandCatalogLifecycle(params: {
  options: UseCommandCatalogOptions;
  loadBuiltinTemplatesAndSource: () => Promise<void>;
  applyMergedTemplates: () => void;
  refreshUserCommands: () => Promise<void>;
  remapFromCacheIfPrimed: () => Promise<boolean>;
}): void {
  bindCatalogWatchers({
    options: params.options,
    onDisabledCommandIdsChanged: () => {
      params.applyMergedTemplates();
    },
    onLocaleChanged: () => {
      if (!params.options.isTauriRuntime()) {
        void params.loadBuiltinTemplatesAndSource().then(() => {
          params.applyMergedTemplates();
        });
        return;
      }
      void params.remapFromCacheIfPrimed().then((handled) => {
        if (!handled) {
          return params.refreshUserCommands();
        }
        return undefined;
      });
    }
  });
  bindCatalogMountedHook(params);
}
