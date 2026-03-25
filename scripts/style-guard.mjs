/**
 * style-guard：样式治理门禁（Phase 3）
 *
 * 目标：
 * - 阻止硬编码色值回流（尤其是 UI 组件/业务代码里出现的 hex / rgb() / rgba() / hsl()）
 * - 阻止 Tailwind arbitrary hex color（例如 `text-[#fff]`）
 * - 阻止窗口级 CSS 文件回流：`src/styles/index.css` 只能导入白名单样式入口
 * - 阻止 Vue `<style>` 回流：除明确白名单外，禁止在 `.vue` 内新增 `<style>`
 *
 * 范围：
 * - 扫描 `src` 下 `.vue` 与 `.ts` 文件（排除 `__tests__` / `*.test.ts` 等测试文件）
 * - 允许“主题定义层”持有色值（例如 theme registry），UI 消费侧必须使用 `var(--ui-*)`
 * - 注意：`rgba()` 规则不扫描 `.vue` 的 `<style>` block（避免历史 CSS 大面积误伤；优先治理脚本/模板层）。
 *
 * 输出：
 * - 违规输出包含 `文件:行号`，便于快速定位修复
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const scanRoot = path.join(repoRoot, "src");

const styleIndexRelativePath = "src/styles/index.css";

const excludedRelativePaths = new Set([
  // 主题定义层允许持有色值（最终会映射到 CSS Variables；UI 消费侧禁止硬编码）。
  "src/features/themes/themeRegistry.ts"
]);

const allowedStyleIndexImports = new Set([
  "./reset.css",
  "./themes/_index.css",
  "./tokens.css",
  "./tailwind.css"
]);

const allowedVueStyleBlockRelativePaths = new Set([
  // `SSlider` 需要 pseudo-element 选择器（例如 range thumb/track），迁移期允许保留局部 `<style>`。
  "src/components/settings/ui/SSlider.vue"
]);

const excludedPathPatterns = [
  // 测试文件允许包含“视觉基线断言字符串”，不纳入门禁。
  /^src\/__tests__\//,
  /\/__tests__\//,
  /\.test\.ts$/,
  /\.spec\.ts$/
];

const fileExtensions = new Set([".ts", ".vue"]);

const rules = [
  {
    name: "theme-token-leak",
    description: "禁止在组件/脚本层直接消费 --theme-*（请使用 --ui-* token）",
    regex: /--theme-/
  },
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
    name: "rgba()",
    description: "禁止硬编码 rgba() 色值（仅允许 rgba(var(--ui-...)) 形式）",
    regex: /\brgba\(\s*(?!var\(--ui-)/i,
    skipInVueStyleBlock: true
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
  if (excludedRelativePaths.has(relativePath)) {
    return true;
  }
  return excludedPathPatterns.some((pattern) => pattern.test(relativePath));
}

/**
 * @param {string} filePath
 * @returns {{file: string; line: number; rule: string; message: string; preview: string}[]}
 */
function scanFile(filePath) {
  const relativePath = normalizeToRepoRelativePath(filePath);
  const content = readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const isVueFile = relativePath.endsWith(".vue");

  let inVueStyleBlock = false;

  /** @type {{file: string; line: number; rule: string; message: string; preview: string}[]} */
  const violations = [];
  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index] ?? "";

    if (isVueFile && /<style\b/i.test(line)) {
      if (!allowedVueStyleBlockRelativePaths.has(relativePath)) {
        violations.push({
          file: relativePath,
          line: lineNumber,
          rule: "vue-style-block",
          message: "禁止在 Vue 组件内使用 <style>（请用 Tailwind utilities/primitives 或集中到 tailwind.css）",
          preview: line.trim()
        });
      }
      inVueStyleBlock = true;
    }

    for (const rule of rules) {
      if (isVueFile && inVueStyleBlock && rule.skipInVueStyleBlock) {
        continue;
      }
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

    if (isVueFile && /<\/style>/i.test(line)) {
      inVueStyleBlock = false;
    }
  }

  return violations;
}

/**
 * @returns {{file: string; line: number; rule: string; message: string; preview: string}[]}
 */
function scanStylesIndexImports() {
  const absoluteIndexPath = path.join(repoRoot, "src", "styles", "index.css");
  const content = readFileSync(absoluteIndexPath, "utf8");
  const lines = content.split(/\r?\n/);

  /** @type {{file: string; line: number; rule: string; message: string; preview: string}[]} */
  const violations = [];
  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index] ?? "";
    const match = line.match(/@import\s+['"]([^'"]+)['"]\s*;/);
    if (!match) {
      continue;
    }
    const importPath = match[1] ?? "";
    if (allowedStyleIndexImports.has(importPath)) {
      continue;
    }
    violations.push({
      file: styleIndexRelativePath,
      line: lineNumber,
      rule: "styles-index-import-whitelist",
      message: "src/styles/index.css 只允许导入 reset/themes/tokens/tailwind 白名单文件",
      preview: line.trim()
    });
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
  violations.push(...scanStylesIndexImports());

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
