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
    "from-[rgba(var(--ui-brand-rgb),0.9)]",
    "to-[rgba(var(--ui-brand-rgb),0.82)]",
    "border-[rgba(var(--ui-brand-rgb),0.45)]",
    "text-ui-accent-text",
    "font-bold",
    "cursor-pointer",
    "enabled:hover:brightness-[1.04]"
  ],
  stage: [
    "border",
    "rounded-control",
    "bg-gradient-to-b",
    "from-[rgba(var(--ui-search-hl-rgb),0.92)]",
    "to-[rgba(var(--ui-search-hl-rgb),0.82)]",
    "border-[rgba(var(--ui-search-hl-rgb),0.5)]",
    "text-ui-accent-text",
    "font-bold",
    "cursor-pointer",
    "enabled:hover:brightness-[1.04]"
  ],
  success: [
    "border",
    "rounded-control",
    "bg-gradient-to-b",
    "from-[rgba(var(--ui-success-rgb),0.9)]",
    "to-[rgba(var(--ui-success-rgb),0.82)]",
    "border-[rgba(var(--ui-success-rgb),0.45)]",
    "text-ui-accent-text",
    "font-bold",
    "cursor-pointer",
    "enabled:hover:brightness-[1.04]"
  ],
  danger: [
    "border",
    "rounded-control",
    "bg-[rgba(var(--ui-danger-rgb),0.1)]",
    "border-[rgba(var(--ui-danger-rgb),0.2)]",
    "text-ui-danger",
    "cursor-pointer",
    "transition-all",
    "duration-150",
    "ease-[ease]",
    "enabled:hover:bg-[rgba(var(--ui-danger-rgb),0.18)]",
    "enabled:hover:border-[rgba(var(--ui-danger-rgb),0.35)]"
  ]
} satisfies Record<UiButtonVariant, ReadonlyArray<string>>;
