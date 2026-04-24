import { createPinia } from "pinia";
import { mount } from "@vue/test-utils";
import { defineComponent } from "vue";
import { describe, expect, it, vi } from "vitest";

import { createAppCompositionContext } from "../../app/useAppCompositionRoot/context";
import { createAppCompositionRootPorts } from "../../app/useAppCompositionRoot/ports";

type AppPorts = ReturnType<typeof createAppCompositionRootPorts>;

function createPortsStub() {
  return createAppCompositionRootPorts({
    isTauriRuntime: () => false,
    getCurrentWindow: vi.fn(
      () =>
        ({
          label: "main"
        }) as unknown as ReturnType<AppPorts["getCurrentWindow"]>
    ),
    openExternalUrl: vi.fn(async () => undefined),
    logError: vi.fn(),
    logWarn: vi.fn()
  });
}

describe("createAppCompositionContext", () => {
  it("creates launcher runtime dependencies from a reusable shared assembly", () => {
    let context: ReturnType<typeof createAppCompositionContext> | undefined;

    const Harness = defineComponent({
      setup() {
        context = createAppCompositionContext({
          ports: createPortsStub()
        });

        return () => null;
      }
    });

    mount(Harness, {
      global: {
        plugins: [createPinia()]
      }
    });

    const resolved = context;
    expect(resolved).toBeDefined();
    expect(resolved?.search).toBeDefined();
    expect(resolved?.domBridge).toBeDefined();
    expect(resolved?.stagedFeedback).toBeDefined();
    expect(resolved?.scheduleSearchInputFocus).toBeTypeOf("function");
    expect(resolved?.runCommandInTerminal).toBeTypeOf("function");
    expect(resolved?.runCommandsInTerminal).toBeTypeOf("function");
  });
});
