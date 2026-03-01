export function createAppWindowResolver<TWindow>(getCurrentWindowFn: () => TWindow): () => TWindow | null {
  let hasWarned = false;
  return () => {
    try {
      return getCurrentWindowFn();
    } catch (error) {
      if (!hasWarned) {
        hasWarned = true;
        console.warn("resolve app window failed", error);
      }
      return null;
    }
  };
}
