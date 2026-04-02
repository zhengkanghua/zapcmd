import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  migrateBuiltinCommandSources
} from "../commands/migrate-builtin-command-sources.mjs";

function createTempWorkspace(): string {
  return mkdtempSync(path.join(tmpdir(), "zapcmd-markdown-migrate-"));
}

function writeMarkdownFixtures(sourceDir: string): void {
  mkdirSync(sourceDir, { recursive: true });
  writeFileSync(
    path.join(sourceDir, "_docker.md"),
    [
      "# _docker",
      "",
      "> 分类：Docker",
      "> 运行时分类：docker",
      "",
      "| # | ID | 名称 | 运行时分类 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |",
      "|---|---|---|---|---|---|---|---|---|---|---|",
      "| 1 | `docker-ps` | Docker 列表 | docker | all | `docker ps` | - | - | false | binary:docker | docker ps |",
      "| 2 | `kill-port-win` | 结束端口占用 | docker | win | `Stop-Process -Id (Get-NetTCPConnection -LocalPort {{port}}).OwningProcess -Force` | port(number, min:1, max:65535) | ⚠️ | false | shell:powershell | powershell kill port |",
      "| 3 | `docker-export` | 导出容器 | docker | mac | `docker export {{container}} > {{file}}` | container(text), file(path) | - | false | binary:docker | docker export backup |"
    ].join("\n"),
    "utf8"
  );

  writeFileSync(
    path.join(sourceDir, "_sqlite.md"),
    [
      "# _sqlite",
      "",
      "> 分类：SQLite",
      "> 运行时分类：sqlite",
      "",
      "| # | ID | 名称 | 运行时分类 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |",
      "|---|---|---|---|---|---|---|---|---|---|---|",
      "| 1 | `sqlite-query` | SQLite 执行 SQL | sqlite | all | `sqlite3 \"{{file}}\" \"{{sql}}\"` | file(path), sql(text) | - | false | binary:sqlite3 | sqlite query sql |"
    ].join("\n"),
    "utf8"
  );

  writeFileSync(
    path.join(sourceDir, "_network.md"),
    [
      "# _network",
      "",
      "> 分类：网络工具",
      "> 运行时分类：network",
      "",
      "| # | ID | 名称 | 运行时分类 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |",
      "|---|---|---|---|---|---|---|---|---|---|---|",
      "| 1 | `query-port-netstat` | 查询端口占用 | network | win | `netstat -ano | findstr :{{port}}` | port(number, min:1, max:65535) | - | false | - | netstat port findstr |"
    ].join("\n"),
    "utf8"
  );

  writeFileSync(
    path.join(sourceDir, "_dev.md"),
    [
      "# _dev",
      "",
      "> 分类：开发工具",
      "> 运行时分类：dev",
      "",
      "| # | ID | 名称 | 运行时分类 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |",
      "|---|---|---|---|---|---|---|---|---|---|---|",
      "| 1 | `timestamp-now-win` | 当前 Unix 时间戳 | dev | win | `[DateTimeOffset]::Now.ToUnixTimeSeconds()` | - | - | false | shell:powershell | dev timestamp powershell |"
    ].join("\n"),
    "utf8"
  );
}

describe("migrate-builtin-command-sources", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("classifies markdown commands into exec, script, and stdin buckets", () => {
    const tempRoot = createTempWorkspace();
    tempDirs.push(tempRoot);

    const sourceDir = path.join(tempRoot, "command_sources");
    const outputDir = path.join(tempRoot, "catalog");
    writeMarkdownFixtures(sourceDir);

    const result = migrateBuiltinCommandSources({
      sourceDir,
      outputDir
    });

    expect(result.report.execIds).toContain("docker-ps");
    expect(result.report.scriptIds).toContain("kill-port-win");
    expect(result.report.stdinIds).toContain("sqlite-query");
    expect(result.report.highRiskIds).toContain("kill-port-win");

    const dockerYaml = readFileSync(path.join(outputDir, "_docker.yaml"), "utf8");
    const devYaml = readFileSync(path.join(outputDir, "_dev.yaml"), "utf8");
    const networkYaml = readFileSync(path.join(outputDir, "_network.yaml"), "utf8");
    const sqliteYaml = readFileSync(path.join(outputDir, "_sqlite.yaml"), "utf8");

    expect(dockerYaml).toContain("exec:");
    expect(dockerYaml).toContain("script:");
    expect(dockerYaml).toContain("id: bash");
    expect(dockerYaml).toContain("check: shell:bash");
    expect(devYaml).toContain("id: timestamp-now-win");
    expect(devYaml).toContain("script:");
    expect(devYaml).toContain("runner: powershell");
    expect(devYaml).toContain("[DateTimeOffset]::Now.ToUnixTimeSeconds()");
    expect(networkYaml).toContain("id: cmd");
    expect(networkYaml).toContain("check: shell:cmd");
    expect(sqliteYaml).toContain("stdinArgKey: sql");
  });
});
