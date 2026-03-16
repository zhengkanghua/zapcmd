export const DANGER_DISMISS_STORAGE_KEY = "zapcmd:danger-dismiss";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

type DangerDismissMap = Record<string, number>;

function readDismissals(): DangerDismissMap {
  try {
    const raw = localStorage.getItem(DANGER_DISMISS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      localStorage.removeItem(DANGER_DISMISS_STORAGE_KEY);
      return {};
    }

    const now = Date.now();
    let changed = false;
    const cleaned: DangerDismissMap = {};

    for (const [id, timestamp] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
        changed = true;
        continue;
      }
      if (now - timestamp >= TWENTY_FOUR_HOURS_MS) {
        changed = true;
        continue;
      }
      cleaned[id] = timestamp;
    }

    if (changed) {
      writeDismissals(cleaned);
    }

    return cleaned;
  } catch {
    try {
      localStorage.removeItem(DANGER_DISMISS_STORAGE_KEY);
    } catch {
      // 忽略
    }
    return {};
  }
}

function writeDismissals(map: DangerDismissMap): void {
  try {
    localStorage.setItem(DANGER_DISMISS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // 忽略
  }
}

export function isDangerDismissed(commandId: string): boolean {
  const map = readDismissals();
  return map[commandId] !== undefined;
}

export function dismissDanger(commandId: string): void {
  const map = readDismissals();
  map[commandId] = Date.now();
  writeDismissals(map);
}

export function cleanExpiredDismissals(): void {
  void readDismissals();
}
