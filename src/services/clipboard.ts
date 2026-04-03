/** 最小平台封装：统一复制命令文本，缺失 Clipboard API 时显式失败。 */
export async function copyTextToClipboard(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error("clipboard API unavailable");
  }
  await navigator.clipboard.writeText(text);
}
