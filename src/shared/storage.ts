export interface SafeStorageLike {
  getItem(key: string): string | null;
  setItem?(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface SafeStorageReadResult {
  ok: boolean;
  value: string | null;
}

/**
 * 统一收口浏览器 storage 的可用性探测，避免 getter 级异常打断启动链。
 * @param resolver 延迟解析 storage，兼容 window.localStorage getter 抛错场景。
 * @param warningMessage 失败时输出的告警文案。
 * @returns 可用的 storage；不可用时返回 null。
 */
export function resolveSafeStorage<TStorage extends SafeStorageLike>(
  resolver: () => TStorage | null,
  warningMessage: string
): TStorage | null {
  try {
    return resolver();
  } catch (error) {
    console.warn(warningMessage, error);
    return null;
  }
}

/**
 * 安全读取 storage key；读失败时返回 null。
 * @param storage 目标 storage。
 * @param key 读取 key。
 * @param warningMessage 失败时输出的告警文案。
 * @returns 成功读取的值；失败或不存在时返回 null。
 */
export function safeGetStorageItem(
  storage: Pick<SafeStorageLike, "getItem"> | null,
  key: string,
  warningMessage: string
): string | null {
  return readStorageItemSafely(storage, key, warningMessage).value;
}

/**
 * 安全读取 storage key，并暴露是否读取成功，便于调用方区分“不存在”和“读取失败”。
 * @param storage 目标 storage。
 * @param key 读取 key。
 * @param warningMessage 失败时输出的告警文案。
 * @returns `{ ok, value }`；`ok=false` 表示读取时抛错。
 */
export function readStorageItemSafely(
  storage: Pick<SafeStorageLike, "getItem"> | null,
  key: string,
  warningMessage: string
): SafeStorageReadResult {
  if (!storage) {
    return { ok: true, value: null };
  }

  try {
    return {
      ok: true,
      value: storage.getItem(key)
    };
  } catch (error) {
    console.warn(warningMessage, error);
    return {
      ok: false,
      value: null
    };
  }
}

/**
 * 安全写入 storage key；失败时把错误交给调用方决定是否继续上抛。
 * @param storage 目标 storage。
 * @param key 写入 key。
 * @param value 写入值。
 */
export function setStorageItem(
  storage: Pick<SafeStorageLike, "setItem"> | null,
  key: string,
  value: string
): void {
  storage?.setItem?.(key, value);
}

/**
 * 安全删除 storage key；失败时仅记录告警，避免坏数据清理再次打断主流程。
 * @param storage 目标 storage。
 * @param key 删除 key。
 * @param warningMessage 失败时输出的告警文案。
 */
export function safeRemoveStorageItem(
  storage: Pick<SafeStorageLike, "removeItem"> | null,
  key: string,
  warningMessage: string
): void {
  if (!storage?.removeItem) {
    return;
  }

  try {
    storage.removeItem(key);
  } catch (error) {
    console.warn(warningMessage, error);
  }
}
