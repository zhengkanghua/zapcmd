import type { DropdownVariant } from "./dropdownTypes";

interface ResolveDropdownPanelStyleInput {
  triggerRect: DOMRect;
  variant: DropdownVariant;
}

export function resolveDropdownPanelStyle(
  input: ResolveDropdownPanelStyleInput
): Record<string, string> {
  const minWidth =
    input.variant === "ghost"
      ? Math.max(Math.round(input.triggerRect.width), 160)
      : Math.round(input.triggerRect.width);

  return {
    position: "fixed",
    top: `${Math.round(input.triggerRect.bottom + 6)}px`,
    left: `${Math.round(input.triggerRect.left)}px`,
    minWidth: `${minWidth}px`,
    zIndex: "var(--ui-settings-z-popover)"
  };
}
