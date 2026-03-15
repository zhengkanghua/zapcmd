export const DANGER_DISMISS_STORAGE_KEY = "zapcmd:danger-dismiss";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

type DangerDismissMap = Record<string, number>;

function readDismissals(): DangerDismissMap {
  try {
    const raw = localStorage.getItem(DANGER_DISMISS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as DangerDismissMap;
  } catch {
    return {};
  }
}

function writeDismissals(map: DangerDismissMap): void {
  localStorage.setItem(DANGER_DISMISS_STORAGE_KEY, JSON.stringify(map));
}

export function isDangerDismissed(commandId: string): boolean {
  const map = readDismissals();
  const timestamp = map[commandId];
  if (timestamp === undefined) return false;
  return Date.now() - timestamp < TWENTY_FOUR_HOURS_MS;
}

export function dismissDanger(commandId: string): void {
  const map = readDismissals();
  map[commandId] = Date.now();
  writeDismissals(map);
}

export function cleanExpiredDismissals(): void {
  const map = readDismissals();
  const now = Date.now();
  const cleaned: DangerDismissMap = {};
  for (const [id, timestamp] of Object.entries(map)) {
    if (now - timestamp < TWENTY_FOUR_HOURS_MS) {
      cleaned[id] = timestamp;
    }
  }
  writeDismissals(cleaned);
}

