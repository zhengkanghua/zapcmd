/**
 * 共享按钮原语：Tailwind class 枚举表。
 *
 * 设计目标：
 * - Tailwind class 必须可静态分析：只使用字符串字面量，避免运行时拼接导致 content 扫描漏抓。
 * - 统一 disabled 视觉语义：所有 variant 都附带同一组 disabled:* classes。
 */

export type UiButtonVariant = "muted" | "primary" | "stage" | "success" | "danger";
export type UiButtonSize = "default" | "small";

export const uiButtonDisabledClasses = [
  "disabled:opacity-[0.56]",
  "disabled:cursor-default"
] as const;

export const uiButtonVariantBaseClasses = {
  muted: [
    "border",
    "border-transparent",
    "rounded-control",
    "bg-ui-bg-soft",
    "text-ui-text",
    "cursor-pointer",
    "enabled:hover:bg-[var(--ui-control-muted-hover-bg)]",
    "enabled:hover:border-[var(--ui-control-muted-hover-border)]"
  ],
  primary: [
    "border",
    "rounded-control",
    "bg-gradient-to-b",
    "from-ui-brand/90",
    "to-ui-brand/82",
    "border-ui-brand/45",
    "text-ui-accent-text",
    "font-bold",
    "cursor-pointer",
    "enabled:hover:brightness-[1.04]"
  ],
  stage: [
    "border",
    "rounded-control",
    "bg-gradient-to-b",
    "from-ui-search-hl/92",
    "to-ui-search-hl/82",
    "border-ui-search-hl/50",
    "text-ui-accent-text",
    "font-bold",
    "cursor-pointer",
    "enabled:hover:brightness-[1.04]"
  ],
  success: [
    "border",
    "rounded-control",
    "bg-gradient-to-b",
    "from-ui-success/90",
    "to-ui-success/82",
    "border-ui-success/45",
    "text-ui-accent-text",
    "font-bold",
    "cursor-pointer",
    "enabled:hover:brightness-[1.04]"
  ],
  danger: [
    "border",
    "rounded-control",
    "bg-ui-danger/10",
    "border-ui-danger/20",
    "text-ui-danger",
    "cursor-pointer",
    "transition-all",
    "duration-150",
    "ease-[ease]",
    "enabled:hover:bg-ui-danger/18",
    "enabled:hover:border-ui-danger/35"
  ]
} satisfies Record<UiButtonVariant, ReadonlyArray<string>>;
