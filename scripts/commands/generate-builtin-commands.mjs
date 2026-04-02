import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseYamlCatalog } from "./catalogGenerator/parseYamlCatalog.mjs";
import { buildRuntimeJson } from "./catalogGenerator/buildRuntimeJson.mjs";
import {
  buildGeneratedMarkdown,
  buildGeneratedMarkdownIndex
} from "./catalogGenerator/buildGeneratedMarkdown.mjs";
import { writeCatalogManifest } from "./catalogGenerator/writeCatalogManifest.mjs";

const DEFAULT_OPTIONS = {
  sourceDir: "commands/catalog",
  sourcePattern: "_*.yaml",
  outputDir: "assets/runtime_templates/commands/builtin",
  manifestPath: "assets/runtime_templates/commands/builtin/index.json",
  generatedDocsDir: "docs/generated_commands",
  generatedIndexPath: "docs/generated_commands/index.md",
  expectedLogicalCount: 0
};

const ALLOWED_FLAGS = new Set([
  "sourceDir",
  "sourcePattern",
  "outputDir",
  "manifestPath",
  "generatedDocsDir",
  "generatedIndexPath",
  "expectedLogicalCount",
  "help"
]);

function createWildcardRegExp(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/gu, "\\$&").replace(/\*/gu, ".*");
  return new RegExp(`^${escaped}$`, "u");
}

function toRelativeDisplayPath(targetPath, cwd) {
  const relativePath = path.relative(cwd, targetPath);
  if (
    relativePath.length > 0 &&
    !relativePath.startsWith("..") &&
    !path.isAbsolute(relativePath)
  ) {
    return relativePath.split(path.sep).join("/");
  }
  return targetPath.split(path.sep).join("/");
}

function formatJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function printHelp() {
  console.log(
    [
      "Usage: node scripts/commands/generate-builtin-commands.mjs [options]",
      "",
      "Options:",
      "  --sourceDir <dir>",
      "  --sourcePattern <pattern>",
      "  --outputDir <dir>",
      "  --manifestPath <file>",
      "  --generatedDocsDir <dir>",
      "  --generatedIndexPath <file>",
      "  --expectedLogicalCount <number>",
      "  --help"
    ].join("\n")
  );
}

function parseCliArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unsupported argument '${token}'.`);
    }

    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const key = rawKey.trim();
    if (!ALLOWED_FLAGS.has(key)) {
      throw new Error(`Unknown option '--${key}'.`);
    }
    if (key === "help") {
      options.help = true;
      continue;
    }

    const value = inlineValue ?? argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for '--${key}'.`);
    }

    if (key === "expectedLogicalCount") {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        throw new Error(`Invalid expectedLogicalCount '${value}'.`);
      }
      options[key] = parsed;
    } else {
      options[key] = value;
    }

    if (inlineValue === undefined) {
      index += 1;
    }
  }

  return options;
}

export function generateBuiltinCommands(rawOptions = {}) {
  const cwd = process.cwd();
  const options = {
    ...DEFAULT_OPTIONS,
    ...rawOptions
  };

  const sourceDir = path.resolve(cwd, options.sourceDir);
  if (!existsSync(sourceDir)) {
    throw new Error(`Source directory not found: ${sourceDir}`);
  }

  const outputDir = path.resolve(cwd, options.outputDir);
  const manifestPath = path.resolve(cwd, options.manifestPath);
  const generatedDocsDir = path.resolve(cwd, options.generatedDocsDir);
  const generatedIndexPath = path.resolve(cwd, options.generatedIndexPath);
  const filePattern = createWildcardRegExp(options.sourcePattern);
  const sourceFiles = readdirSync(sourceDir)
    .filter((fileName) => filePattern.test(fileName))
    .sort();

  mkdirSync(outputDir, { recursive: true });
  mkdirSync(generatedDocsDir, { recursive: true });
  rmSync(outputDir, { recursive: true, force: true });
  rmSync(generatedDocsDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });
  mkdirSync(generatedDocsDir, { recursive: true });

  const manifestEntries = [];

  for (const fileName of sourceFiles) {
    const catalog = parseYamlCatalog(path.join(sourceDir, fileName));
    const { runtimeJson, manifestEntry } = buildRuntimeJson(catalog);
    const runtimeJsonPath = path.join(outputDir, manifestEntry.file);
    const generatedDocPath = path.join(generatedDocsDir, manifestEntry.docFile);

    writeFileSync(runtimeJsonPath, formatJson(runtimeJson), "utf8");
    writeFileSync(generatedDocPath, buildGeneratedMarkdown(catalog), "utf8");
    manifestEntries.push(manifestEntry);
  }

  const manifest = writeCatalogManifest({
    sourceDir: toRelativeDisplayPath(sourceDir, cwd),
    sourcePattern: options.sourcePattern,
    entries: manifestEntries
  });
  const logicalCommandCount = manifest.logicalCommandCount;
  if (
    options.expectedLogicalCount > 0 &&
    logicalCommandCount !== options.expectedLogicalCount
  ) {
    throw new Error(
      `expectedLogicalCount mismatch: expected ${options.expectedLogicalCount}, received ${logicalCommandCount}.`
    );
  }

  writeFileSync(manifestPath, formatJson(manifest), "utf8");
  writeFileSync(
    generatedIndexPath,
    buildGeneratedMarkdownIndex({
      sourceDir: toRelativeDisplayPath(sourceDir, cwd),
      outputDir: toRelativeDisplayPath(outputDir, cwd),
      generatedDocsDir: toRelativeDisplayPath(generatedDocsDir, cwd),
      entries: manifestEntries
    }),
    "utf8"
  );
}

export function runCli(argv = process.argv.slice(2)) {
  const options = parseCliArgs(argv);
  if (options.help) {
    printHelp();
    return;
  }
  generateBuiltinCommands(options);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    runCli();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
}
