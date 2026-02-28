import { createWindowSizingController } from "./controller";
import type { UseWindowSizingOptions } from "./model";

export function useWindowSizing(options: UseWindowSizingOptions) {
  return createWindowSizingController(options);
}

export type {
  AppWindowLike,
  UseWindowSizingOptions,
  WindowSize,
  WindowSizingConstants
} from "./model";
