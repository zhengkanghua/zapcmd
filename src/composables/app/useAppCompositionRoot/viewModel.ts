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
import { createSettingsVm, type SettingsVmContext } from "./settingsVm";

type AppCompositionContext = ReturnType<typeof createAppCompositionContext>;
type AppCompositionRuntime = ReturnType<typeof createAppCompositionRuntime>;

const SETTINGS_SAVED_TOAST_DISMISS_DELAY_MS = 2200;

export function createSettingsMutationHandlers(context: SettingsVmContext) {
  const scene = context.settingsScene;
  let settingsSavedTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
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
    if (disposed) {
      return;
    }
    resetSavedToast();
    settingsSaved.value = true;
    settingsSavedTimer = setTimeout(() => {
      if (disposed) {
        settingsSavedTimer = null;
        return;
      }
      settingsSaved.value = false;
      settingsSavedTimer = null;
    }, SETTINGS_SAVED_TOAST_DISMISS_DELAY_MS);
  }

  function handlePersistSuccess(): void {
    if (disposed || scene.settingsWindow.settingsError.value) {
      return;
    }
    markSavedToast();
  }

  function persistImmediate(): void {
    resetSavedToast();
    void scene.settingsWindow.persistSetting().then(() => {
      handlePersistSuccess();
    });
  }

  // 作用域销毁后不再允许旧定时器回写 toast 状态，避免残留异步闭包继续更新已卸载视图。
  if (getCurrentScope()) {
    onScopeDispose(() => {
      disposed = true;
      clearSettingsSavedTimer();
    });
  }

  return {
    settingsSaved,
    clearSettingsSavedTimer,
    applyHotkeyChange(fieldId: HotkeyFieldId, value: string): void {
      resetSavedToast();
      void scene.settingsWindow.applyHotkeyChange(fieldId, value).then(() => {
        handlePersistSuccess();
      });
    },
    applyPointerActionChange(fieldId: PointerActionFieldId, action: SearchResultPointerAction): void {
      resetSavedToast();
      void scene.settingsWindow.applyPointerActionChange(fieldId, action).then(() => {
        handlePersistSuccess();
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
    setMotionPreset(value: string): void {
      scene.settingsStore.setMotionPreset(value);
      persistImmediate();
    },
    setBlurEnabled(value: boolean): void {
      scene.settingsStore.setBlurEnabled(value);
      persistImmediate();
    },
    async saveSettings(): Promise<void> {
      resetSavedToast();
      await scene.settingsWindow.persistSetting();
      handlePersistSuccess();
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
