import { getCurrentScope, onScopeDispose, ref } from "vue";
import type { CommandManagementViewState } from "../../../features/settings/types";
import type {
  HotkeyFieldId,
  PointerActionFieldId,
  SearchResultPointerAction
} from "../../../stores/settingsStore";
import { createAppShellVm } from "./appShellVm";
import type { createAppCompositionContext } from "./context";
import { createLauncherVm } from "./launcherVm";
import type { createAppCompositionRuntime } from "./runtime";
import { createSettingsVm } from "./settingsVm";

type AppCompositionContext = ReturnType<typeof createAppCompositionContext>;
type AppCompositionRuntime = ReturnType<typeof createAppCompositionRuntime>;

const SETTINGS_SAVED_TOAST_DISMISS_DELAY_MS = 2200;

function createSettingsMutationHandlers(context: AppCompositionContext) {
  const scene = context.settingsScene;
  let settingsSavedTimer: ReturnType<typeof setTimeout> | null = null;
  const settingsSaved = ref(false);

  function clearSettingsSavedTimer(): void {
    if (!settingsSavedTimer) {
      return;
    }
    clearTimeout(settingsSavedTimer);
    settingsSavedTimer = null;
  }

  function resetSavedToast(): void {
    settingsSaved.value = false;
    clearSettingsSavedTimer();
  }

  function markSavedToast(): void {
    resetSavedToast();
    settingsSaved.value = true;
    settingsSavedTimer = setTimeout(() => {
      settingsSaved.value = false;
      settingsSavedTimer = null;
    }, SETTINGS_SAVED_TOAST_DISMISS_DELAY_MS);
  }

  function persistImmediate(): void {
    resetSavedToast();
    void scene.settingsWindow.persistSetting().then(() => {
      if (!scene.settingsWindow.settingsError.value) {
        markSavedToast();
      }
    });
  }

  // 作用域销毁后不再允许旧定时器回写 toast 状态，避免残留异步闭包继续更新已卸载视图。
  if (getCurrentScope()) {
    onScopeDispose(() => {
      clearSettingsSavedTimer();
    });
  }

  return {
    settingsSaved,
    clearSettingsSavedTimer,
    applyHotkeyChange(fieldId: HotkeyFieldId, value: string): void {
      resetSavedToast();
      void scene.settingsWindow.applyHotkeyChange(fieldId, value).then(() => {
        if (!scene.settingsWindow.settingsError.value) {
          markSavedToast();
        }
      });
    },
    applyPointerActionChange(fieldId: PointerActionFieldId, action: SearchResultPointerAction): void {
      resetSavedToast();
      void scene.settingsWindow.applyPointerActionChange(fieldId, action).then(() => {
        if (!scene.settingsWindow.settingsError.value) {
          markSavedToast();
        }
      });
    },
    toggleCommandEnabled(commandId: string, enabled: boolean): void {
      scene.commandManagement.toggleCommandEnabled(commandId, enabled);
      persistImmediate();
    },
    setFilteredCommandsEnabled(enabled: boolean): void {
      scene.commandManagement.setFilteredCommandsEnabled(enabled);
      persistImmediate();
    },
    updateCommandView(patch: Partial<CommandManagementViewState>): void {
      scene.commandManagement.updateCommandView(patch);
    },
    resetCommandFilters(): void {
      scene.commandManagement.resetCommandFilters();
    },
    setWindowOpacity(value: number): void {
      scene.settingsStore.setWindowOpacity(value);
      persistImmediate();
    },
    setTheme(value: string): void {
      scene.settingsStore.setTheme(value);
      persistImmediate();
    },
    setBlurEnabled(value: boolean): void {
      scene.settingsStore.setBlurEnabled(value);
      persistImmediate();
    },
    async saveSettings(): Promise<void> {
      resetSavedToast();
      await scene.settingsWindow.persistSetting();
      if (!scene.settingsWindow.settingsError.value) {
        markSavedToast();
      }
    }
  };
}

export function createAppCompositionViewModel(
  context: AppCompositionContext,
  runtime: AppCompositionRuntime
) {
  const settingsMutationHandlers = createSettingsMutationHandlers(context);
  const launcherVm = createLauncherVm(context, runtime);
  const settingsVm = createSettingsVm(context, settingsMutationHandlers);
  const appShellVm = createAppShellVm(runtime, settingsMutationHandlers);

  return {
    isSettingsWindow: context.isSettingsWindow,
    launcherVm,
    settingsVm,
    appShellVm
  };
}
