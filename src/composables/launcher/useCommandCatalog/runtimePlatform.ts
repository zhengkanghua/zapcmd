import type { Ref } from "vue";
import {
  loadBuiltinCommandTemplatesWithReport,
  loadCommandTemplatesFromPayloadEntries,
  type CommandLoadIssue
} from "../../../features/commands/runtimeLoader";
import type { CommandTemplate } from "../../../features/commands/types";
import type { RuntimePlatform } from "../../../features/commands/runtimeTypes";
import type { UseCommandCatalogOptions } from "./types";

export function normalizeRuntimePlatform(value: unknown): RuntimePlatform {
  if (typeof value !== "string") {
    return "all";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "win" || normalized === "windows") {
    return "win";
  }
  if (normalized === "mac" || normalized === "macos" || normalized === "darwin") {
    return "mac";
  }
  if (normalized === "linux") {
    return "linux";
  }
  return "all";
}

export function loadBuiltinTemplatesAndSourceForState(params: {
  builtinTemplates: Ref<CommandTemplate[]>;
  builtinCommandSourceById: Ref<Record<string, string>>;
  runtimePlatform: RuntimePlatform | null;
}): void {
  const loaded = params.runtimePlatform
    ? loadBuiltinCommandTemplatesWithReport({
        runtimePlatform: params.runtimePlatform
      })
    : loadBuiltinCommandTemplatesWithReport();
  params.builtinTemplates.value = loaded.templates;
  params.builtinCommandSourceById.value = loaded.sourceByCommandId;
}

export function applyUserTemplatesFromPayload(params: {
  payloadEntries: Array<{ sourceId: string; payload: unknown }>;
  sourceIssues: CommandLoadIssue[];
  runtimePlatform: RuntimePlatform | null;
  userTemplates: Ref<CommandTemplate[]>;
  userCommandSourceById: Ref<Record<string, string>>;
  loadIssues: Ref<CommandLoadIssue[]>;
  applyMergedTemplates: () => void;
}): void {
  const loaded = loadCommandTemplatesFromPayloadEntries(
    params.payloadEntries,
    params.runtimePlatform ? { runtimePlatform: params.runtimePlatform } : {}
  );
  params.userTemplates.value = loaded.templates;
  params.userCommandSourceById.value = loaded.sourceByCommandId;
  params.loadIssues.value = [...params.sourceIssues, ...loaded.issues];
  params.applyMergedTemplates();
}

export async function resolveRuntimePlatformOnce(params: {
  options: UseCommandCatalogOptions;
  getRuntimePlatform: () => RuntimePlatform | null;
  setRuntimePlatform: (value: RuntimePlatform) => void;
}): Promise<void> {
  if (!params.options.readRuntimePlatform || !params.options.isTauriRuntime()) {
    return;
  }
  if (params.getRuntimePlatform() !== null) {
    return;
  }
  try {
    const resolved = await params.options.readRuntimePlatform();
    params.setRuntimePlatform(normalizeRuntimePlatform(resolved));
  } catch (error) {
    console.warn("[commands] failed to resolve runtime platform from backend", error);
    params.setRuntimePlatform("all");
  }
}
