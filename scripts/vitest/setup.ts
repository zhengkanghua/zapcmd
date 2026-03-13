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

