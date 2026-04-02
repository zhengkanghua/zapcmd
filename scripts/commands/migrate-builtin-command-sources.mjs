import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";

const PLATFORM_ORDER = ["win", "mac", "linux"];
const TEXT_STDIN_ARG_KEYS = new Set(["sql", "body", "json", "payload", "regex", "pattern"]);
const CMD_BUILTINS = new Set(["dir", "copy", "del", "erase", "set", "type", "cls"]);

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
  return parsed;
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
      return {
        ...arg,
        type: "select",
        validation: {
          options: optionsRaw
            .split(separator)
            .map((value) => value.trim())
            .filter(Boolean)
        }
      };
    }

    const innerParts = splitTopLevel(inner);
    const baseType = innerParts[0]?.trim().toLowerCase();
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
    .filter(Boolean)
    .map((token) => {
      const match = token.match(/^([a-zA-Z]+)\s*:\s*(.+)$/u);
      if (!match) {
        throw new Error(`Invalid prerequisite token '${token}'.`);
      }
      const [, type, id] = match;
      return {
        id: id.trim(),
        type: type.trim().toLowerCase(),
        required: true,
        check: `${type.trim().toLowerCase()}:${id.trim()}`
      };
    });
}

function convertTags(cell) {
  if (!cell || cell.trim() === "-") {
    return [];
  }

  return Array.from(
    new Set(
      cell
        .split(/\s+/u)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
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

function unquoteInlineCodeCell(cell) {
  const value = cell.trim().replace(/\\\|/gu, "|");
  if (value.length >= 2 && value.startsWith("`") && value.endsWith("`")) {
    return value.slice(1, -1);
  }
  return value;
}

function parseMetadata(lines, fileName) {
  const metadata = {};
  for (const line of lines) {
    if (!line.startsWith(">")) {
      continue;
    }
    const match = line.match(/^>\s*([^：]+)：\s*(.+)$/u);
    if (!match) {
      continue;
    }
    const [, key, value] = match;
    metadata[key.trim()] = value.trim();
  }

  if (!metadata["分类"]) {
    throw new Error(`${fileName} is missing 分类 metadata.`);
  }

  return metadata;
}

function parseMarkdownCatalog(filePath) {
  const fileName = path.basename(filePath);
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/u);
  const metadata = parseMetadata(lines, fileName);
  const rows = [];

  for (const line of lines) {
    const cells = splitMarkdownTableRow(line);
    if (cells.length === 0 || !/^\d+$/u.test(cells[0] ?? "")) {
      continue;
    }

    rows.push({
      id: unquoteInlineCodeCell(cells[1] ?? ""),
      name: unquoteInlineCodeCell(cells[2] ?? ""),
      category: (cells[3] ?? "").trim() || metadata["运行时分类"] || fileName.replace(/^_|\.md$/gu, ""),
      platform: unquoteInlineCodeCell(cells[4] ?? ""),
      template: unquoteInlineCodeCell(cells[5] ?? ""),
      args: convertArgsSpec(cells[6] ?? "-"),
      dangerous: (cells[7] ?? "").includes("⚠️"),
      adminRequired: String(cells[8] ?? "").trim().toLowerCase() === "true",
      prerequisites: convertPrerequisites(cells[9] ?? "-"),
      tags: convertTags(cells[10] ?? "-")
    });
  }

  return {
    fileName,
    moduleSlug: fileName.replace(/^_|\.md$/gu, ""),
    meta: {
      name: metadata["分类"],
      moduleSlug: fileName.replace(/^_|\.md$/gu, "")
    },
    rows
  };
}

function tokenizeCommand(template) {
  const tokens = [];
  let buffer = "";
  let quote = null;

  for (const char of template) {
    if ((char === "'" || char === "\"") && quote === null) {
      quote = char;
      buffer += char;
      continue;
    }
    if (char === quote) {
      quote = null;
      buffer += char;
      continue;
    }
    if (/\s/u.test(char) && quote === null) {
      if (buffer.trim().length > 0) {
        tokens.push(buffer.trim());
      }
      buffer = "";
      continue;
    }
    buffer += char;
  }

  if (buffer.trim().length > 0) {
    tokens.push(buffer.trim());
  }

  return tokens;
}

function inferRunner(template, prerequisites, platform) {
  const shellPrerequisite = prerequisites.find((item) => item.type === "shell");
  if (shellPrerequisite) {
    return shellPrerequisite.id;
  }

  if (/\b[A-Z][A-Za-z]+-[A-Z][A-Za-z]+\b/u.test(template)) {
    return "powershell";
  }

  if (platform === "win") {
    return "cmd";
  }

  return "bash";
}

function ensureMatchingShellPrerequisite(prerequisites, runner) {
  const normalizedRunner = runner.trim().toLowerCase();
  const hasMatchingShellPrerequisite = prerequisites.some((item) => {
    if (item.type !== "shell") {
      return false;
    }
    return (
      item.id.trim().toLowerCase() === normalizedRunner ||
      item.check.trim().toLowerCase() === `shell:${normalizedRunner}`
    );
  });

  if (hasMatchingShellPrerequisite) {
    return prerequisites;
  }

  return [
    ...prerequisites,
    {
      id: normalizedRunner,
      type: "shell",
      required: true,
      check: `shell:${normalizedRunner}`
    }
  ];
}

function detectStdinArgKey(args, tokens) {
  for (const arg of args) {
    if (arg.type !== "text" || !TEXT_STDIN_ARG_KEYS.has(arg.key)) {
      continue;
    }

    const rawToken = `{{${arg.key}}}`;
    if (tokens.some((token) => token === rawToken || token === `"${rawToken}"` || token === `'${rawToken}'`)) {
      return arg.key;
    }
  }

  return null;
}

function shouldUseScript(template, platform, prerequisites = []) {
  const normalized = template.replace(/\\\|/gu, "|");
  const firstToken = tokenizeCommand(normalized)[0]?.replace(/^['"]|['"]$/gu, "").toLowerCase() ?? "";
  return (
    prerequisites.some((item) => item.type === "shell") ||
    /[|<>;]/u.test(normalized) ||
    normalized.includes("&&") ||
    normalized.includes("||") ||
    normalized.includes("\n") ||
    /\b[A-Z][A-Za-z]+-[A-Z][A-Za-z]+\b/u.test(normalized) ||
    (platform === "win" && CMD_BUILTINS.has(firstToken))
  );
}

function classifyRow(row) {
  const platform = row.platform.trim().toLowerCase();
  const template = row.template.replace(/\\\|/gu, "|");
  const tokens = tokenizeCommand(template);
  const stdinArgKey = detectStdinArgKey(row.args, tokens);
  const useScript = shouldUseScript(template, platform, row.prerequisites);
  const highRisk =
    useScript ||
    row.args.some((arg) => arg.type === "text" && TEXT_STDIN_ARG_KEYS.has(arg.key));

  if (useScript) {
    const runner = inferRunner(template, row.prerequisites, platform);
    const prerequisites = ensureMatchingShellPrerequisite(row.prerequisites, runner);
    return {
      command: {
        id: row.id,
        name: row.name,
        category: row.category,
        platform: row.platform,
        script: {
          runner,
          command: template
        },
        adminRequired: row.adminRequired,
        ...(row.dangerous ? { dangerous: true } : {}),
        ...(row.args.length > 0 ? { args: row.args } : {}),
        ...(prerequisites.length > 0 ? { prerequisites } : {}),
        ...(row.tags.length > 0 ? { tags: row.tags } : {})
      },
      kind: "script",
      stdinArgKey: null,
      highRisk
    };
  }

  const execTokens = stdinArgKey
    ? tokens.filter((token) => {
        const rawToken = `{{${stdinArgKey}}}`;
        return token !== rawToken && token !== `"${rawToken}"` && token !== `'${rawToken}'`;
      })
    : tokens;

  return {
    command: {
      id: row.id,
      name: row.name,
      category: row.category,
      platform: row.platform,
      exec: {
        program: execTokens[0],
        args: execTokens.slice(1),
        ...(stdinArgKey ? { stdinArgKey } : {})
      },
      adminRequired: row.adminRequired,
      ...(row.dangerous ? { dangerous: true } : {}),
      ...(row.args.length > 0 ? { args: row.args } : {}),
      ...(row.prerequisites.length > 0 ? { prerequisites: row.prerequisites } : {}),
      ...(row.tags.length > 0 ? { tags: row.tags } : {})
    },
    kind: "exec",
    stdinArgKey,
    highRisk
  };
}

export function migrateBuiltinCommandSources({
  sourceDir = "docs/command_sources",
  outputDir = "commands/catalog",
  sourcePattern = "_*.md"
} = {}) {
  const absoluteSourceDir = path.resolve(process.cwd(), sourceDir);
  const absoluteOutputDir = path.resolve(process.cwd(), outputDir);
  mkdirSync(absoluteOutputDir, { recursive: true });

  const sourceFiles = readdirSync(absoluteSourceDir)
    .filter((fileName) => fileName.startsWith("_") && fileName.endsWith(".md") && fileName.match(new RegExp(`^${sourcePattern.replace(/\*/gu, ".*")}$`, "u")))
    .sort();

  const report = {
    execIds: [],
    scriptIds: [],
    stdinIds: [],
    highRiskIds: []
  };

  const generatedFiles = [];

  for (const fileName of sourceFiles) {
    const catalog = parseMarkdownCatalog(path.join(absoluteSourceDir, fileName));
    const commands = [];

    for (const row of catalog.rows) {
      const classified = classifyRow(row);
      commands.push(classified.command);
      report[`${classified.kind}Ids`].push(row.id);
      if (classified.stdinArgKey) {
        report.stdinIds.push(row.id);
      }
      if (classified.highRisk) {
        report.highRiskIds.push(row.id);
      }
    }

    const yamlObject = {
      meta: catalog.meta,
      commands
    };
    const yamlPath = path.join(
      absoluteOutputDir,
      fileName.replace(/\.md$/u, ".yaml")
    );
    writeFileSync(yamlPath, stringify(yamlObject), "utf8");
    generatedFiles.push(yamlPath);
  }

  return {
    generatedFiles,
    report: {
      execIds: Array.from(new Set(report.execIds)).sort(),
      scriptIds: Array.from(new Set(report.scriptIds)).sort(),
      stdinIds: Array.from(new Set(report.stdinIds)).sort(),
      highRiskIds: Array.from(new Set(report.highRiskIds)).sort()
    }
  };
}

function parseCliArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unsupported argument '${token}'.`);
    }

    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for '--${key}'.`);
    }
    options[key] = value;
    index += 1;
  }

  return options;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = migrateBuiltinCommandSources(parseCliArgs(process.argv.slice(2)));
    console.log(JSON.stringify(result.report, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
}
