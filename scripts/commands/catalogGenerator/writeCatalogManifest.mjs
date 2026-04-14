export function writeCatalogManifest({
  sourceDir,
  sourcePattern,
  entries,
  localeConfig
}) {
  const logicalCommandCount = entries.reduce(
    (total, entry) => total + entry.logicalCount,
    0
  );
  const physicalCommandCount = entries.reduce(
    (total, entry) => total + entry.physicalCount,
    0
  );

  return {
    sourceDir,
    sourcePattern,
    ...(localeConfig ? { localeConfig: structuredClone(localeConfig) } : {}),
    logicalCommandCount,
    physicalCommandCount,
    generatedFiles: entries
  };
}
