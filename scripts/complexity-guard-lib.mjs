const DEFAULT_FILE_MAX_LINES = 400;
const DEFAULT_FUNCTION_MAX_LINES = 50;

const defaultIgnoredPathPatterns = [
  /\/__tests__\//,
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /\/generated\//,
  /src\/i18n\/messages\.ts$/,
  /src-tauri\/target\//,
  /docs\//
];

const legacyBaselineAllowlist = new Set([
  "src/AppVisual.vue",
  "src-tauri/src/command_catalog/tests_io.rs",
  "src-tauri/src/terminal/tests_exec.rs",
  "scripts/commands/migrate-builtin-command-sources.mjs",
  "scripts/e2e/desktop-smoke.cjs",
  "scripts/e2e/visual-regression-lib.cjs",
  "scripts/e2e/visual-regression-runner.cjs"
]);

function countLines(content) {
  return content.split(/\r?\n/).length;
}

function getLineNumber(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function isIgnoredFile(filePath, ignoredPathPatterns) {
  return ignoredPathPatterns.some((pattern) => pattern.test(filePath));
}

function scanLongArrowFunctions(content, filePath, maxLines) {
  const violations = [];
  const arrowFunctionRegex =
    /(?<name>[A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*[^=]+)?=>\s*\{/g;

  for (const match of content.matchAll(arrowFunctionRegex)) {
    const startIndex = match.index ?? 0;
    const openBraceIndex = content.indexOf("{", startIndex);
    if (openBraceIndex === -1) {
      continue;
    }

    let depth = 0;
    let endIndex = -1;
    for (let index = openBraceIndex; index < content.length; index += 1) {
      const char = content[index];
      if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          endIndex = index;
          break;
        }
      }
    }

    if (endIndex === -1) {
      continue;
    }

    const startLine = getLineNumber(content, startIndex);
    const endLine = getLineNumber(content, endIndex);
    const lineCount = endLine - startLine + 1;
    if (lineCount <= maxLines) {
      continue;
    }

    violations.push({
      rule: "function-max-lines",
      file: filePath,
      line: startLine,
      message: `函数 ${match.groups?.name ?? "<anonymous>"} 超过 ${maxLines} 行（实际 ${lineCount} 行）`
    });
  }

  return violations;
}

export function analyzeComplexity({
  files,
  fileMaxLines = DEFAULT_FILE_MAX_LINES,
  functionMaxLines = DEFAULT_FUNCTION_MAX_LINES,
  ignoredPathPatterns = defaultIgnoredPathPatterns,
  baselineAllowlist = legacyBaselineAllowlist
}) {
  const violations = [];

  for (const file of files) {
    if (isIgnoredFile(file.path, ignoredPathPatterns)) {
      continue;
    }

    const totalLines = countLines(file.content);
    if (totalLines > fileMaxLines && !baselineAllowlist.has(file.path)) {
      violations.push({
        rule: "file-max-lines",
        file: file.path,
        line: 1,
        message: `文件超过 ${fileMaxLines} 行（实际 ${totalLines} 行）`
      });
    }

    for (const violation of scanLongArrowFunctions(file.content, file.path, functionMaxLines)) {
      if (baselineAllowlist.has(violation.file)) {
        continue;
      }
      violations.push(violation);
    }
  }

  return violations;
}
