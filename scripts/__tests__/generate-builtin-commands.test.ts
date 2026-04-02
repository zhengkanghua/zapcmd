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
  return mkdtempSync(path.join(tmpdir(), "zapcmd-yaml-generator-"));
}

function writeYamlFixture(sourceDir: string): void {
  mkdirSync(sourceDir, { recursive: true });
  writeFileSync(
    path.join(sourceDir, "_network.yaml"),
    [
      "meta:",
      "  name: 网络工具",
      "  moduleSlug: network",
      "",
      "commands:",
      "  - id: http-server",
      "    name: HTTP 服务",
      "    description: 启动本地 HTTP 服务",
      "    category: network",
      "    platform: all",
      "    exec:",
      "      program: python3",
      "      args:",
      "        - -m",
      "        - http.server",
      "        - \"{{port}}\"",
      "    adminRequired: false",
      "    args:",
      "      - key: port",
      "        label: 端口",
      "        type: number",
      "        required: true",
      "        default: \"3000\"",
      "        validation:",
      "          min: 1",
      "          max: 65535",
      "    prerequisites:",
      "      - id: python3",
      "        type: binary",
      "        required: true",
      "        check: binary:python3",
      "    tags:",
      "      - http",
      "      - server",
      "",
      "  - id: kill-port-win",
      "    name: 结束端口占用",
      "    category: network",
      "    platform: win",
      "    script:",
      "      runner: powershell",
      "      command: |",
      "        Stop-Process -Id {{pid}} -Force",
      "    adminRequired: false",
      "    args:",
      "      - key: pid",
      "        label: PID",
      "        type: number",
      "        required: true",
      "    prerequisites:",
      "      - id: powershell",
      "        type: shell",
      "        required: true",
      "        check: shell:powershell",
      "    tags:",
      "      - port",
      "      - kill"
    ].join("\n"),
    "utf8"
  );
}

function runNodeBuiltinGeneratorWith(
  args: string[],
  cwd = process.cwd()
): ReturnType<typeof spawnSync> {
  const result = spawnSync(
    "node",
    [path.resolve(process.cwd(), "scripts/commands/generate-builtin-commands.mjs"), ...args],
    {
      cwd,
      encoding: "utf8"
    }
  );

  if (result.error) {
    throw result.error;
  }

  return result;
}

describe("builtin command generator", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails fast for unknown cli flags", () => {
    const result = runNodeBuiltinGeneratorWith(["--unknown", "1"]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Unknown option");
  });

  it("prints usage for --help", () => {
    const result = runNodeBuiltinGeneratorWith(["--help"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Usage");
    expect(result.stdout).toContain("--sourceDir");
    expect(result.stdout).toContain("--generatedDocsDir");
  });

  it("rejects NaN expectedLogicalCount values", () => {
    const result = runNodeBuiltinGeneratorWith([
      "--sourceDir",
      "commands/catalog",
      "--expectedLogicalCount",
      "NaN"
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("expectedLogicalCount");
  });

  it("generates runtime json and module markdown from yaml sources", () => {
    const tempRoot = createTempWorkspace();
    tempDirs.push(tempRoot);

    const sourceDir = path.join(tempRoot, "catalog");
    const outputDir = path.join(tempRoot, "builtin");
    const manifestPath = path.join(outputDir, "index.json");
    const generatedDocsDir = path.join(tempRoot, "generated_docs");
    const generatedIndexPath = path.join(generatedDocsDir, "index.md");
    writeYamlFixture(sourceDir);

    const result = runNodeBuiltinGeneratorWith(
      [
        "--sourceDir",
        sourceDir,
        "--outputDir",
        outputDir,
        "--manifestPath",
        manifestPath,
        "--generatedDocsDir",
        generatedDocsDir,
        "--generatedIndexPath",
        generatedIndexPath
      ],
      tempRoot
    );

    expect(result.status).toBe(0);

    const generatedJsonPath = path.join(outputDir, "_network.json");
    const generatedDocPath = path.join(generatedDocsDir, "_network.md");

    expect(existsSync(generatedJsonPath)).toBe(true);
    expect(existsSync(generatedDocPath)).toBe(true);
    expect(existsSync(generatedIndexPath)).toBe(true);

    const generatedJson = readFileSync(generatedJsonPath, "utf8");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      generatedFiles: Array<{ sourceFile: string; docFile: string }>;
    };
    const generatedDoc = readFileSync(generatedDocPath, "utf8");
    const generatedIndex = readFileSync(generatedIndexPath, "utf8");

    expect(generatedJson).toContain('"exec"');
    expect(generatedJson).toContain('"script"');
    expect(manifest.generatedFiles[0]).toMatchObject({
      sourceFile: "_network.yaml",
      docFile: "_network.md"
    });
    expect(generatedDoc).toContain("此文件为自动生成");
    expect(generatedDoc).toContain("http-server");
    expect(generatedIndex).toContain("_network.md");
  });
});
