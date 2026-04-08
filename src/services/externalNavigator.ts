export type ExternalTargetOpenCode = "opened" | "missing-url" | "open-failed";

export interface ExternalTargetOpenResult {
  ok: boolean;
  code: ExternalTargetOpenCode;
  message: string;
  url?: string;
}

export interface OpenExternalTargetOptions {
  url: string | null;
  targetName: string;
  openExternalUrl: (url: string) => Promise<void>;
  logError: (message: string, payload?: unknown) => void;
}

/**
 * 统一收口外部跳转能力，避免调用方直接处理裸异常。
 */
export async function openExternalTarget(
  options: OpenExternalTargetOptions
): Promise<ExternalTargetOpenResult> {
  if (!options.url) {
    const message = `${options.targetName} url is not configured`;
    options.logError(message);
    return {
      ok: false,
      code: "missing-url",
      message
    };
  }

  try {
    await options.openExternalUrl(options.url);
    return {
      ok: true,
      code: "opened",
      message: `${options.targetName} opened`,
      url: options.url
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    options.logError(`${options.targetName} open failed`, error);
    return {
      ok: false,
      code: "open-failed",
      message,
      url: options.url
    };
  }
}
