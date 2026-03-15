import { ref, computed, type Ref, type ComputedRef, type InjectionKey } from "vue";
import type { CommandTemplate } from "@/features/commands/types";

export type NavPageType = "search" | "command-action";

export interface NavPage {
  type: NavPageType;
  props?: {
    command?: CommandTemplate;
    mode?: "execute" | "stage";
    isDangerous?: boolean;
  };
}

export interface LauncherNavStack {
  stack: Ref<NavPage[]>;
  currentPage: ComputedRef<NavPage>;
  canGoBack: ComputedRef<boolean>;
  pushPage: (page: NavPage) => void;
  popPage: () => void;
  resetToSearch: () => void;
}

export const LAUNCHER_NAV_STACK_KEY: InjectionKey<LauncherNavStack> =
  Symbol("launcherNavStack");

const SEARCH_PAGE: NavPage = { type: "search" };

export function useLauncherNavStack(): LauncherNavStack {
  const stack = ref<NavPage[]>([SEARCH_PAGE]);

  const currentPage = computed(() => stack.value[stack.value.length - 1]);
  const canGoBack = computed(() => stack.value.length > 1);

  function pushPage(page: NavPage): void {
    stack.value = [...stack.value, page];
  }

  function popPage(): void {
    if (stack.value.length <= 1) return;
    stack.value = stack.value.slice(0, -1);
  }

  function resetToSearch(): void {
    stack.value = [SEARCH_PAGE];
  }

  return { stack, currentPage, canGoBack, pushPage, popPage, resetToSearch };
}

