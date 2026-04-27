import type { TerminalOption } from "./fallbackTerminals";

export interface LoadedTerminalOptions {
  terminals: TerminalOption[];
  trusted: boolean;
}

export interface LoadTerminalOptionsParams {
  isTauriRuntime: boolean;
  fallbackTerminals: TerminalOption[];
  readDetectedTerminals: () => Promise<TerminalOption[]>;
}

/**
 * 统一终端列表加载语义：
 * - fallback 仅用于展示/兜底，不代表真实探测结果
 * - 只有后端返回非空列表时，结果才算 trusted
 */
export async function loadTerminalOptions(
  params: LoadTerminalOptionsParams
): Promise<LoadedTerminalOptions> {
  if (!params.isTauriRuntime) {
    return {
      terminals: params.fallbackTerminals,
      trusted: false
    };
  }

  const detected = await params.readDetectedTerminals();
  const trusted = Array.isArray(detected) && detected.length > 0;

  return {
    terminals: trusted ? detected : params.fallbackTerminals,
    trusted
  };
}
