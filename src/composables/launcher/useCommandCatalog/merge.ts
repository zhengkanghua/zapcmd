import type { Ref } from "vue";
import type { CommandTemplate } from "../../../features/commands/types";

/**
 * 用户命令允许覆盖 builtin 命令，但要保持 builtin 原有顺序稳定。
 */
export function mergeCommandTemplates(
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

function readDisabledCommandIds(
  disabledCommandIds: Readonly<Ref<string[]>> | undefined
): Set<string> {
  const values = disabledCommandIds?.value ?? [];
  const normalized = values
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return new Set(normalized);
}

export function computeOverrideIds(
  builtinTemplates: CommandTemplate[],
  userTemplates: CommandTemplate[]
): string[] {
  if (userTemplates.length === 0) {
    return [];
  }
  const builtinIds = new Set(builtinTemplates.map((item) => item.id));
  return userTemplates
    .map((item) => item.id)
    .filter((id, index, list) => builtinIds.has(id) && list.indexOf(id) === index);
}

export function mergeCommandSourceById(
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

export function applyMergedCommandCatalogState(params: {
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
  const merged = mergeCommandTemplates(
    params.builtinTemplates.value,
    params.userTemplates.value
  );
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
