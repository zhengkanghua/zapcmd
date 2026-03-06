import { createAppCompositionContext } from "./context";
import { createAppCompositionRuntime } from "./runtime";
import { createAppCompositionViewModel } from "./viewModel";
import type { AppCompositionRootPorts } from "./ports";

export interface UseAppCompositionRootOptions {
  ports?: Partial<AppCompositionRootPorts>;
}

export function useAppCompositionRoot(options: UseAppCompositionRootOptions = {}) {
  const context = createAppCompositionContext({
    ports: options.ports
  });
  const runtime = createAppCompositionRuntime(context);
  return createAppCompositionViewModel(context, runtime);
}
