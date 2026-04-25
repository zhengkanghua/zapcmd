import { ref, shallowRef } from "vue";
import type { Update } from "@tauri-apps/plugin-updater";
import type { UpdateFailureStage, UpdateStatus } from "../../features/update/types";
import { readRuntimePlatform } from "../../services/tauriBridge";
import { checkForUpdate, downloadAndInstall, isStagedUpdateError } from "../../services/updateService";

const INITIAL_UPDATE_STATUS: UpdateStatus = { state: "idle" };
const FALLBACK_UPDATE_ERROR = "Unknown update error.";

function toUpdateReason(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }
  return FALLBACK_UPDATE_ERROR;
}

function resolveFailureStage(error: unknown, fallbackStage: UpdateFailureStage): UpdateFailureStage {
  if (isStagedUpdateError(error)) {
    return error.stage;
  }
  return fallbackStage;
}

interface UseUpdateManagerOptions {
  readRuntimePlatform?: () => Promise<string>;
}

export function useUpdateManager(options: UseUpdateManagerOptions = {}) {
  const runtimePlatform = ref("");
  const updateStatus = ref<UpdateStatus>({ ...INITIAL_UPDATE_STATUS });
  const pendingUpdate = shallowRef<Update | null>(null);

  async function loadRuntimePlatform(): Promise<void> {
    try {
      const value = await (options.readRuntimePlatform ?? readRuntimePlatform)();
      runtimePlatform.value = typeof value === "string" ? value : "";
    } catch (error) {
      console.error("load runtime platform failed:", error);
      runtimePlatform.value = "";
    }
  }

  async function checkUpdate(): Promise<void> {
    updateStatus.value = { state: "checking" };
    try {
      const response = await checkForUpdate();
      if (!response.result.available || !response.update) {
        pendingUpdate.value = null;
        updateStatus.value = { state: "upToDate" };
        return;
      }

      pendingUpdate.value = response.update;
      updateStatus.value = {
        state: "available",
        version: response.result.version ?? "",
        body: response.result.body
      };
    } catch (error) {
      pendingUpdate.value = null;
      updateStatus.value = {
        state: "error",
        reason: toUpdateReason(error),
        stage: resolveFailureStage(error, "check")
      };
    }
  }

  async function downloadUpdate(): Promise<void> {
    if (!pendingUpdate.value) {
      return;
    }
    if (updateStatus.value.state !== "available" && updateStatus.value.state !== "error") {
      return;
    }
    if (updateStatus.value.state === "error" && updateStatus.value.stage === "check") {
      return;
    }

    const version = updateStatus.value.state === "available" ? updateStatus.value.version : updateStatus.value.version ?? "";
    updateStatus.value = { state: "downloading", progressPercent: 0, version };

    try {
      await downloadAndInstall(pendingUpdate.value, (progress) => {
        updateStatus.value = {
          state: "downloading",
          progressPercent: progress.percent,
          version
        };
      });
      updateStatus.value = { state: "installing", version };
    } catch (error) {
      updateStatus.value = {
        state: "error",
        reason: toUpdateReason(error),
        stage: resolveFailureStage(error, "download"),
        version
      };
    }
  }

  function resetUpdateStatus(): void {
    pendingUpdate.value = null;
    updateStatus.value = { ...INITIAL_UPDATE_STATUS };
  }

  return {
    runtimePlatform,
    updateStatus,
    loadRuntimePlatform,
    checkUpdate,
    downloadUpdate,
    resetUpdateStatus
  };
}
