const MODULE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const PLATFORM_ORDER = ["win", "mac", "linux"];

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function assertTextValue(value, message) {
  if (typeof value === "string" && value.trim().length > 0) {
    return;
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (
      entries.length > 0 &&
      entries.some(([, text]) => typeof text === "string" && text.trim().length > 0)
    ) {
      return;
    }
  }
  throw new Error(message);
}

function cloneIfPresent(value) {
  if (value === undefined) {
    return undefined;
  }
  return structuredClone(value);
}

function normalizePlatformSpec(platform, commandId) {
  if (typeof platform === "string") {
    const normalized = platform.trim().toLowerCase();
    if (normalized === "all") {
      return {
        isAll: true,
        targets: ["all"]
      };
    }
    if (PLATFORM_ORDER.includes(normalized)) {
      return {
        isAll: false,
        targets: [normalized]
      };
    }
    if (normalized === "mac/linux") {
      return {
        isAll: false,
        targets: ["mac", "linux"]
      };
    }
  }

  if (Array.isArray(platform)) {
    const seen = new Set();
    for (const target of platform) {
      assertCondition(typeof target === "string", `command '${commandId}' platform array must only contain strings.`);
      const normalized = target.trim().toLowerCase();
      assertCondition(PLATFORM_ORDER.includes(normalized), `command '${commandId}' platform contains unsupported value '${target}'.`);
      seen.add(normalized);
    }
    assertCondition(seen.size > 0, `command '${commandId}' platform array cannot be empty.`);
    const orderedTargets = PLATFORM_ORDER.filter((target) => seen.has(target));
    if (orderedTargets.length === PLATFORM_ORDER.length) {
      return {
        isAll: true,
        targets: ["all"]
      };
    }
    return {
      isAll: false,
      targets: orderedTargets
    };
  }

  throw new Error(`command '${commandId}' has unsupported platform value.`);
}

function createPhysicalCommand(command, moduleSlug, target, needsSuffix) {
  const id = needsSuffix ? `${command.id}-${target}` : command.id;
  return {
    id,
    name: command.name,
    ...(command.description ? { description: command.description } : {}),
    tags: Array.isArray(command.tags) ? command.tags : [],
    category:
      typeof command.category === "string" && MODULE_SLUG_PATTERN.test(command.category)
        ? command.category
        : moduleSlug,
    platform: target,
    ...(command.exec ? { exec: cloneIfPresent(command.exec) } : {}),
    ...(command.script ? { script: cloneIfPresent(command.script) } : {}),
    adminRequired: command.adminRequired ?? false,
    ...(command.dangerous === true ? { dangerous: true } : {}),
    ...(Array.isArray(command.args) && command.args.length > 0
      ? { args: cloneIfPresent(command.args) }
      : {}),
    ...(Array.isArray(command.prerequisites) && command.prerequisites.length > 0
      ? { prerequisites: cloneIfPresent(command.prerequisites) }
      : {})
  };
}

export function buildRuntimeJson(catalog) {
  const runtimeCommands = [];
  let logicalCount = 0;

  assertTextValue(
    catalog?.meta?.name,
    `${catalog.fileName} meta.name is required (string or localized object).`
  );

  for (const command of catalog.commands) {
    assertCondition(
      command && typeof command === "object" && !Array.isArray(command),
      `${catalog.fileName} commands[] must contain objects.`
    );
    assertCondition(typeof command.id === "string" && command.id.trim().length > 0, `${catalog.fileName} command.id is required.`);
    assertTextValue(
      command.name,
      `${catalog.fileName} command '${command.id}' name is required (string or localized object).`
    );
    assertCondition(
      (command.exec && !command.script) || (!command.exec && command.script),
      `${catalog.fileName} command '${command.id}' must define exactly one of exec or script.`
    );

    const normalizedPlatform = normalizePlatformSpec(command.platform, command.id);
    const physicalTargets = normalizedPlatform.isAll ? ["all"] : normalizedPlatform.targets;
    const needsSuffix = physicalTargets.length > 1;
    for (const target of physicalTargets) {
      runtimeCommands.push(
        createPhysicalCommand(command, catalog.moduleSlug, target, needsSuffix)
      );
    }
    logicalCount += 1;
  }

  const runtimeCategories = Array.from(
    new Set(runtimeCommands.map((command) => command.category))
  ).sort();

  return {
    runtimeJson: {
      _meta: {
        name: catalog.meta.name,
        ...(catalog.meta.description ? { description: catalog.meta.description } : {}),
        source: "builtin"
      },
      commands: runtimeCommands
    },
    manifestEntry: {
      file: `${catalog.fileName.replace(/\.yaml$/u, "")}.json`,
      sourceFile: catalog.fileName,
      docFile: `${catalog.fileName.replace(/\.yaml$/u, "")}.md`,
      moduleSlug: catalog.moduleSlug,
      runtimeCategories,
      logicalCount,
      physicalCount: runtimeCommands.length
    }
  };
}
