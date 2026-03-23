/**
 * style-guard：样式治理门禁（Phase 3）
 *
 * 目标：
 * - 阻止硬编码色值回流（尤其是 UI 组件/业务代码里出现的 hex / rgb() / hsl()）
 * - 阻止 Tailwind arbitrary hex color（例如 `text-[#fff]`）
 *
 * 范围：
 * - 扫描 `src` 下所有 `.vue` 与 `.ts` 文件
 * - 允许“主题定义层”持有色值（例如 theme registry），UI 消费侧必须使用 `var(--ui-*)`
 *
 * 输出：
 * - 违规输出包含 `文件:行号`，便于快速定位修复
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const scanRoot = path.join(repoRoot, "src");

const excludedRelativePaths = new Set([
  // 主题定义层允许持有色值（最终会映射到 CSS Variables；UI 消费侧禁止硬编码）。
  "src/features/themes/themeRegistry.ts"
]);

const fileExtensions = new Set([".ts", ".vue"]);

const rules = [
  {
    name: "hex-color",
    description: "禁止硬编码 hex 色值（例如 #fff / #ffffff / #ffffffff）",
    regex: /#[0-9a-fA-F]{3,8}\b/
  },
  {
    name: "rgb()",
    description: "禁止硬编码 rgb() 色值",
    regex: /\brgb\(/i
  },
  {
    name: "hsl()",
    description: "禁止硬编码 hsl() 色值",
    regex: /\bhsl\(/i
  }
];

/**
 * @param {string} absolutePath
 * @returns {string}
 */
function normalizeToRepoRelativePath(absolutePath) {
  return path.relative(repoRoot, absolutePath).replaceAll("\\", "/");
}

/**
 * @param {string} dirPath
 * @returns {string[]}
 */
function collectScanFiles(dirPath) {
  /** @type {string[]} */
  const files = [];
  for (const entry of readdirSync(dirPath)) {
    const absoluteEntryPath = path.join(dirPath, entry);
    const stat = statSync(absoluteEntryPath);
    if (stat.isDirectory()) {
      files.push(...collectScanFiles(absoluteEntryPath));
      continue;
    }
    if (!stat.isFile()) {
      continue;
    }
    const extension = path.extname(entry);
    if (!fileExtensions.has(extension)) {
      continue;
    }
    files.push(absoluteEntryPath);
  }
  return files;
}

/**
 * @param {string} filePath
 * @returns {boolean}
 */
function isExcluded(filePath) {
  const relativePath = normalizeToRepoRelativePath(filePath);
  return excludedRelativePaths.has(relativePath);
}

/**
 * @param {string} filePath
 * @returns {{file: string; line: number; rule: string; message: string; preview: string}[]}
 */
function scanFile(filePath) {
  const relativePath = normalizeToRepoRelativePath(filePath);
  const content = readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  /** @type {{file: string; line: number; rule: string; message: string; preview: string}[]} */
  const violations = [];
  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index] ?? "";
    for (const rule of rules) {
      if (!rule.regex.test(line)) {
        continue;
      }
      violations.push({
        file: relativePath,
        line: lineNumber,
        rule: rule.name,
        message: rule.description,
        preview: line.trim()
      });
    }
  }

  return violations;
}

function main() {
  const files = collectScanFiles(scanRoot).filter((file) => !isExcluded(file));

  /** @type {{file: string; line: number; rule: string; message: string; preview: string}[]} */
  const violations = [];
  for (const file of files) {
    violations.push(...scanFile(file));
  }

  if (violations.length === 0) {
    console.log("[style-guard] OK");
    return;
  }

  console.error(`[style-guard] 发现 ${violations.length} 处违规：`);
  for (const v of violations) {
    console.error(`${v.file}:${v.line} ${v.rule}  ${v.preview}`);
  }
  console.error("");
  console.error("[style-guard] 修复建议：");
  console.error("- UI 消费侧只使用 `var(--ui-*)` / `data-theme` 体系，不要引入第二套 palette。");
  console.error("- 需要新颜色语义时：先补齐 theme/tokens，再在组件侧消费 token。");

  process.exitCode = 1;
}

main();
