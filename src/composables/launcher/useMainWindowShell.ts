import type { Ref } from "vue";

interface AppWindowLike {
  close(): Promise<void> | void;
  hide(): Promise<void> | void;
}

interface UseMainWindowShellOptions {
  isSettingsWindow: Ref<boolean>;
  cancelHotkeyRecording: () => void;
  resolveAppWindow: () => AppWindowLike | null;
  isTauriRuntime: () => boolean;
  requestHideMainWindow: () => Promise<void>;
  pendingCommand: Ref<unknown>;
  cancelParamInput: () => void;
  safetyDialog: Ref<unknown>;
  cancelSafetyExecution: () => void;
  query: Ref<string>;
  stagingExpanded: Ref<boolean>;
  closeStagingDrawer: () => void;
}

export function isTypingElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

export function useMainWindowShell(options: UseMainWindowShellOptions) {
  function closeSettingsWindow(): void {
    if (!options.isSettingsWindow.value) {
      return;
    }
    options.cancelHotkeyRecording();
    const appWindow = options.resolveAppWindow();
    if (appWindow) {
      void Promise.resolve(appWindow.close()).catch((error) => {
        console.warn("close settings window failed", error);
      });
    }
  }

  async function hideMainWindow(): Promise<void> {
    if (options.isTauriRuntime()) {
      try {
        await options.requestHideMainWindow();
        return;
      } catch (error) {
        console.warn("hide_main_window invoke failed; falling back to webview api", error);
      }
    }

    const appWindow = options.resolveAppWindow();
    if (appWindow) {
      await appWindow.hide();
    }
  }

  function handleMainEscape(): void {
    if (options.safetyDialog.value) {
      options.cancelSafetyExecution();
      return;
    }
    if (options.pendingCommand.value) {
      options.cancelParamInput();
      return;
    }
    if (options.stagingExpanded.value) {
      options.closeStagingDrawer();
      return;
    }
    if (options.query.value.trim().length > 0) {
      options.query.value = "";
      return;
    }
    void hideMainWindow();
  }

  return {
    closeSettingsWindow,
    hideMainWindow,
    handleMainEscape
  };
}
