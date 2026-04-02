export function writeCatalogManifest({
  sourceDir,
  sourcePattern,
  entries
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
    logicalCommandCount,
    physicalCommandCount,
    generatedFiles: entries
  };
}
