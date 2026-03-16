import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  isDangerDismissed,
  dismissDanger,
  cleanExpiredDismissals,
  DANGER_DISMISS_STORAGE_KEY,
} from "../dangerDismiss";

describe("dangerDismiss", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("未记录的命令返回 false", () => {
    expect(isDangerDismissed("cmd-1")).toBe(false);
  });

  it("记录后返回 true", () => {
    dismissDanger("cmd-1");
    expect(isDangerDismissed("cmd-1")).toBe(true);
  });

  it("不同命令独立记录", () => {
    dismissDanger("cmd-1");
    expect(isDangerDismissed("cmd-2")).toBe(false);
  });

  it("超过 24h 后返回 false", () => {
    dismissDanger("cmd-1");
    // 模拟 25 小时后
    const stored = JSON.parse(
      localStorage.getItem(DANGER_DISMISS_STORAGE_KEY)!
    );
    stored["cmd-1"] = Date.now() - 25 * 60 * 60 * 1000;
    localStorage.setItem(DANGER_DISMISS_STORAGE_KEY, JSON.stringify(stored));
    expect(isDangerDismissed("cmd-1")).toBe(false);
    // 读取时会自动清理过期记录
    const cleaned = JSON.parse(localStorage.getItem(DANGER_DISMISS_STORAGE_KEY) ?? "{}");
    expect(cleaned["cmd-1"]).toBeUndefined();
  });

  it("cleanExpiredDismissals 清理过期记录", () => {
    dismissDanger("cmd-1");
    dismissDanger("cmd-2");
    // cmd-1 过期，cmd-2 未过期
    const stored = JSON.parse(
      localStorage.getItem(DANGER_DISMISS_STORAGE_KEY)!
    );
    stored["cmd-1"] = Date.now() - 25 * 60 * 60 * 1000;
    localStorage.setItem(DANGER_DISMISS_STORAGE_KEY, JSON.stringify(stored));
    cleanExpiredDismissals();
    const result = JSON.parse(
      localStorage.getItem(DANGER_DISMISS_STORAGE_KEY)!
    );
    expect(result["cmd-1"]).toBeUndefined();
    expect(result["cmd-2"]).toBeDefined();
  });

  it("localStorage 格式异常时安全降级", () => {
    localStorage.setItem(DANGER_DISMISS_STORAGE_KEY, "not-json");
    expect(isDangerDismissed("cmd-1")).toBe(false);
    // 写入后应恢复正常
    dismissDanger("cmd-1");
    expect(isDangerDismissed("cmd-1")).toBe(true);
  });

  it("localStorage 值为 null 时安全处理", () => {
    expect(isDangerDismissed("cmd-1")).toBe(false);
  });
});

