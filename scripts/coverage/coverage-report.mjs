import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const TARGET_THRESHOLD = 90;

function formatPercent(value) {
  if (Number.isNaN(value) || typeof value !== "number") return "n/a";
  return `${value.toFixed(2)}%`;
}

function toDisplayPath(filePath) {
  const relativePath = path.isAbsolute(filePath)
    ? path.relative(process.cwd(), filePath)
    : filePath;
  return relativePath.replaceAll("\\", "/");
}

function parseIndexHtmlSummary(html) {
  const summary = {};
  const regex =
    /<span class="strong">([\d.]+)%\s*<\/span>\s*<span class="quiet">(Statements|Branches|Functions|Lines)<\/span>\s*<span class='fraction'>(\d+)\/(\d+)<\/span>/g;
  let match = null;
  while ((match = regex.exec(html)) !== null) {
    const percent = Number(match[1]);
    const label = match[2];
    const hit = Number(match[3]);
    const total = Number(match[4]);
    summary[label] = { percent, hit, total };
  }
  return summary;
}

function parseLcov(text) {
  const records = [];
  let current = null;

  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("SF:")) {
      current = {
        file: line.slice("SF:".length),
        linesFound: 0,
        linesHit: 0,
        functionsFound: 0,
        functionsHit: 0,
        branchesFound: 0,
        branchesHit: 0
      };
      continue;
    }

    if (!current) continue;

    if (line.startsWith("LF:")) {
      current.linesFound = Number(line.slice("LF:".length));
      continue;
    }
    if (line.startsWith("LH:")) {
      current.linesHit = Number(line.slice("LH:".length));
      continue;
    }
    if (line.startsWith("FNF:")) {
      current.functionsFound = Number(line.slice("FNF:".length));
      continue;
    }
    if (line.startsWith("FNH:")) {
      current.functionsHit = Number(line.slice("FNH:".length));
      continue;
    }
    if (line.startsWith("BRF:")) {
      current.branchesFound = Number(line.slice("BRF:".length));
      continue;
    }
    if (line.startsWith("BRH:")) {
      current.branchesHit = Number(line.slice("BRH:".length));
      continue;
    }
    if (line === "end_of_record") {
      records.push(current);
      current = null;
    }
  }

  return records;
}

function pct(hit, found) {
  if (!found) return 100;
  return (hit / found) * 100;
}

function printSummaryFromIndexHtml(summary) {
  const order = ["Statements", "Branches", "Functions", "Lines"];
  const zh = {
    Statements: "Statements（语句）",
    Branches: "Branches（分支）",
    Functions: "Functions（函数）",
    Lines: "Lines（行）"
  };

  console.log("");
  console.log("========== 覆盖率总览（All files） ==========");
  for (const key of order) {
    const item = summary[key];
    if (!item) {
      console.log(`- ${zh[key]}: n/a（未能从 coverage/index.html 解析）`);
      continue;
    }
    const gap = item.percent - TARGET_THRESHOLD;
    const gapText = gap >= 0 ? `+${gap.toFixed(2)}%` : `${gap.toFixed(2)}%`;
    console.log(
      `- ${zh[key]}: ${formatPercent(item.percent)} (${item.hit}/${item.total})  门槛: ${TARGET_THRESHOLD}%  差距: ${gapText}`
    );
  }
}

function printTopDeficits(records) {
  const byMissingBranches = records
    .map((r) => {
      const missing = Math.max(0, r.branchesFound - r.branchesHit);
      return {
        ...r,
        file: toDisplayPath(r.file),
        branchesPct: pct(r.branchesHit, r.branchesFound),
        branchesMissing: missing
      };
    })
    .filter((r) => r.branchesFound > 0 && r.branchesMissing > 0)
    .sort((a, b) => b.branchesMissing - a.branchesMissing)
    .slice(0, 20);

  console.log("");
  console.log("========== Top 缺失分支（按缺失数降序） ==========");
  if (byMissingBranches.length === 0) {
    console.log("(没有缺失分支，或 lcov 中未包含分支统计)");
  } else {
    for (let i = 0; i < byMissingBranches.length; i += 1) {
      const r = byMissingBranches[i];
      console.log(
        `${String(i + 1).padStart(2, " ")}. ${r.file}  branches ${formatPercent(
          r.branchesPct
        )}  miss ${r.branchesMissing} (${r.branchesHit}/${r.branchesFound})`
      );
    }
  }

  const byMissingLines = records
    .map((r) => {
      const missing = Math.max(0, r.linesFound - r.linesHit);
      return {
        ...r,
        file: toDisplayPath(r.file),
        linesPct: pct(r.linesHit, r.linesFound),
        linesMissing: missing
      };
    })
    .filter((r) => r.linesFound > 0 && r.linesMissing > 0)
    .sort((a, b) => b.linesMissing - a.linesMissing)
    .slice(0, 20);

  console.log("");
  console.log("========== Top 缺失行（按缺失数降序） ==========");
  if (byMissingLines.length === 0) {
    console.log("(没有缺失行，或 lcov 中未包含行统计)");
  } else {
    for (let i = 0; i < byMissingLines.length; i += 1) {
      const r = byMissingLines[i];
      console.log(
        `${String(i + 1).padStart(2, " ")}. ${r.file}  lines ${formatPercent(
          r.linesPct
        )}  miss ${r.linesMissing} (${r.linesHit}/${r.linesFound})`
      );
    }
  }
}

function main() {
  const coverageDir = path.resolve("coverage");
  const lcovPath = path.join(coverageDir, "lcov.info");
  const indexHtmlPath = path.join(coverageDir, "index.html");

  const haveIndex = existsSync(indexHtmlPath);
  const haveLcov = existsSync(lcovPath);

  if (!haveIndex && !haveLcov) {
    console.log("");
    console.log("========== 覆盖率诊断 ==========");
    console.log(
      "未找到 coverage 输出（coverage/index.html 或 coverage/lcov.info）。请先运行：npm run test:coverage"
    );
    process.exitCode = 1;
    return;
  }

  if (haveIndex) {
    const html = readFileSync(indexHtmlPath, "utf8");
    const summary = parseIndexHtmlSummary(html);
    printSummaryFromIndexHtml(summary);
  } else {
    console.log("");
    console.log("========== 覆盖率总览（All files） ==========");
    console.log("- 未找到 coverage/index.html，无法输出 Statements/Lines 等总览。");
  }

  if (haveLcov) {
    const lcov = readFileSync(lcovPath, "utf8");
    const records = parseLcov(lcov);
    printTopDeficits(records);
  } else {
    console.log("");
    console.log("========== Top deficits ==========");
    console.log("- 未找到 coverage/lcov.info，无法计算 Top 缺失分支/缺失行。");
  }

  console.log("");
  console.log(`HTML 报告入口：${toDisplayPath(indexHtmlPath)}`);
}

main();

