import { describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  mockContext: { contextId: "context" },
  mockRuntime: { runtimeId: "runtime" },
  mockViewModel: { vmId: "view-model" },
  createAppCompositionContext: vi.fn(),
  createAppCompositionRuntime: vi.fn(),
  createAppCompositionViewModel: vi.fn()
}));

vi.mock("../../app/useAppCompositionRoot/context", () => ({
  createAppCompositionContext: mockState.createAppCompositionContext
}));

vi.mock("../../app/useAppCompositionRoot/runtime", () => ({
  createAppCompositionRuntime: mockState.createAppCompositionRuntime
}));

vi.mock("../../app/useAppCompositionRoot/viewModel", () => ({
  createAppCompositionViewModel: mockState.createAppCompositionViewModel
}));

import { useAppCompositionRoot } from "../../app/useAppCompositionRoot";

describe("useAppCompositionRoot", () => {
  it("按 context -> runtime -> viewModel 顺序完成装配", () => {
    const ports = { isTauriRuntime: () => false };
    mockState.createAppCompositionContext.mockReturnValue(mockState.mockContext);
    mockState.createAppCompositionRuntime.mockReturnValue(mockState.mockRuntime);
    mockState.createAppCompositionViewModel.mockReturnValue(mockState.mockViewModel);

    const viewModel = useAppCompositionRoot({ ports });

    expect(mockState.createAppCompositionContext).toHaveBeenCalledWith({ ports });
    expect(mockState.createAppCompositionRuntime).toHaveBeenCalledWith(mockState.mockContext);
    expect(mockState.createAppCompositionViewModel).toHaveBeenCalledWith(
      mockState.mockContext,
      mockState.mockRuntime
    );
    expect(viewModel).toBe(mockState.mockViewModel);
  });
});
