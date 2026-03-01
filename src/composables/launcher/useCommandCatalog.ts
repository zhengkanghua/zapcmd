import { onMounted, ref, watch, type Ref } from "vue";
import type { CommandTemplate } from "../../features/commands/types";
import type { RuntimePlatform } from "../../features/commands/runtimeTypes";
import type { AppLocale } from "../../i18n";
import {
  type CommandLoadIssue,
  loadBuiltinCommandTemplatesWithReport,
  loadUserCommandTemplatesWithReport,
  type UserCommandJsonFile
} from "../../features/commands/runtimeLoader";

function mergeCommandTemplates(
  builtinTemplates: CommandTemplate[],
  userTemplates: CommandTemplate[]
): CommandTemplate[] {
  if (userTemplates.length === 0) {
    return builtinTemplates;
  }

  const byId = new Map<string, CommandTemplate>();
  for (const template of builtinTemplates) {
    byId.set(template.id, template);
  }
  for (const template of userTemplates) {
    // User commands override builtin commands with the same id.
    byId.set(template.id, template);
  }

  const merged = builtinTemplates.map((template) => byId.get(template.id) ?? template);
  const knownIds = new Set(builtinTemplates.map((template) => template.id));
  for (const template of userTemplates) {
    if (!knownIds.has(template.id)) {
      merged.push(template);
    }
  }

  return merged;
}

function createUserFilesSignature(files: UserCommandJsonFile[]): string {
  return files
    .map((file) => `${file.path}:${file.modifiedMs}:${file.content.length}`)
    .sort()
    .join("|");
}

function normalizeRuntimePlatform(value: unknown): RuntimePlatform {
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

function readDisabledCommandIds(disabledCommandIds: Readonly<Ref<string[]>> | undefined): Set<string> {
  const values = disabledCommandIds?.value ?? [];
  const normalized = values
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return new Set(normalized);
}

function computeOverrideIds(builtinTemplates: CommandTemplate[], userTemplates: CommandTemplate[]): string[] {
  if (userTemplates.length === 0) {
    return [];
  }
  const builtinIds = new Set(builtinTemplates.map((item) => item.id));
  return userTemplates
    .map((item) => item.id)
    .filter((id, index, list) => builtinIds.has(id) && list.indexOf(id) === index);
}

function mergeCommandSourceById(
  builtinSourceById: Record<string, string>,
  userSourceById: Record<string, string>,
  mergedTemplates: CommandTemplate[]
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const template of mergedTemplates) {
    const id = template.id;
    out[id] = userSourceById[id] ?? builtinSourceById[id] ?? "";
  }
  return out;
}

interface UseCommandCatalogOptions {
  isTauriRuntime: () => boolean;
  readUserCommandFiles: () => Promise<UserCommandJsonFile[]>;
  readRuntimePlatform?: () => Promise<string>;
  disabledCommandIds?: Readonly<Ref<string[]>>;
  locale?: Readonly<Ref<AppLocale>>;
}

interface UseCommandCatalogReturn {
  commandTemplates: Ref<CommandTemplate[]>;
  allCommandTemplates: Ref<CommandTemplate[]>;
  commandSourceById: Ref<Record<string, string>>;
  userCommandSourceById: Ref<Record<string, string>>;
  overriddenCommandIds: Ref<string[]>;
  loadIssues: Ref<CommandLoadIssue[]>;
  refreshUserCommands: () => Promise<void>;
}

function bindCatalogWatchers(params: {
  options: UseCommandCatalogOptions;
  onDisabledCommandIdsChanged: () => void;
  onLocaleChanged: () => void;
}) {
  const { options, onDisabledCommandIdsChanged, onLocaleChanged } = params;

  if (options.disabledCommandIds) {
    watch(
      options.disabledCommandIds,
      () => {
        onDisabledCommandIdsChanged();
      },
      { deep: true }
    );
  }

  if (options.locale) {
    watch(
      options.locale,
      () => {
        onLocaleChanged();
      },
      { deep: false }
    );
  }
}

function bindCatalogMountedHook(params: {
  options: UseCommandCatalogOptions;
  loadBuiltinTemplatesAndSource: () => void;
  userTemplates: Ref<CommandTemplate[]>;
  userCommandSourceById: Ref<Record<string, string>>;
  loadIssues: Ref<CommandLoadIssue[]>;
  applyMergedTemplates: () => void;
  refreshUserCommands: () => Promise<void>;
}) {
  const {
    options,
    loadBuiltinTemplatesAndSource,
    userTemplates,
    userCommandSourceById,
    loadIssues,
    applyMergedTemplates,
    refreshUserCommands
  } = params;

  onMounted(async () => {
    if (!options.isTauriRuntime()) {
      loadBuiltinTemplatesAndSource();
      userTemplates.value = [];
      userCommandSourceById.value = {};
      loadIssues.value = [];
      applyMergedTemplates();
      return;
    }

    await refreshUserCommands();
  });
}

export function useCommandCatalog(options: UseCommandCatalogOptions): UseCommandCatalogReturn {
  const initialBuiltinLoaded = loadBuiltinCommandTemplatesWithReport();
  const builtinTemplates = ref<CommandTemplate[]>(initialBuiltinLoaded.templates);
  const userTemplates = ref<CommandTemplate[]>([]);
  const allCommandTemplates = ref<CommandTemplate[]>(builtinTemplates.value);
  const commandTemplates = ref<CommandTemplate[]>(builtinTemplates.value);
  const builtinCommandSourceById = ref<Record<string, string>>(initialBuiltinLoaded.sourceByCommandId);
  const commandSourceById = ref<Record<string, string>>({});
  const userCommandSourceById = ref<Record<string, string>>({});
  const overriddenCommandIds = ref<string[]>([]);
  const loadIssues = ref<CommandLoadIssue[]>([]);
  let lastSignature = "";
  let runtimePlatform: RuntimePlatform | null = null, appliedRuntimePlatform: RuntimePlatform | null = null;

  async function resolveRuntimePlatform(): Promise<void> {
    if (!options.readRuntimePlatform || !options.isTauriRuntime()) {
      return;
    }
    if (runtimePlatform !== null) {
      return;
    }

    try {
      const resolved = await options.readRuntimePlatform();
      runtimePlatform = normalizeRuntimePlatform(resolved);
    } catch (error) {
      console.warn("[commands] failed to resolve runtime platform from backend", error);
      runtimePlatform = "all";
    }
  }

  function loadBuiltinTemplatesAndSource(): void {
    const loaded = runtimePlatform
      ? loadBuiltinCommandTemplatesWithReport({
          runtimePlatform
        })
      : loadBuiltinCommandTemplatesWithReport();
    builtinTemplates.value = loaded.templates;
    builtinCommandSourceById.value = loaded.sourceByCommandId;
  }

  function applyMergedTemplates(): void {
    const merged = mergeCommandTemplates(builtinTemplates.value, userTemplates.value);
    allCommandTemplates.value = merged;
    commandSourceById.value = mergeCommandSourceById(
      builtinCommandSourceById.value,
      userCommandSourceById.value,
      merged
    );
    overriddenCommandIds.value = computeOverrideIds(builtinTemplates.value, userTemplates.value);
    const disabledIds = readDisabledCommandIds(options.disabledCommandIds);
    if (disabledIds.size === 0) {
      commandTemplates.value = merged;
      return;
    }

    commandTemplates.value = merged.filter((item) => !disabledIds.has(item.id));
  }

  async function refreshUserCommands(): Promise<void> {
    if (!options.isTauriRuntime()) {
      applyMergedTemplates();
      return;
    }

    try {
      await resolveRuntimePlatform();

      const files = await options.readUserCommandFiles();
      if (!Array.isArray(files)) {
        return;
      }

      const currentPlatform = runtimePlatform ?? null;
      const signature = createUserFilesSignature(files);
      const platformChanged = currentPlatform !== appliedRuntimePlatform;
      if (signature === lastSignature && !platformChanged) {
        return;
      }

      loadBuiltinTemplatesAndSource();
      const userLoaded = loadUserCommandTemplatesWithReport(
        files,
        runtimePlatform ? { runtimePlatform } : {}
      );
      userTemplates.value = userLoaded.templates;
      userCommandSourceById.value = userLoaded.sourceByCommandId;
      loadIssues.value = userLoaded.issues;
      applyMergedTemplates();
      lastSignature = signature;
      appliedRuntimePlatform = currentPlatform;
    } catch (error) {
      console.warn("[commands] failed to refresh user command files", error);
    }
  }

  applyMergedTemplates();
  bindCatalogWatchers({
    options,
    onDisabledCommandIdsChanged: () => {
      applyMergedTemplates();
    },
    onLocaleChanged: () => {
      lastSignature = "";
      if (!options.isTauriRuntime()) {
        loadBuiltinTemplatesAndSource();
        applyMergedTemplates();
        return;
      }
      void refreshUserCommands();
    }
  });
  bindCatalogMountedHook({
    options,
    loadBuiltinTemplatesAndSource,
    userTemplates,
    userCommandSourceById,
    loadIssues,
    applyMergedTemplates,
    refreshUserCommands
  });

  return {
    commandTemplates,
    allCommandTemplates,
    commandSourceById,
    userCommandSourceById,
    overriddenCommandIds,
    loadIssues,
    refreshUserCommands
  };
}
