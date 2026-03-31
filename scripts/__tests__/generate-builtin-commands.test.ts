import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

function createTempWorkspace(): string {
  return mkdtempSync(path.join(tmpdir(), "zapcmd-builtin-generator-"));
}

function writeMarkdownFixture(sourceDir: string): void {
  mkdirSync(sourceDir, { recursive: true });
  writeFileSync(
    path.join(sourceDir, "_network.md"),
    [
      "# _network",
      "",
      "> 分类：网络",
      "",
      "| # | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |",
      "|---|---|---|---|---|---|---|---|---|---|",
      "| 1 | `http-server` | HTTP 服务 | all | `python3 -m http.server {{port}} --bind {{host}}` | port(number, default:3000, min:1000, max:10000), host(text, default:127.0.0.1) | - | false | python3 | http server |"
    ].join("\n"),
    "utf8"
  );
}

function writeSplitPackageMarkdownFixtures(sourceDir: string): void {
  mkdirSync(sourceDir, { recursive: true });
  writeFileSync(
    path.join(sourceDir, "_npm.md"),
    [
      "# _npm",
      "",
      "> 分类：NPM",
      "> 运行时分类：package",
      "> 说明：此文件为 JSON 生成源（人维护）。",
      "",
      "| # | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |",
      "|---|---|---|---|---|---|---|---|---|---|",
      "| 1 | `npm-install` | NPM 安装依赖 | all | `npm install {{package}}` | package(text) | - | false | npm | npm install |"
    ].join("\n"),
    "utf8"
  );
  writeFileSync(
    path.join(sourceDir, "_pnpm.md"),
    [
      "# _pnpm",
      "",
      "> 分类：PNPM",
      "> 运行时分类：package",
      "> 说明：此文件为 JSON 生成源（人维护）。",
      "",
      "| # | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |",
      "|---|---|---|---|---|---|---|---|---|---|",
      "| 1 | `pnpm-run` | PNPM 运行脚本 | all | `pnpm run {{script}}` | script(text) | - | false | pnpm | pnpm run |"
    ].join("\n"),
    "utf8"
  );
}

function writeBrokenMarkdownFixture(sourceDir: string): void {
  mkdirSync(sourceDir, { recursive: true });
  writeFileSync(
    path.join(sourceDir, "_npm.md"),
    [
      "# _npm",
      "",
      "> 运行时分类：package",
      "",
      "| # | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |",
      "|---|---|---|---|---|---|---|---|---|---|",
      "| 1 | `npm-install` | NPM 安装依赖 | all | `npm install {{package}}` | package(text) | - | false | npm | npm install |"
    ].join("\n"),
    "utf8"
  );
}

function resolvePwshExecutable(): string {
  const windowsPwshPath = "/mnt/c/Program Files/PowerShell/7/pwsh.exe";
  if (existsSync(windowsPwshPath)) {
    return windowsPwshPath;
  }
  return "pwsh";
}

function toPwshPath(filePath: string, executable: string): string {
  if (!executable.endsWith(".exe")) {
    return filePath;
  }

  const result = spawnSync("wslpath", ["-w", filePath], { encoding: "utf8" });
  if (result.error) {
    throw result.error;
  }
  if ((result.status ?? 1) !== 0) {
    throw new Error(result.stderr || `failed to convert path: ${filePath}`);
  }
  return result.stdout.trim();
}

describe("generate_builtin_commands.ps1", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("merges default with min/max into builtin arg validation output", () => {
    const tempRoot = createTempWorkspace();
    tempDirs.push(tempRoot);

    const sourceDir = path.join(tempRoot, "command_sources");
    const outputDir = path.join(tempRoot, "builtin");
    const manifestPath = path.join(tempRoot, "builtin", "index.json");
    const generatedMarkdownPath = path.join(tempRoot, "builtin_commands.generated.md");
    writeMarkdownFixture(sourceDir);
    const pwshExecutable = resolvePwshExecutable();

    const result = spawnSync(
      pwshExecutable,
      [
        "-NoLogo",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        path.resolve(process.cwd(), "scripts/generate_builtin_commands.ps1"),
        "-SourceDir",
        toPwshPath(sourceDir, pwshExecutable),
        "-OutputDir",
        toPwshPath(outputDir, pwshExecutable),
        "-ManifestPath",
        toPwshPath(manifestPath, pwshExecutable),
        "-GeneratedMarkdownPath",
        toPwshPath(generatedMarkdownPath, pwshExecutable)
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8"
      }
    );

    if (result.error) {
      throw result.error;
    }

    expect(result.status).toBe(0);
    const generatedJsonPath = path.join(outputDir, "_network.json");
    expect(existsSync(generatedJsonPath)).toBe(true);
    expect(existsSync(generatedMarkdownPath)).toBe(true);

    const generated = JSON.parse(readFileSync(generatedJsonPath, "utf8")) as {
      commands: Array<{
        args?: Array<{
          key: string;
          default?: string;
          validation?: { min?: number; max?: number };
        }>;
      }>;
    };

    expect(generated.commands).toHaveLength(1);
    expect(generated.commands[0]?.args?.[0]).toEqual({
      key: "port",
      label: "port",
      type: "number",
      required: true,
      default: "3000",
      validation: {
        min: 1000,
        max: 10000
      }
    });
  }, 60_000);

  it("rejects builtin source files whose filename is not a slug", () => {
    const tempRoot = createTempWorkspace();
    tempDirs.push(tempRoot);

    const sourceDir = path.join(tempRoot, "command_sources");
    const outputDir = path.join(tempRoot, "builtin");
    const manifestPath = path.join(tempRoot, "builtin", "index.json");
    const generatedMarkdownPath = path.join(tempRoot, "builtin_commands.generated.md");
    writeMarkdownFixture(sourceDir);
    writeFileSync(
      path.join(sourceDir, "_postgres_tools.md"),
      [
        "> 分类：Postgres Tools",
        "",
        "| # | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |",
        "|---|---|---|---|---|---|---|---|---|---|",
        "| 1 | `psql-shell` | Postgres Shell | all | `psql` | - | - | false | psql | postgres shell |"
      ].join("\n"),
      "utf8"
    );
    const pwshExecutable = resolvePwshExecutable();

    const result = spawnSync(
      pwshExecutable,
      [
        "-NoLogo",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        path.resolve(process.cwd(), "scripts/generate_builtin_commands.ps1"),
        "-SourceDir",
        toPwshPath(sourceDir, pwshExecutable),
        "-OutputDir",
        toPwshPath(outputDir, pwshExecutable),
        "-ManifestPath",
        toPwshPath(manifestPath, pwshExecutable),
        "-GeneratedMarkdownPath",
        toPwshPath(generatedMarkdownPath, pwshExecutable)
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8"
      }
    );

    if (result.error) {
      throw result.error;
    }

    expect(result.status).not.toBe(0);
    expect(`${result.stderr}\n${result.stdout}`).toContain("slug");
  }, 60_000);

  it("applies file-level runtime category override and records module metadata", () => {
    const tempRoot = createTempWorkspace();
    tempDirs.push(tempRoot);

    const sourceDir = path.join(tempRoot, "command_sources");
    const outputDir = path.join(tempRoot, "builtin");
    const manifestPath = path.join(tempRoot, "builtin", "index.json");
    const generatedMarkdownPath = path.join(tempRoot, "builtin_commands.generated.md");
    mkdirSync(sourceDir, { recursive: true });
    writeFileSync(
      path.join(sourceDir, "_pnpm.md"),
      [
        "# _pnpm",
        "",
        "> 分类：PNPM",
        "> 运行时分类：package",
        "> 说明：此文件为 JSON 生成源（人维护）。",
        "",
        "| # | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |",
        "|---|---|---|---|---|---|---|---|---|---|",
        "| 1 | `pnpm-run` | PNPM 运行脚本 | all | `pnpm run {{script}}` | script(text) | - | false | pnpm | pnpm run script |"
      ].join("\n"),
      "utf8"
    );
    const pwshExecutable = resolvePwshExecutable();

    const result = spawnSync(
      pwshExecutable,
      [
        "-NoLogo",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        path.resolve(process.cwd(), "scripts/generate_builtin_commands.ps1"),
        "-SourceDir",
        toPwshPath(sourceDir, pwshExecutable),
        "-OutputDir",
        toPwshPath(outputDir, pwshExecutable),
        "-ManifestPath",
        toPwshPath(manifestPath, pwshExecutable),
        "-GeneratedMarkdownPath",
        toPwshPath(generatedMarkdownPath, pwshExecutable)
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8"
      }
    );

    if (result.error) {
      throw result.error;
    }

    expect(result.status).toBe(0);

    const generatedJsonPath = path.join(outputDir, "_pnpm.json");
    const generated = JSON.parse(readFileSync(generatedJsonPath, "utf8")) as {
      commands: Array<{ category: string }>;
    };
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      generatedFiles: Array<{
        file: string;
        sourceFile: string;
        moduleSlug?: string;
        runtimeCategory?: string;
        logicalCount: number;
        physicalCount: number;
      }>;
    };
    const snapshot = readFileSync(generatedMarkdownPath, "utf8");

    expect(generated.commands[0]?.category).toBe("package");
    expect(manifest.generatedFiles[0]).toEqual({
      file: "_pnpm.json",
      sourceFile: "_pnpm.md",
      moduleSlug: "pnpm",
      runtimeCategory: "package",
      logicalCount: 1,
      physicalCount: 1
    });
    expect(snapshot).toContain("| File | Source | Module | Runtime Category | Logical | Physical |");
    expect(snapshot).toContain("| _pnpm.json | _pnpm.md | pnpm | package | 1 | 1 |");
  }, 60_000);

  it("falls back to file slug when runtime category is omitted", () => {
    const tempRoot = createTempWorkspace();
    tempDirs.push(tempRoot);

    const sourceDir = path.join(tempRoot, "command_sources");
    const outputDir = path.join(tempRoot, "builtin");
    const manifestPath = path.join(tempRoot, "builtin", "index.json");
    const generatedMarkdownPath = path.join(tempRoot, "builtin_commands.generated.md");
    mkdirSync(sourceDir, { recursive: true });
    writeFileSync(
      path.join(sourceDir, "_git.md"),
      [
        "# _git",
        "",
        "> 分类：Git",
        "> 说明：此文件为 JSON 生成源（人维护）。",
        "",
        "| # | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |",
        "|---|---|---|---|---|---|---|---|---|---|",
        "| 1 | `git-status` | Git 状态 | all | `git status` | - | - | false | git | git status |"
      ].join("\n"),
      "utf8"
    );
    const pwshExecutable = resolvePwshExecutable();

    const result = spawnSync(
      pwshExecutable,
      [
        "-NoLogo",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        path.resolve(process.cwd(), "scripts/generate_builtin_commands.ps1"),
        "-SourceDir",
        toPwshPath(sourceDir, pwshExecutable),
        "-OutputDir",
        toPwshPath(outputDir, pwshExecutable),
        "-ManifestPath",
        toPwshPath(manifestPath, pwshExecutable),
        "-GeneratedMarkdownPath",
        toPwshPath(generatedMarkdownPath, pwshExecutable)
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8"
      }
    );

    if (result.error) {
      throw result.error;
    }

    expect(result.status).toBe(0);

    const generatedJsonPath = path.join(outputDir, "_git.json");
    const generated = JSON.parse(readFileSync(generatedJsonPath, "utf8")) as {
      commands: Array<{ category: string }>;
    };
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      generatedFiles: Array<{ runtimeCategory?: string }>;
    };

    expect(generated.commands[0]?.category).toBe("git");
    expect(manifest.generatedFiles[0]?.runtimeCategory).toBe("git");
  }, 60_000);

  it("rejects missing or invalid header metadata", () => {
    const runFixture = (fileName: string, lines: string[]) => {
      const tempRoot = createTempWorkspace();
      tempDirs.push(tempRoot);

      const sourceDir = path.join(tempRoot, "command_sources");
      const outputDir = path.join(tempRoot, "builtin");
      const manifestPath = path.join(tempRoot, "builtin", "index.json");
      const generatedMarkdownPath = path.join(tempRoot, "builtin_commands.generated.md");
      mkdirSync(sourceDir, { recursive: true });
      writeFileSync(path.join(sourceDir, fileName), lines.join("\n"), "utf8");
      const pwshExecutable = resolvePwshExecutable();

      const result = spawnSync(
        pwshExecutable,
        [
          "-NoLogo",
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          path.resolve(process.cwd(), "scripts/generate_builtin_commands.ps1"),
          "-SourceDir",
          toPwshPath(sourceDir, pwshExecutable),
          "-OutputDir",
          toPwshPath(outputDir, pwshExecutable),
          "-ManifestPath",
          toPwshPath(manifestPath, pwshExecutable),
          "-GeneratedMarkdownPath",
          toPwshPath(generatedMarkdownPath, pwshExecutable)
        ],
        {
          cwd: process.cwd(),
          encoding: "utf8"
        }
      );

      if (result.error) {
        throw result.error;
      }

      return result;
    };

    const header = [
      "| # | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |",
      "|---|---|---|---|---|---|---|---|---|---|",
      "| 1 | `git-status` | Git 状态 | all | `git status` | - | - | false | git | git status |"
    ];

    const cases = [
      {
        name: "missing title",
        fileName: "_git.md",
        lines: ["> 分类：Git", "", ...header]
      },
      {
        name: "title mismatch",
        fileName: "_git.md",
        lines: ["# _docker", "", "> 分类：Git", "", ...header]
      },
      {
        name: "missing category",
        fileName: "_git.md",
        lines: ["# _git", "", "> 说明：此文件为 JSON 生成源（人维护）。", "", ...header]
      },
      {
        name: "duplicate runtime category",
        fileName: "_git.md",
        lines: [
          "# _git",
          "",
          "> 分类：Git",
          "> 运行时分类：git",
          "> 运行时分类：package",
          "",
          ...header
        ]
      },
      {
        name: "empty runtime category",
        fileName: "_git.md",
        lines: ["# _git", "", "> 分类：Git", "> 运行时分类：", "", ...header]
      },
      {
        name: "invalid runtime category",
        fileName: "_git.md",
        lines: ["# _git", "", "> 分类：Git", "> 运行时分类：Git", "", ...header]
      }
    ];

    for (const testCase of cases) {
      const result = runFixture(testCase.fileName, testCase.lines);
      expect(result.status, testCase.name).not.toBe(0);
      expect(`${result.stderr}\n${result.stdout}`.trim().length, testCase.name).toBeGreaterThan(0);
    }
  }, 60_000);

  it("removes stale builtin json files after a successful generation", () => {
    const tempRoot = createTempWorkspace();
    tempDirs.push(tempRoot);

    const sourceDir = path.join(tempRoot, "command_sources");
    const outputDir = path.join(tempRoot, "builtin");
    const manifestPath = path.join(tempRoot, "builtin", "index.json");
    const generatedMarkdownPath = path.join(tempRoot, "builtin_commands.generated.md");
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(path.join(outputDir, "_package.json"), '{"commands":[]}', "utf8");
    writeSplitPackageMarkdownFixtures(sourceDir);
    const pwshExecutable = resolvePwshExecutable();

    const result = spawnSync(
      pwshExecutable,
      [
        "-NoLogo",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        path.resolve(process.cwd(), "scripts/generate_builtin_commands.ps1"),
        "-SourceDir",
        toPwshPath(sourceDir, pwshExecutable),
        "-OutputDir",
        toPwshPath(outputDir, pwshExecutable),
        "-ManifestPath",
        toPwshPath(manifestPath, pwshExecutable),
        "-GeneratedMarkdownPath",
        toPwshPath(generatedMarkdownPath, pwshExecutable)
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8"
      }
    );

    if (result.error) {
      throw result.error;
    }

    expect(result.status).toBe(0);
    expect(existsSync(path.join(outputDir, "_package.json"))).toBe(false);
  }, 60_000);

  it("keeps stale builtin json files untouched when parsing fails", () => {
    const tempRoot = createTempWorkspace();
    tempDirs.push(tempRoot);

    const sourceDir = path.join(tempRoot, "command_sources");
    const outputDir = path.join(tempRoot, "builtin");
    const manifestPath = path.join(tempRoot, "builtin", "index.json");
    const generatedMarkdownPath = path.join(tempRoot, "builtin_commands.generated.md");
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(path.join(outputDir, "_package.json"), '{"commands":[]}', "utf8");
    writeBrokenMarkdownFixture(sourceDir);
    const pwshExecutable = resolvePwshExecutable();

    const result = spawnSync(
      pwshExecutable,
      [
        "-NoLogo",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        path.resolve(process.cwd(), "scripts/generate_builtin_commands.ps1"),
        "-SourceDir",
        toPwshPath(sourceDir, pwshExecutable),
        "-OutputDir",
        toPwshPath(outputDir, pwshExecutable),
        "-ManifestPath",
        toPwshPath(manifestPath, pwshExecutable),
        "-GeneratedMarkdownPath",
        toPwshPath(generatedMarkdownPath, pwshExecutable)
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8"
      }
    );

    if (result.error) {
      throw result.error;
    }

    expect(result.status).not.toBe(0);
    expect(existsSync(path.join(outputDir, "_package.json"))).toBe(true);
  }, 60_000);
});
