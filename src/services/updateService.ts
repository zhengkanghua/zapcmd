import { isTauri } from "@tauri-apps/api/core";
import { check, type Update } from "@tauri-apps/plugin-updater";

export interface UpdateCheckResult {
  available: boolean;
  version?: string;
  body?: string;
}

export interface UpdateDownloadProgress {
  percent: number;
  downloadedBytes: number;
  totalBytes: number | null;
}

export type UpdateDownloadProgressCallback = (progress: UpdateDownloadProgress) => void;

export interface CheckForUpdateResponse {
  result: UpdateCheckResult;
  update: Update | null;
}

const MAX_PROGRESS_PERCENT = 100;

function resolveUpdateBody(update: Update): string | undefined {
  if (typeof update.body === "string") {
    return update.body.trim() || undefined;
  }
  if (update.body == null) {
    return undefined;
  }
  return String(update.body);
}

export async function checkForUpdate(): Promise<CheckForUpdateResponse> {
  if (!isTauri()) {
    return { result: { available: false }, update: null };
  }

  const update = await check();
  if (!update || !update.available) {
    return { result: { available: false }, update: update ?? null };
  }

  const version = typeof update.version === "string" ? update.version : "";
  return {
    result: {
      available: true,
      version: version.trim() || undefined,
      body: resolveUpdateBody(update)
    },
    update
  };
}

function resolveContentLength(data: { contentLength?: number }): number | null {
  const lengthValue = data.contentLength;
  return typeof lengthValue === "number" && Number.isFinite(lengthValue) && lengthValue > 0
    ? lengthValue
    : null;
}

function resolveChunkLength(data: { chunkLength: number }): number | null {
  const chunkValue = data.chunkLength;
  return typeof chunkValue === "number" && Number.isFinite(chunkValue) && chunkValue > 0
    ? chunkValue
    : null;
}

function toProgressEvent(downloadedBytes: number, totalBytes: number | null): UpdateDownloadProgress {
  const percent =
    totalBytes && totalBytes > 0
      ? Math.min(
          MAX_PROGRESS_PERCENT,
          Math.round((downloadedBytes / totalBytes) * MAX_PROGRESS_PERCENT)
        )
      : 0;
  return { percent, downloadedBytes, totalBytes };
}

export async function downloadAndInstall(
  update: Update,
  onProgress?: UpdateDownloadProgressCallback
): Promise<void> {
  if (!isTauri()) {
    throw new Error("Updater is only available in Tauri runtime.");
  }

  let downloadedBytes = 0;
  let totalBytes: number | null = null;

  await update.downloadAndInstall((event) => {
    if (!onProgress) {
      return;
    }

    switch (event.event) {
      case "Started": {
        totalBytes = resolveContentLength(event.data);
        onProgress(toProgressEvent(downloadedBytes, totalBytes));
        return;
      }
      case "Progress": {
        const chunkLength = resolveChunkLength(event.data);
        if (chunkLength) {
          downloadedBytes += chunkLength;
        }
        onProgress(toProgressEvent(downloadedBytes, totalBytes));
        return;
      }
      case "Finished": {
        if (totalBytes) {
          downloadedBytes = totalBytes;
        }
        onProgress(toProgressEvent(downloadedBytes, totalBytes));
        return;
      }
    }
  });
}
