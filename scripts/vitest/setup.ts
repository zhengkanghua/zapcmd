import { config } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { vi } from "vitest";

type MatchMediaListener = (event: MediaQueryListEvent) => void;

function createMatchMediaResult(query: string, matches: boolean): MediaQueryList {
  return {
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn((_: MatchMediaListener) => {}),
    removeListener: vi.fn((_: MatchMediaListener) => {}),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false)
  } as unknown as MediaQueryList;
}

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  writable: true,
  value: (query: string) => {
    if (query.includes("prefers-reduced-motion")) {
      return createMatchMediaResult(query, true);
    }
    return createMatchMediaResult(query, false);
  }
});

const TransitionStub = defineComponent({
  name: "VitestTransitionStub",
  setup(_, { slots }) {
    return () => slots.default?.();
  }
});

const TransitionGroupStub = defineComponent({
  name: "VitestTransitionGroupStub",
  inheritAttrs: false,
  props: {
    tag: {
      type: String,
      default: "div"
    }
  },
  setup(props, { slots, attrs }) {
    return () => h(props.tag, attrs, slots.default?.());
  }
});

config.global.stubs = {
  ...(config.global.stubs ?? {}),
  Transition: TransitionStub,
  transition: TransitionStub,
  TransitionGroup: TransitionGroupStub,
  "transition-group": TransitionGroupStub
};

const originalConsoleWarn = console.warn.bind(console);
const warnHost = globalThis as typeof globalThis & {
  __ZAPCMD_CONSOLE_WARN_SINK?: (...args: unknown[]) => void;
};

warnHost.__ZAPCMD_CONSOLE_WARN_SINK = (...args: unknown[]) => {
  originalConsoleWarn(...args);
};

console.warn = (...args: unknown[]) => {
  const [message] = args;
  if (
    typeof message === "string" &&
    message.includes("Wrong type passed as event handler to onAfterEnter")
  ) {
    return;
  }
  warnHost.__ZAPCMD_CONSOLE_WARN_SINK?.(...args);
};
