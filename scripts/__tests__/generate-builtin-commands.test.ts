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
      "> 分类：网络",
      "",
      "| # | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |",
      "|---|---|---|---|---|---|---|---|---|---|",
      "| 1 | `http-server` | HTTP 服务 | all | `python3 -m http.server {{port}} --bind {{host}}` | port(number, default:3000, min:1000, max:10000), host(text, default:127.0.0.1) | - | false | python3 | http server |"
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
  }, 30_000);
});
