import { checkForUpdate } from "./updateService";

export const LAST_UPDATE_CHECK_STORAGE_KEY = "zapcmd.lastUpdateCheck";

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

export const AUTO_UPDATE_CHECK_INTERVAL_MS =
  HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;

export interface StartupUpdateCheckResult {
  checked: boolean;
  available: boolean;
  version?: string;
  body?: string;
}

function readTimestamp(value: string | null): number {
  if (!value) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function shouldCheck(lastCheckedAtMs: number, nowMs: number, intervalMs: number): boolean {
  if (!Number.isFinite(nowMs) || nowMs <= 0) {
    return false;
  }
  if (!Number.isFinite(lastCheckedAtMs) || lastCheckedAtMs <= 0) {
    return true;
  }
  return nowMs - lastCheckedAtMs >= intervalMs;
}

export async function maybeCheckForUpdateAtStartup(options: {
  enabled: boolean;
  storage: Storage | null;
  nowMs?: number;
  intervalMs?: number;
}): Promise<StartupUpdateCheckResult> {
  if (!options.enabled || !options.storage) {
    return { checked: false, available: false };
  }

  const nowMs = options.nowMs ?? Date.now();
  const intervalMs = options.intervalMs ?? AUTO_UPDATE_CHECK_INTERVAL_MS;
  const lastCheckedAtMs = readTimestamp(options.storage.getItem(LAST_UPDATE_CHECK_STORAGE_KEY));

  if (!shouldCheck(lastCheckedAtMs, nowMs, intervalMs)) {
    return { checked: false, available: false };
  }

  try {
    const response = await checkForUpdate();
    try {
      options.storage.setItem(LAST_UPDATE_CHECK_STORAGE_KEY, String(nowMs));
    } catch (error) {
      console.warn("startup update check timestamp write failed:", error);
    }
    return {
      checked: true,
      available: response.result.available,
      version: response.result.version,
      body: response.result.body
    };
  } catch (error) {
    console.error("startup update check failed:", error);
    return { checked: true, available: false };
  }
}

