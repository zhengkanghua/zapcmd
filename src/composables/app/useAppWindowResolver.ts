interface CreateAppWindowResolverOptions {
  suppressWarning?: boolean;
}

export function createAppWindowResolver<TWindow>(
  getCurrentWindowFn: () => TWindow,
  options: CreateAppWindowResolverOptions = {}
): () => TWindow | null {
  let hasWarned = false;
  return () => {
    try {
      return getCurrentWindowFn();
    } catch (error) {
      if (!hasWarned && options.suppressWarning !== true) {
        hasWarned = true;
        console.warn("resolve app window failed", error);
      }
      return null;
    }
  };
}
