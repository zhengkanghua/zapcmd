export type DropdownKeyAction =
  | { type: "open"; initialIndex: number }
  | { type: "close" }
  | { type: "focus"; nextIndex: number }
  | { type: "select" }
  | { type: "noop" };

interface ResolveDropdownKeyActionInput {
  key: string;
  open: boolean;
  selectedIndex: number;
  focusIndex: number;
  optionCount: number;
}

function clampIndex(index: number, optionCount: number): number {
  return Math.min(Math.max(index, 0), optionCount - 1);
}

export function resolveDropdownKeyAction(
  input: ResolveDropdownKeyActionInput
): DropdownKeyAction {
  if (input.optionCount <= 0) {
    return { type: "noop" };
  }

  if (!input.open) {
    if (input.key === "ArrowDown") {
      return {
        type: "open",
        initialIndex: clampIndex(
          input.selectedIndex >= 0 ? input.selectedIndex + 1 : 0,
          input.optionCount
        )
      };
    }
    if (input.key === "ArrowUp") {
      return {
        type: "open",
        initialIndex: input.optionCount - 1
      };
    }
    if (input.key === "Enter" || input.key === " ") {
      return {
        type: "open",
        initialIndex: input.selectedIndex >= 0 ? input.selectedIndex : 0
      };
    }
    return { type: "noop" };
  }

  if (input.key === "Escape" || input.key === "Tab") {
    return { type: "close" };
  }
  if (input.key === "ArrowDown") {
    return {
      type: "focus",
      nextIndex: clampIndex(input.focusIndex + 1, input.optionCount)
    };
  }
  if (input.key === "ArrowUp") {
    return {
      type: "focus",
      nextIndex: clampIndex(input.focusIndex - 1, input.optionCount)
    };
  }
  if (input.key === "Home") {
    return { type: "focus", nextIndex: 0 };
  }
  if (input.key === "End") {
    return { type: "focus", nextIndex: input.optionCount - 1 };
  }
  if (input.key === "Enter" || input.key === " ") {
    return { type: "select" };
  }

  return { type: "noop" };
}
