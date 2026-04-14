import { onMounted, ref, watch, type Ref } from "vue";
import type { CommandTemplate } from "../../features/commands/types";
import type { RuntimePlatform } from "../../features/commands/runtimeTypes";
import { setAppLocale, type AppLocale } from "../../i18n";
import {
  createScanFailedIssue,
  type CommandLoadIssue,
  loadCommandTemplatesFromPayloadEntries,
  loadBuiltinCommandTemplatesWithReport,
  createReadFailedIssue
} from "../../features/commands/runtimeLoader";
import { createUserCommandSourceCache } from "../../features/commands/userCommandSourceCache";
import type {
  UserCommandFileScanResult,
  UserCommandJsonFile as UserCommandSingleFile
} from "../../features/commands/userCommandSourceTypes";

const USER_COMMAND_SOURCE_ID = "user-command-files";

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
  scanUserCommandFiles?: () => Promise<UserCommandFileScanResult>;
  readUserCommandFile?: (path: string) => Promise<UserCommandSingleFile>;
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
  catalogReady: Ref<boolean>;
  refreshUserCommands: () => Promise<void>;
}

function createCommandCatalogState(
  options: UseCommandCatalogOptions,
  initialBuiltinLoaded: ReturnType<typeof loadBuiltinCommandTemplatesWithReport>
) {
  const builtinTemplates = ref<CommandTemplate[]>(initialBuiltinLoaded.templates);
  const userTemplates = ref<CommandTemplate[]>([]);
  const allCommandTemplates = ref<CommandTemplate[]>(builtinTemplates.value);
  const commandTemplates = ref<CommandTemplate[]>(builtinTemplates.value);
  const builtinCommandSourceById = ref<Record<string, string>>(initialBuiltinLoaded.sourceByCommandId);
  const commandSourceById = ref<Record<string, string>>({});
  const userCommandSourceById = ref<Record<string, string>>({});
  const overriddenCommandIds = ref<string[]>([]);
  const loadIssues = ref<CommandLoadIssue[]>([]);
  const catalogReady = ref(!options.isTauriRuntime());
  const userCommandSourceCache =
    options.scanUserCommandFiles && options.readUserCommandFile
      ? createUserCommandSourceCache({
          scanUserCommandFiles: options.scanUserCommandFiles,
          readUserCommandFile: options.readUserCommandFile
        })
      : null;

  return {
    builtinTemplates,
    userTemplates,
    allCommandTemplates,
    commandTemplates,
    builtinCommandSourceById,
    commandSourceById,
    userCommandSourceById,
    overriddenCommandIds,
    loadIssues,
    catalogReady,
    userCommandSourceCache
  };
}

function buildCommandCatalogReturn(params: {
  commandTemplates: Ref<CommandTemplate[]>;
  allCommandTemplates: Ref<CommandTemplate[]>;
  commandSourceById: Ref<Record<string, string>>;
  userCommandSourceById: Ref<Record<string, string>>;
  overriddenCommandIds: Ref<string[]>;
  loadIssues: Ref<CommandLoadIssue[]>;
  catalogReady: Ref<boolean>;
  refreshUserCommands: () => Promise<void>;
}): UseCommandCatalogReturn {
  return {
    commandTemplates: params.commandTemplates,
    allCommandTemplates: params.allCommandTemplates,
    commandSourceById: params.commandSourceById,
    userCommandSourceById: params.userCommandSourceById,
    overriddenCommandIds: params.overriddenCommandIds,
    loadIssues: params.loadIssues,
    catalogReady: params.catalogReady,
    refreshUserCommands: params.refreshUserCommands
  };
}

function loadBuiltinTemplatesAndSourceForState(params: {
  builtinTemplates: Ref<CommandTemplate[]>;
  builtinCommandSourceById: Ref<Record<string, string>>;
  runtimePlatform: RuntimePlatform | null;
}): void {
  const loaded = params.runtimePlatform
    ? loadBuiltinCommandTemplatesWithReport({ runtimePlatform: params.runtimePlatform })
    : loadBuiltinCommandTemplatesWithReport();
  params.builtinTemplates.value = loaded.templates;
  params.builtinCommandSourceById.value = loaded.sourceByCommandId;
}

function applyUserTemplatesFromPayload(params: {
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

async function resolveRuntimePlatformOnce(params: {
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

function applyMergedCommandCatalogState(params: {
  builtinTemplates: Ref<CommandTemplate[]>;
  userTemplates: Ref<CommandTemplate[]>;
  allCommandTemplates: Ref<CommandTemplate[]>;
  commandTemplates: Ref<CommandTemplate[]>;
  builtinCommandSourceById: Ref<Record<string, string>>;
  commandSourceById: Ref<Record<string, string>>;
  userCommandSourceById: Ref<Record<string, string>>;
  overriddenCommandIds: Ref<string[]>;
  disabledCommandIds: Readonly<Ref<string[]>> | undefined;
}): void {
  const merged = mergeCommandTemplates(params.builtinTemplates.value, params.userTemplates.value);
  params.allCommandTemplates.value = merged;
  params.commandSourceById.value = mergeCommandSourceById(
    params.builtinCommandSourceById.value,
    params.userCommandSourceById.value,
    merged
  );
  params.overriddenCommandIds.value = computeOverrideIds(
    params.builtinTemplates.value,
    params.userTemplates.value
  );
  const disabledIds = readDisabledCommandIds(params.disabledCommandIds);
  if (disabledIds.size === 0) {
    params.commandTemplates.value = merged;
    return;
  }
  params.commandTemplates.value = merged.filter((item) => !disabledIds.has(item.id));
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
        // Runtime text mapping currently resolves localized fields through the global i18n singleton.
        setAppLocale(options.locale?.value);
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

function bindCommandCatalogLifecycle(params: {
  options: UseCommandCatalogOptions;
  loadBuiltinTemplatesAndSource: () => void;
  userTemplates: Ref<CommandTemplate[]>;
  userCommandSourceById: Ref<Record<string, string>>;
  loadIssues: Ref<CommandLoadIssue[]>;
  applyMergedTemplates: () => void;
  refreshUserCommands: () => Promise<void>;
  remapFromCacheIfPrimed: () => Promise<boolean>;
}): void {
  bindCatalogWatchers({
    options: params.options,
    onDisabledCommandIdsChanged: () => {
      params.applyMergedTemplates();
    },
    onLocaleChanged: () => {
      if (!params.options.isTauriRuntime()) {
        params.loadBuiltinTemplatesAndSource();
        params.applyMergedTemplates();
        return;
      }
      void params.remapFromCacheIfPrimed().then((handled) => {
        if (!handled) {
          return params.refreshUserCommands();
        }
        return undefined;
      });
    }
  });
  bindCatalogMountedHook(params);
}

export function useCommandCatalog(options: UseCommandCatalogOptions): UseCommandCatalogReturn {
  const initialBuiltinLoaded = loadBuiltinCommandTemplatesWithReport();
  const {
    builtinTemplates,
    userTemplates,
    allCommandTemplates,
    commandTemplates,
    builtinCommandSourceById,
    commandSourceById,
    userCommandSourceById,
    overriddenCommandIds,
    loadIssues,
    catalogReady,
    userCommandSourceCache
  } = createCommandCatalogState(options, initialBuiltinLoaded);
  let runtimePlatform: RuntimePlatform | null = null;

  const resolveRuntimePlatform = () =>
    resolveRuntimePlatformOnce({
      options,
      getRuntimePlatform: () => runtimePlatform,
      setRuntimePlatform: (value) => {
        runtimePlatform = value;
      }
    });

  const loadBuiltinTemplatesAndSource = () =>
    loadBuiltinTemplatesAndSourceForState({ builtinTemplates, builtinCommandSourceById, runtimePlatform });

  const applyMergedTemplates = () =>
    applyMergedCommandCatalogState({
      builtinTemplates,
      userTemplates,
      allCommandTemplates,
      commandTemplates,
      builtinCommandSourceById,
      commandSourceById,
      userCommandSourceById,
      overriddenCommandIds,
      disabledCommandIds: options.disabledCommandIds
    });

  async function remapFromCacheIfPrimed(): Promise<boolean> {
    if (!userCommandSourceCache || !userCommandSourceCache.hasPrimedScan()) {
      return false;
    }
    await resolveRuntimePlatform();
    loadBuiltinTemplatesAndSource();
    const cached = userCommandSourceCache.remapFromCache();
    applyUserTemplatesFromPayload({
      payloadEntries: cached.payloadEntries,
      sourceIssues: cached.issues,
      runtimePlatform,
      userTemplates,
      userCommandSourceById,
      loadIssues,
      applyMergedTemplates
    });
    catalogReady.value = true;
    return true;
  }

  async function refreshUserCommands(): Promise<void> {
    if (!options.isTauriRuntime()) {
      catalogReady.value = true;
      applyMergedTemplates();
      return;
    }
    try {
      if (!userCommandSourceCache) {
        loadIssues.value = [
          createReadFailedIssue(USER_COMMAND_SOURCE_ID, "user command scan/read ports are not configured.")
        ];
        return;
      }
      const [, scanned] = await Promise.all([
        resolveRuntimePlatform(),
        userCommandSourceCache.refreshFromScan()
      ]);
      loadBuiltinTemplatesAndSource();
      applyUserTemplatesFromPayload({
        payloadEntries: scanned.payloadEntries,
        sourceIssues: scanned.issues,
        runtimePlatform,
        userTemplates,
        userCommandSourceById,
        loadIssues,
        applyMergedTemplates
      });
    } catch (error) {
      console.warn("[commands] failed to refresh user command files", error);
      userCommandSourceCache?.clear();
      loadIssues.value = [
        userCommandSourceCache
          ? createScanFailedIssue(USER_COMMAND_SOURCE_ID, error)
          : createReadFailedIssue(USER_COMMAND_SOURCE_ID, error)
      ];
    } finally {
      catalogReady.value = true;
    }
  }

  applyMergedTemplates();
  bindCommandCatalogLifecycle({
    options,
    loadBuiltinTemplatesAndSource,
    userTemplates,
    userCommandSourceById,
    loadIssues,
    applyMergedTemplates,
    refreshUserCommands,
    remapFromCacheIfPrimed
  });

  return buildCommandCatalogReturn({
    commandTemplates,
    allCommandTemplates,
    commandSourceById,
    userCommandSourceById,
    overriddenCommandIds,
    loadIssues,
    catalogReady,
    refreshUserCommands
  });
}
