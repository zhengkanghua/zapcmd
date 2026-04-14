function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function normalizeMaybeText(value) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function pickOverlayLocaleText(overlaysByLocale, selector) {
  const output = {};
  for (const [locale, overlay] of Object.entries(overlaysByLocale ?? {})) {
    const value = selector(overlay);
    const normalized = normalizeMaybeText(value);
    if (normalized) {
      output[locale] = normalized;
    }
  }
  return output;
}

function mergeTextField({ overlayValues }) {
  const overlayEntries = Object.entries(overlayValues ?? {}).filter(
    ([, value]) => typeof value === "string" && value.trim().length > 0
  );
  if (overlayEntries.length > 0) {
    return Object.fromEntries(overlayEntries);
  }
  return undefined;
}

function mergeCommandArgs({ baseArgs, overlaysByLocale, commandId }) {
  if (!Array.isArray(baseArgs) || baseArgs.length === 0) {
    return baseArgs;
  }

  return baseArgs.map((arg) => {
    if (!arg || typeof arg !== "object" || Array.isArray(arg)) {
      return arg;
    }
    const argKey = typeof arg.key === "string" ? arg.key : undefined;
    if (!argKey) {
      return arg;
    }

    const label = mergeTextField({
      overlayValues: pickOverlayLocaleText(overlaysByLocale, (overlay) => {
        return overlay?.commands?.[commandId]?.args?.[argKey]?.label;
      })
    });

    const placeholder = mergeTextField({
      overlayValues: pickOverlayLocaleText(overlaysByLocale, (overlay) => {
        return overlay?.commands?.[commandId]?.args?.[argKey]?.placeholder;
      })
    });

    const description = mergeTextField({
      overlayValues: pickOverlayLocaleText(overlaysByLocale, (overlay) => {
        return overlay?.commands?.[commandId]?.args?.[argKey]?.description;
      })
    });

    return {
      ...arg,
      ...(label !== undefined ? { label } : {}),
      ...(placeholder !== undefined ? { placeholder } : {}),
      ...(description !== undefined ? { description } : {})
    };
  });
}

function mergeCommandPrerequisites({ basePrereqs, overlaysByLocale, commandId }) {
  if (!Array.isArray(basePrereqs) || basePrereqs.length === 0) {
    return basePrereqs;
  }

  return basePrereqs.map((prereq) => {
    if (!prereq || typeof prereq !== "object" || Array.isArray(prereq)) {
      return prereq;
    }
    const prereqId = typeof prereq.id === "string" ? prereq.id : undefined;
    if (!prereqId) {
      return prereq;
    }

    const displayName = mergeTextField({
      overlayValues: pickOverlayLocaleText(overlaysByLocale, (overlay) => {
        return (
          overlay?.commands?.[commandId]?.prerequisites?.[prereqId]?.displayName ??
          overlay?.prerequisites?.[prereqId]?.displayName
        );
      })
    });

    const resolutionHint = mergeTextField({
      overlayValues: pickOverlayLocaleText(overlaysByLocale, (overlay) => {
        return (
          overlay?.commands?.[commandId]?.prerequisites?.[prereqId]?.resolutionHint ??
          overlay?.prerequisites?.[prereqId]?.resolutionHint
        );
      })
    });

    return {
      ...prereq,
      ...(displayName !== undefined ? { displayName } : {}),
      ...(resolutionHint !== undefined ? { resolutionHint } : {})
    };
  });
}

/**
 * 将 base YAML（数组结构）和多个 locale overlays（key-based）合并成统一的 view model。
 *
 * 输出中的可本地化字段使用 `string | { [locale]: string }` 形态，以便 runtime json 与 markdown 共用。
 */
export function mergeCatalogLocales({
  baseCatalog,
  overlaysByLocale,
  localeConfig
}) {
  const mergedMetaName = mergeTextField({
    overlayValues: pickOverlayLocaleText(overlaysByLocale, (overlay) => overlay?.meta?.name)
  });

  const mergedMetaDescription = mergeTextField({
    overlayValues: pickOverlayLocaleText(overlaysByLocale, (overlay) => overlay?.meta?.description)
  });

  const mergedCommands = (baseCatalog.commands ?? []).map((command) => {
    if (!command || typeof command !== "object" || Array.isArray(command)) {
      return command;
    }
    const commandId = typeof command.id === "string" ? command.id : "";

    const name = mergeTextField({
      overlayValues: pickOverlayLocaleText(overlaysByLocale, (overlay) => {
        return overlay?.commands?.[commandId]?.name;
      })
    });

    const description = mergeTextField({
      overlayValues: pickOverlayLocaleText(overlaysByLocale, (overlay) => {
        return overlay?.commands?.[commandId]?.description;
      })
    });

    const args = mergeCommandArgs({
      baseArgs: command.args,
      overlaysByLocale,
      commandId
    });

    const prerequisites = mergeCommandPrerequisites({
      basePrereqs: command.prerequisites,
      overlaysByLocale,
      commandId
    });

    return {
      ...command,
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(args !== undefined ? { args } : {}),
      ...(prerequisites !== undefined ? { prerequisites } : {})
    };
  });

  return {
    ...baseCatalog,
    meta: {
      ...baseCatalog.meta,
      ...(mergedMetaName !== undefined ? { name: mergedMetaName } : {}),
      ...(mergedMetaDescription !== undefined ? { description: mergedMetaDescription } : {})
    },
    commands: mergedCommands,
    ...(isPlainObject(localeConfig) ? { localeConfig: structuredClone(localeConfig) } : {})
  };
}
