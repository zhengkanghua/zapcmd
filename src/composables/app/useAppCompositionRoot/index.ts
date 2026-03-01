import { createAppCompositionContext } from "./context";
import { createAppCompositionRuntime } from "./runtime";
import { createAppCompositionViewModel } from "./viewModel";

export function useAppCompositionRoot() {
  const context = createAppCompositionContext();
  const runtime = createAppCompositionRuntime(context);
  return createAppCompositionViewModel(context, runtime);
}
