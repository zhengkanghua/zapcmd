import { t } from "../../../i18n";
import { useAppLifecycleBridge } from "../useAppLifecycleBridge";
import type { useWindowSizing } from "../../launcher/useWindowSizing";
import { SETTINGS_STORAGE_KEYS } from "./constants";
import type { LauncherRuntimeContext } from "./launcherContext";
import {
  evaluateSettingsWindowOpenPolicy,
  evaluateStartupUpdateFeedbackPolicy,
  evaluateStartupUpdatePolicy
} from "./policies";

interface LauncherRuntimeFeedbackBridge {
  commandExecution: {
    clearExecutionFeedbackTimer: () => void;
    setExecutionFeedback: (
      tone: "neutral" | "success" | "error",
      message: string
    ) => void;
  };
  stagingQueue: {
    clearQueueTransitionTimer: () => void;
  };
}

/**
 * 启动更新提醒只负责桥接策略与反馈，不应继续堆在 runtime 主状态机里。
 */
export function createOnMainReady(
  context: LauncherRuntimeContext,
  launcherRuntime: LauncherRuntimeFeedbackBridge
) {
  return () => {
    const startupPolicy = evaluateStartupUpdatePolicy({
      isTauriRuntime: context.ports.isTauriRuntime(),
      autoCheckUpdateEnabled: context.autoCheckUpdate.value
    });
    if (!startupPolicy.shouldCheck) {
      return;
    }

    void context.ports
      .checkStartupUpdate({
        enabled: startupPolicy.enabled,
        storage: context.ports.getLocalStorage()
      })
      .then((updateResult) => {
        const feedbackPolicy = evaluateStartupUpdateFeedbackPolicy(updateResult);
        if (!feedbackPolicy.shouldNotify) {
          return;
        }
        launcherRuntime.commandExecution.setExecutionFeedback(
          "neutral",
          t("settings.about.updateAvailable", { version: feedbackPolicy.version })
        );
      })
      .catch((error) => {
        context.ports.logError("startup update check failed", error);
      });
  };
}

export function createOnSettingsReady(context: LauncherRuntimeContext) {
  return () => {
    const openPolicy = evaluateSettingsWindowOpenPolicy({
      isTauriRuntime: context.ports.isTauriRuntime()
    });
    if (!openPolicy.shouldOpen) {
      return;
    }
    context.ports.invoke("open_settings_window").catch((error) => {
      context.ports.logError("open_settings_window invoke failed", {
        windowLabel: context.currentWindowLabel.value,
        error
      });
    });
  };
}

export function bindLifecycleBridge(
  context: LauncherRuntimeContext,
  launcherRuntime: LauncherRuntimeFeedbackBridge,
  windowSizing: ReturnType<typeof useWindowSizing>,
  onWindowKeydown: (event: KeyboardEvent) => void
): void {
  useAppLifecycleBridge({
    runtime: {
      isSettingsWindow: context.isSettingsWindow,
      isTauriRuntime: context.ports.isTauriRuntime,
      resolveAppWindow: context.resolveAppWindow,
      currentWindowLabel: context.currentWindowLabel,
      settingsSyncChannel: context.settingsSyncChannel,
      settingsStorageKeys: SETTINGS_STORAGE_KEYS
    },
    settingsWindow: context.settingsWindow,
    windowSizing,
    queue: launcherRuntime.stagingQueue,
    stagedFeedback: context.stagedFeedback,
    execution: launcherRuntime.commandExecution,
    onWindowKeydown,
    readLauncherHotkey: context.ports.readLauncherHotkey,
    launcherHotkey: context.hotkeyBindings.launcherHotkey,
    scheduleSearchInputFocus: context.scheduleSearchInputFocus,
    onMainReady: createOnMainReady(context, launcherRuntime),
    onSettingsReady: createOnSettingsReady(context)
  });
}

export function createWindowSizingSettleNotifiers(
  windowSizing: Pick<
    ReturnType<typeof useWindowSizing>,
    | "notifySearchPageSettled"
    | "notifyCommandPageSettled"
    | "notifyFlowPanelPrepared"
    | "notifyFlowPanelHeightChange"
    | "notifyFlowPanelSettled"
  >
) {
  return {
    notifySearchPageSettled(): void {
      windowSizing.notifySearchPageSettled();
    },
    notifyCommandPageSettled(): void {
      windowSizing.notifyCommandPageSettled();
    },
    notifyFlowPanelHeightChange(): void {
      windowSizing.notifyFlowPanelHeightChange();
    },
    notifyFlowPanelPrepared(): void {
      windowSizing.notifyFlowPanelPrepared();
    },
    notifyFlowPanelSettled(): void {
      windowSizing.notifyFlowPanelSettled();
    }
  };
}
