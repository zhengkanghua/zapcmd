import { onMounted, watch, type Ref } from "vue";
import type { CommandLoadIssue } from "../../../features/commands/runtimeLoader";
import type { CommandTemplate } from "../../../features/commands/types";
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
  loadBuiltinTemplatesAndSource: () => void;
  userTemplates: Ref<CommandTemplate[]>;
  userCommandSourceById: Ref<Record<string, string>>;
  loadIssues: Ref<CommandLoadIssue[]>;
  applyMergedTemplates: () => void;
  refreshUserCommands: () => Promise<void>;
}) {
  const {
    options,
    loadBuiltinTemplatesAndSource,
    userTemplates,
    userCommandSourceById,
    loadIssues,
    applyMergedTemplates,
    refreshUserCommands
  } = params;

  onMounted(async () => {
    if (!options.isTauriRuntime()) {
      loadBuiltinTemplatesAndSource();
      userTemplates.value = [];
      userCommandSourceById.value = {};
      loadIssues.value = [];
      applyMergedTemplates();
      return;
    }

    await refreshUserCommands();
  });
}

export function bindCommandCatalogLifecycle(params: {
  options: UseCommandCatalogOptions;
  loadBuiltinTemplatesAndSource: () => void;
  userTemplates: Ref<CommandTemplate[]>;
  userCommandSourceById: Ref<Record<string, string>>;
  loadIssues: Ref<CommandLoadIssue[]>;
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
        params.loadBuiltinTemplatesAndSource();
        params.applyMergedTemplates();
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
