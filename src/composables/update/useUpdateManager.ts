import { ref, shallowRef } from "vue";
import type { Update } from "@tauri-apps/plugin-updater";
import type { UpdateStatus } from "../../features/update/types";
import { readRuntimePlatform } from "../../services/tauriBridge";
import { checkForUpdate, downloadAndInstall } from "../../services/updateService";

const INITIAL_UPDATE_STATUS: UpdateStatus = { state: "idle" };

export function useUpdateManager() {
  const runtimePlatform = ref("");
  const updateStatus = ref<UpdateStatus>({ ...INITIAL_UPDATE_STATUS });
  const pendingUpdate = shallowRef<Update | null>(null);

  async function loadRuntimePlatform(): Promise<void> {
    try {
      const value = await readRuntimePlatform();
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
      const reason = error instanceof Error ? error.message : String(error);
      updateStatus.value = { state: "error", reason };
    }
  }

  async function downloadUpdate(): Promise<void> {
    if (!pendingUpdate.value || updateStatus.value.state !== "available") {
      return;
    }

    const version = updateStatus.value.version;
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
      const reason = error instanceof Error ? error.message : String(error);
      updateStatus.value = { state: "error", reason };
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
