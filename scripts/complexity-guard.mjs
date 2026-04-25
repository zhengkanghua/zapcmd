import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { analyzeComplexity } from "./complexity-guard-lib.mjs";

const repoRoot = process.cwd();
const scanRoots = [
  path.join(repoRoot, "src"),
  path.join(repoRoot, "src-tauri", "src"),
  path.join(repoRoot, "scripts")
];

const allowedExtensions = new Set([".ts", ".vue", ".js", ".mjs", ".cjs", ".rs"]);

function normalizeToRepoRelativePath(absolutePath) {
  return path.relative(repoRoot, absolutePath).replaceAll("\\", "/");
}

function collectScanFiles(dirPath) {
  const files = [];
  if (!statSafe(dirPath)?.isDirectory()) {
    return files;
  }

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
    if (!allowedExtensions.has(path.extname(entry))) {
      continue;
    }
    files.push(absoluteEntryPath);
  }
  return files;
}

function statSafe(targetPath) {
  try {
    return statSync(targetPath);
  } catch {
    return null;
  }
}

function main() {
  const files = scanRoots.flatMap((root) => collectScanFiles(root)).map((absolutePath) => ({
    path: normalizeToRepoRelativePath(absolutePath),
    content: readFileSync(absolutePath, "utf8")
  }));

  const violations = analyzeComplexity({ files });
  if (violations.length === 0) {
    console.log("[complexity-guard] OK");
    return;
  }

  console.error(`[complexity-guard] 发现 ${violations.length} 处违规：`);
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line} ${violation.rule}  ${violation.message}`);
  }
  process.exit(1);
}

main();
