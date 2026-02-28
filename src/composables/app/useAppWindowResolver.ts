export function createAppWindowResolver<TWindow>(getCurrentWindowFn: () => TWindow): () => TWindow | null {
  return () => {
    try {
      return getCurrentWindowFn();
    } catch {
      return null;
    }
  };
}
