import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import path from "node:path";

const DEFAULT_OPTIONS = {
  sourceDir: "docs/command_sources",
  sourcePattern: "_*.md",
  outputDir: "assets/runtime_templates/commands/builtin",
  manifestPath: "assets/runtime_templates/commands/builtin/index.json",
  generatedMarkdownPath: "docs/builtin_commands.generated.md",
  expectedLogicalCount: 0
};

const SOURCE_FILENAME_PATTERN = /^_[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const PREREQUISITE_TYPES = new Set(["binary", "shell", "env"]);

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function createWildcardRegExp(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/gu, "\\$&").replace(/\*/gu, ".*");
  return new RegExp(`^${escaped}$`, "u");
}

function detectExistingEol(filePath, fallback = "\n") {
  if (!existsSync(filePath)) {
    return fallback;
  }

  const content = readFileSync(filePath, "utf8");
  return content.includes("\r\n") ? "\r\n" : "\n";
}

function serializeJson(value, eol) {
  return `${JSON.stringify(value, null, 2).replace(/\n/gu, eol)}${eol}`;
}

function serializeLines(lines, eol) {
  return `${lines.join(eol)}${eol}`;
}

function normalizeDisplayPath(targetPath, baseDir) {
  const relativePath = path.relative(baseDir, targetPath);
  if (
    relativePath.length > 0 &&
    !relativePath.startsWith("..") &&
    !path.isAbsolute(relativePath)
  ) {
    return toPosixPath(relativePath);
  }
  return toPosixPath(targetPath);
}

function splitTopLevel(text, delimiter = ",") {
  const result = [];
  let buffer = "";
  let depth = 0;

  for (const char of text) {
    if (char === "(") {
      depth += 1;
      buffer += char;
      continue;
    }
    if (char === ")") {
      if (depth > 0) {
        depth -= 1;
      }
      buffer += char;
      continue;
    }
    if (char === delimiter && depth === 0) {
      const item = buffer.trim();
      if (item.length > 0) {
        result.push(item);
      }
      buffer = "";
      continue;
    }
    buffer += char;
  }

  const tail = buffer.trim();
  if (tail.length > 0) {
    result.push(tail);
  }

  return result;
}

function convertNumberLiteral(value) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number literal '${value}'`);
  }
  return Number.isInteger(parsed) ? parsed : parsed;
}

function convertArgsSpec(spec) {
  if (!spec || spec.trim() === "-") {
    return [];
  }

  return splitTopLevel(spec).map((item) => {
    const match = item.match(/^([a-zA-Z0-9_-]+)\((.+)\)$/u);
    if (!match) {
      throw new Error(`Unrecognized args token: '${item}'`);
    }

    const [, key, innerRaw] = match;
    const inner = innerRaw.trim();
    const arg = { key: key.trim(), label: key.trim(), type: "text", required: true };

    if (inner.toLowerCase().startsWith("select:")) {
      const optionsRaw = inner.slice(inner.indexOf(":") + 1).trim();
      const separator = optionsRaw.includes(",") ? "," : "/";
      const options = optionsRaw
        .split(separator)
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      if (options.length === 0) {
        throw new Error(`Select arg '${key}' has no options: '${item}'`);
      }

      return {
        ...arg,
        type: "select",
        validation: { options }
      };
    }

    const innerParts = splitTopLevel(inner);
    const baseType = innerParts[0]?.trim().toLowerCase();
    if (!baseType || !["text", "number", "path"].includes(baseType)) {
      throw new Error(`Unsupported arg type '${baseType}' in '${item}'`);
    }

    const validation = {};
    for (const token of innerParts.slice(1)) {
      const defaultMatch = token.match(/^\s*default\s*:\s*(.+)\s*$/u);
      if (defaultMatch) {
        arg.default = defaultMatch[1].trim();
        continue;
      }

      const minMatch = token.match(/^\s*min\s*:\s*(.+)\s*$/u);
      if (minMatch) {
        validation.min = convertNumberLiteral(minMatch[1].trim());
        continue;
      }

      const maxMatch = token.match(/^\s*max\s*:\s*(.+)\s*$/u);
      if (maxMatch) {
        validation.max = convertNumberLiteral(maxMatch[1].trim());
      }
    }

    return {
      ...arg,
      type: baseType,
      ...(Object.keys(validation).length > 0 ? { validation } : {})
    };
  });
}

function convertPrerequisites(cell) {
  if (!cell || cell.trim() === "-") {
    return [];
  }

  return cell
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .map((token) => {
      const match = token.match(/^\s*([a-zA-Z]+)\s*:(.+)\s*$/u);
      if (!match) {
        throw new Error(
          `Invalid prerequisite token '${token}'. Expected typed prerequisite token '<type>:<target>'.`
        );
      }

      const type = match[1].trim().toLowerCase();
      const id = match[2].trim();
      if (!PREREQUISITE_TYPES.has(type)) {
        throw new Error(`Unsupported prerequisite type '${type}' in token '${token}'.`);
      }
      if (id.length === 0) {
        throw new Error(`Invalid prerequisite token '${token}'. Target cannot be empty.`);
      }

      return {
        id,
        type,
        required: true,
        check: `${type}:${id}`
      };
    });
}

function convertTags(cell) {
  if (!cell?.trim()) {
    return [];
  }

  const seen = new Set();
  return cell
    .split(/\s+/u)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .filter((item) => {
      if (seen.has(item)) {
        return false;
      }
      seen.add(item);
      return true;
    });
}

function unquoteInlineCodeCell(cell) {
  const value = cell.trim();
  if (value.length >= 2 && value.startsWith("`") && value.endsWith("`")) {
    return value.slice(1, -1);
  }
  return value;
}

function splitMarkdownTableRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) {
    return [];
  }

  const cells = [];
  let buffer = "";
  let insideInlineCode = false;

  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    const previous = index > 0 ? trimmed[index - 1] : "";

    if (char === "`" && previous !== "\\") {
      insideInlineCode = !insideInlineCode;
      buffer += char;
      continue;
    }

    if (char === "|" && !insideInlineCode && previous !== "\\") {
      cells.push(buffer.trim());
      buffer = "";
      continue;
    }

    buffer += char;
  }

  if (buffer.length > 0) {
    cells.push(buffer.trim());
  }

  if (cells[0] === "") {
    cells.shift();
  }
  if (cells.at(-1) === "") {
    cells.pop();
  }

  return cells;
}

function isMarkdownTableSeparatorRow(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/u.test(cell.trim()));
}

function getCommandSourceTableLayout(cells, expectedFileId) {
  const legacyHeader = ["#", "ID", "名称", "平台", "模板", "参数", "高危", "adminRequired", "prerequisites", "tags"];
  const rowRuntimeHeader = [
    "#",
    "ID",
    "名称",
    "运行时分类",
    "平台",
    "模板",
    "参数",
    "高危",
    "adminRequired",
    "prerequisites",
    "tags"
  ];
  const joinedCells = cells.join("\n");

  if (joinedCells === legacyHeader.join("\n")) {
    return { hasRowRuntimeCategory: false, expectedColumnCount: legacyHeader.length };
  }
  if (joinedCells === rowRuntimeHeader.join("\n")) {
    return { hasRowRuntimeCategory: true, expectedColumnCount: rowRuntimeHeader.length };
  }

  throw new Error(`Unsupported command table header in '${expectedFileId}'`);
}

function getOrderedPlatformTargets(targets, commandId, rejectDuplicates = false) {
  const allowedTargets = ["win", "mac", "linux"];
  const seenTargets = new Set();

  for (const target of targets) {
    if (typeof target !== "string") {
      throw new Error(`platform array for id '${commandId}' must only contain string entries.`);
    }

    const normalizedTarget = target.trim().toLowerCase();
    if (!normalizedTarget) {
      throw new Error(`platform array for id '${commandId}' cannot contain blank entries.`);
    }
    if (normalizedTarget === "all") {
      throw new Error(`platform array for id '${commandId}' cannot contain 'all'. Use scalar 'all' instead.`);
    }
    if (normalizedTarget.includes("/")) {
      throw new Error(`platform array for id '${commandId}' must only contain win/mac/linux entries.`);
    }
    if (!allowedTargets.includes(normalizedTarget)) {
      throw new Error(`platform array for id '${commandId}' contains unsupported target '${normalizedTarget}'.`);
    }
    if (seenTargets.has(normalizedTarget)) {
      if (rejectDuplicates) {
        throw new Error(`platform array for id '${commandId}' contains duplicate target '${normalizedTarget}'.`);
      }
      continue;
    }
    seenTargets.add(normalizedTarget);
  }

  return allowedTargets.filter((target) => seenTargets.has(target));
}

function resolvePlatformSpec(platformSpec, commandId) {
  const trimmedSpec = platformSpec.trim();
  if (!trimmedSpec) {
    throw new Error(`platform cannot be empty for id '${commandId}'.`);
  }

  switch (trimmedSpec.toLowerCase()) {
    case "all":
      return { isAll: true, targets: ["win", "mac", "linux"] };
    case "win":
    case "mac":
    case "linux":
      return { isAll: false, targets: [trimmedSpec.toLowerCase()] };
    case "mac/linux":
      return { isAll: false, targets: ["mac", "linux"] };
    default:
      break;
  }

  if (!(trimmedSpec.startsWith("[") && trimmedSpec.endsWith("]"))) {
    throw new Error(`Unsupported platform '${platformSpec}' for id '${commandId}'`);
  }

  let parsedTargets;
  try {
    parsedTargets = JSON.parse(trimmedSpec);
  } catch {
    throw new Error(`platform array for id '${commandId}' must be valid JSON.`);
  }

  const targetList = Array.isArray(parsedTargets) ? parsedTargets : [parsedTargets];
  if (targetList.length === 0) {
    throw new Error(`platform array for id '${commandId}' cannot be empty.`);
  }

  const normalizedTargets = getOrderedPlatformTargets(targetList, commandId, true);
  if (normalizedTargets.length === 0) {
    throw new Error(`platform array for id '${commandId}' cannot be empty.`);
  }

  return {
    isAll: normalizedTargets.length === 3,
    targets: normalizedTargets
  };
}

function getPlatformVariants(id, platform) {
  const resolved = resolvePlatformSpec(platform, id);
  if (resolved.isAll) {
    return [{ id, platform: "all" }];
  }

  return resolved.targets.map((target) => ({
    id:
      resolved.targets.length > 1 &&
      (!id.match(/-(win|mac|linux)$/u) || !id.endsWith(`-${target}`))
        ? `${id}-${target}`
        : id,
    platform: target
  }));
}

function getSourceHeaderMetadata(lines, expectedFileId) {
  const titleIndex = lines.findIndex((line) => line.trim().length > 0);
  if (titleIndex < 0) {
    throw new Error(`Missing required # _slug header in '${expectedFileId}'`);
  }

  const titleMatch = lines[titleIndex]?.match(/^#\s+(_[a-z0-9]+(?:-[a-z0-9]+)*)\s*$/u);
  if (!titleMatch) {
    throw new Error(`First non-empty line must be '# _slug' in '${expectedFileId}'`);
  }
  if (titleMatch[1] !== expectedFileId) {
    throw new Error(`Header slug '${titleMatch[1]}' must match filename '${expectedFileId}'`);
  }

  const duplicateTitleIndex = lines.findIndex((line, index) => index > titleIndex && /^#\s+/u.test(line));
  if (duplicateTitleIndex >= 0) {
    throw new Error(`Duplicate # _slug header found in '${expectedFileId}'`);
  }

  let displayName = null;
  let runtimeCategory = null;
  let index = titleIndex + 1;
  while (index < lines.length && lines[index]?.trim().length === 0) {
    index += 1;
  }

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim() || !/^>\s*/u.test(line)) {
      break;
    }

    const match = line.match(/^>\s*([^：:]+)\s*[：:]\s*(.*)$/u);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (key === "分类") {
        if (displayName !== null) {
          throw new Error(`Duplicate 分类 metadata in '${expectedFileId}'`);
        }
        if (!value) {
          throw new Error(`分类 metadata cannot be empty in '${expectedFileId}'`);
        }
        displayName = value;
      }
      if (key === "运行时分类") {
        if (runtimeCategory !== null) {
          throw new Error(`Duplicate 运行时分类 metadata in '${expectedFileId}'`);
        }
        if (!value) {
          throw new Error(`运行时分类 metadata cannot be empty in '${expectedFileId}'`);
        }
        if (!CATEGORY_SLUG_PATTERN.test(value)) {
          throw new Error(`运行时分类 metadata must be a valid slug in '${expectedFileId}': '${value}'`);
        }
        runtimeCategory = value;
      }
    }

    index += 1;
  }

  if (!displayName) {
    throw new Error(`Missing required 分类 metadata in '${expectedFileId}'`);
  }

  return {
    displayName,
    runtimeCategory: runtimeCategory ?? expectedFileId.slice(1)
  };
}

function parseBooleanCell(value) {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new Error(`Invalid boolean value '${value}'`);
}

export function resolveBuiltinGeneratorOptions(rawOptions = {}, cwd = process.cwd()) {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...rawOptions };
  return {
    cwd,
    sourcePattern: mergedOptions.sourcePattern,
    expectedLogicalCount: Number(mergedOptions.expectedLogicalCount ?? 0),
    sourceDir: path.resolve(cwd, mergedOptions.sourceDir),
    outputDir: path.resolve(cwd, mergedOptions.outputDir),
    manifestPath: path.resolve(cwd, mergedOptions.manifestPath),
    generatedMarkdownPath: path.resolve(cwd, mergedOptions.generatedMarkdownPath)
  };
}

export function generateBuiltinCommands(rawOptions = {}) {
  const options = resolveBuiltinGeneratorOptions(rawOptions);
  if (!existsSync(options.sourceDir)) {
    throw new Error(`Source directory not found: ${options.sourceDir}`);
  }

  const sourcePattern = createWildcardRegExp(options.sourcePattern);
  const sourceFiles = readdirSync(options.sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && sourcePattern.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  if (sourceFiles.length === 0) {
    throw new Error(`No source markdown matched '${options.sourcePattern}' in '${options.sourceDir}'`);
  }

  let logicalCount = 0;
  let physicalCount = 0;
  const globalIds = new Set();
  const outputByFile = new Map();
  const summaryByFile = new Map();

  for (const sourceFileName of sourceFiles) {
    const fileId = path.basename(sourceFileName, path.extname(sourceFileName));
    if (!SOURCE_FILENAME_PATTERN.test(fileId)) {
      throw new Error(`Source filename must be _<slug>.md and category slug must match ^[a-z0-9]+(?:-[a-z0-9]+)*$: ${sourceFileName}`);
    }

    const moduleSlug = fileId.slice(1);
    const sourceFilePath = path.join(options.sourceDir, sourceFileName);
    const lines = readFileSync(sourceFilePath, "utf8").split(/\r?\n/u);
    const headerMetadata = getSourceHeaderMetadata(lines, fileId);

    let rowCount = 0;
    const commands = [];
    const runtimeCategoriesSeen = new Set();
    let tableLayout = null;

    for (const line of lines) {
      const cells = splitMarkdownTableRow(line);
      if (cells.length === 0 || isMarkdownTableSeparatorRow(cells)) {
        continue;
      }
      if (!tableLayout) {
        tableLayout = getCommandSourceTableLayout(cells, fileId);
        continue;
      }
      if (cells[0] === "#") {
        throw new Error(`Duplicate command table header found in '${fileId}'`);
      }
      if (cells.length !== tableLayout.expectedColumnCount) {
        throw new Error(`Command row in '${fileId}' must contain ${tableLayout.expectedColumnCount} cells`);
      }

      const order = Number.parseInt(cells[0].trim(), 10);
      if (Number.isNaN(order)) {
        throw new Error(`Command order must be an integer in '${fileId}'`);
      }

      const id = unquoteInlineCodeCell(cells[1]);
      const name = cells[2].trim();
      const rowRuntimeCategoryCell = tableLayout.hasRowRuntimeCategory ? cells[3].trim() : null;
      const platform = cells[tableLayout.hasRowRuntimeCategory ? 4 : 3].trim();
      const templateCell = cells[tableLayout.hasRowRuntimeCategory ? 5 : 4];
      const argsSpec = cells[tableLayout.hasRowRuntimeCategory ? 6 : 5].trim();
      const riskCell = cells[tableLayout.hasRowRuntimeCategory ? 7 : 6].trim();
      const adminRequired = parseBooleanCell(cells[tableLayout.hasRowRuntimeCategory ? 8 : 7].trim());
      const prerequisiteCell = cells[tableLayout.hasRowRuntimeCategory ? 9 : 8].trim();
      const tagsCell = cells[tableLayout.hasRowRuntimeCategory ? 10 : 9].trim();
      const template = unquoteInlineCodeCell(templateCell).replace(/\\\|/gu, "|");

      let runtimeCategory = headerMetadata.runtimeCategory;
      if (rowRuntimeCategoryCell && rowRuntimeCategoryCell !== "-") {
        if (!CATEGORY_SLUG_PATTERN.test(rowRuntimeCategoryCell)) {
          throw new Error(`运行时分类 column must be a valid slug in '${fileId}': '${rowRuntimeCategoryCell}'`);
        }
        runtimeCategory = rowRuntimeCategoryCell;
      }

      rowCount += 1;
      logicalCount += 1;
      runtimeCategoriesSeen.add(runtimeCategory);

      const tags = convertTags(tagsCell);
      if (tags.length === 0) {
        throw new Error(`Empty tags in ${sourceFileName}, id '${id}'`);
      }

      const args = convertArgsSpec(argsSpec);
      const prerequisites = convertPrerequisites(prerequisiteCell);
      const dangerous = riskCell === "⚠️" || riskCell.toLowerCase() === "true";
      const variants = getPlatformVariants(id, platform);

      for (const variant of variants) {
        const command = {
          id: variant.id,
          name,
          tags,
          category: runtimeCategory,
          platform: variant.platform,
          template,
          adminRequired,
          dangerous,
          ...(args.length > 0 ? { args } : {}),
          ...(prerequisites.length > 0 ? { prerequisites } : {})
        };

        if (globalIds.has(command.id)) {
          throw new Error(`Duplicate generated id '${command.id}'`);
        }
        globalIds.add(command.id);
        commands.push(command);
        physicalCount += 1;
      }
    }

    if (rowCount === 0) {
      throw new Error(`No command rows found in source file: ${sourceFileName}`);
    }

    outputByFile.set(fileId, {
      displayName: headerMetadata.displayName,
      commands
    });
    summaryByFile.set(fileId, {
      sourceFile: sourceFileName,
      logicalCount: rowCount,
      physicalCount: commands.length,
      moduleSlug,
      runtimeCategories: [...runtimeCategoriesSeen].sort((left, right) => left.localeCompare(right))
    });
  }

  if (options.expectedLogicalCount > 0 && logicalCount !== options.expectedLogicalCount) {
    throw new Error(`Expected logical count ${options.expectedLogicalCount}, got ${logicalCount}`);
  }

  mkdirSync(options.outputDir, { recursive: true });

  const manifestFiles = [];
  const expectedOutputFiles = new Set();
  for (const fileId of [...outputByFile.keys()].sort((left, right) => left.localeCompare(right))) {
    const entry = outputByFile.get(fileId);
    const summary = summaryByFile.get(fileId);
    const outputPath = path.join(options.outputDir, `${fileId}.json`);
    const document = {
      _meta: {
        name: entry.displayName,
        author: "zapcmd-team",
        version: "1.0.0",
        description: "Generated from docs/command_sources",
        source: `docs/command_sources/${fileId}.md`
      },
      commands: entry.commands
    };

    writeFileSync(outputPath, serializeJson(document, detectExistingEol(outputPath, "\n")), "utf8");
    expectedOutputFiles.add(path.basename(outputPath));
    manifestFiles.push({
      file: `${fileId}.json`,
      sourceFile: summary.sourceFile,
      moduleSlug: summary.moduleSlug,
      runtimeCategories: summary.runtimeCategories,
      logicalCount: summary.logicalCount,
      physicalCount: summary.physicalCount
    });
  }

  const manifest = {
    sourceDir: normalizeDisplayPath(options.sourceDir, options.cwd),
    sourcePattern: options.sourcePattern,
    logicalCommandCount: logicalCount,
    physicalCommandCount: physicalCount,
    generatedFiles: manifestFiles
  };
  writeFileSync(
    options.manifestPath,
    serializeJson(manifest, detectExistingEol(options.manifestPath, "\r\n")),
    "utf8"
  );

  const snapshotLines = [
    "# Builtin Commands Generated Snapshot",
    "",
    `> Source dir: ${normalizeDisplayPath(options.sourceDir, options.cwd)}`,
    `> Source pattern: ${options.sourcePattern}`,
    "> This file is generated by scripts/commands/generate-builtin-commands.mjs.",
    "",
    "## Summary",
    "",
    `- Logical commands: ${logicalCount}`,
    `- Physical commands (after platform split): ${physicalCount}`,
    `- Output directory: ${normalizeDisplayPath(options.outputDir, options.cwd)}`,
    "",
    "## Files",
    "",
    "| File | Source | Module | Runtime Categories | Logical | Physical |",
    "|---|---|---|---|---|---|"
  ];
  for (const file of manifestFiles) {
    snapshotLines.push(
      `| ${file.file} | ${file.sourceFile} | ${file.moduleSlug} | ${file.runtimeCategories.join(", ")} | ${file.logicalCount} | ${file.physicalCount} |`
    );
  }
  writeFileSync(
    options.generatedMarkdownPath,
    serializeLines(snapshotLines, detectExistingEol(options.generatedMarkdownPath, "\r\n")),
    "utf8"
  );

  for (const fileName of readdirSync(options.outputDir)) {
    if (!fileName.startsWith("_") || !fileName.endsWith(".json")) {
      continue;
    }
    if (!expectedOutputFiles.has(fileName)) {
      rmSync(path.join(options.outputDir, fileName), { force: true });
    }
  }

  console.log("Generated builtin command files:");
  console.log(`  SourceDir: ${options.sourceDir}`);
  console.log(`  SourceFiles: ${sourceFiles.length}`);
  console.log(`  Logical: ${logicalCount}`);
  console.log(`  Physical: ${physicalCount}`);
  console.log(`  Output: ${options.outputDir}`);
  console.log(`  Manifest: ${options.manifestPath}`);
  console.log(`  Snapshot: ${options.generatedMarkdownPath}`);
}
