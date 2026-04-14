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
      "        displayName:",
      "          zh-CN: Python 3",
      "        resolutionHint:",
      "          zh-CN: 安装 Python 3 后重试",
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

function writeLocalizedCatalogFixture(sourceDir: string): void {
  mkdirSync(sourceDir, { recursive: true });
  writeFileSync(
    path.join(sourceDir, "_network.yaml"),
    [
      "meta:",
      "  moduleSlug: network",
      "",
      "commands:",
      "  - id: http-server",
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
      "        type: number",
      "        required: true",
      "        default: \"3000\"",
      "      - key: host",
      "        type: string",
      "        default: \"0.0.0.0\"",
      "  - id: kill-port",
      "    category: network",
      "    platform: win",
      "    script:",
      "      runner: powershell",
      "      command: |",
      "        Stop-Process -Id {{pid}} -Force",
      "    adminRequired: false",
      "    args:",
      "      - key: pid",
      "        type: number",
      "        required: true",
      ""
    ].join("\n"),
    "utf8"
  );

  const localesDir = path.join(sourceDir, "locales");
  const zhDir = path.join(localesDir, "zh");
  const enDir = path.join(localesDir, "en");
  mkdirSync(zhDir, { recursive: true });
  mkdirSync(enDir, { recursive: true });

  writeFileSync(
    path.join(localesDir, "config.yaml"),
    [
      "defaultLocale: zh",
      "requiredBuiltinLocales:",
      "  - zh",
      "  - en",
      "supportedLocales:",
      "  - zh",
      "  - en",
      "fallbackOrder:",
      "  zh-CN:",
      "    - zh",
      "    - en",
      "  zh:",
      "    - zh",
      "    - en",
      "  en-US:",
      "    - en",
      "    - zh",
      "  en:",
      "    - en",
      "    - zh"
    ].join("\n"),
    "utf8"
  );

  writeFileSync(
    path.join(zhDir, "_network.yaml"),
    [
      "meta:",
      "  name: 网络工具",
      "commands:",
      "  kill-port:",
      "    name: 结束端口占用",
      "    args:",
      "      pid:",
      "        label: 进程 ID",
      "        placeholder: 填写 PID",
      "  http-server:",
      "    name: 网络 HTTP 服务",
      "    args:",
      "      host:",
      "        label: 绑定地址",
      "        placeholder: 例如 0.0.0.0",
      "      port:",
      "        label: 端口",
      "        placeholder: 端口号"
    ].join("\n"),
    "utf8"
  );

  writeFileSync(
    path.join(enDir, "_network.yaml"),
    [
      "meta:",
      "  name: Network utility",
      "commands:",
      "  kill-port:",
      "    name: Kill port",
      "    args:",
      "      pid:",
      "        label: PID",
      "        placeholder: Enter PID",
      "  http-server:",
      "    name: HTTP Server",
      "    args:",
      "      host:",
      "        label: Host",
      "        placeholder: Bind host",
      "      port:",
      "        label: Port",
      "        placeholder: Enter port"
    ].join("\n"),
    "utf8"
  );
}

function runLocalizedGenerator(tempRoot: string) {
  const sourceDir = path.join(tempRoot, "catalog");
  writeLocalizedCatalogFixture(sourceDir);
  const outputDir = path.join(tempRoot, "builtin");
  const manifestPath = path.join(outputDir, "index.json");
  const generatedDocsDir = path.join(tempRoot, "generated_docs");
  const generatedIndexPath = path.join(generatedDocsDir, "index.md");

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

  const generatedJsonPath = path.join(outputDir, "_network.json");
  return { result, generatedJsonPath, manifestPath };
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

function readRepoBuiltinJson<T>(fileName: string): T {
  return JSON.parse(
    readFileSync(
      path.resolve(process.cwd(), "assets/runtime_templates/commands/builtin", fileName),
      "utf8"
    )
  ) as T;
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

  it("merges base yaml with zh/en overlays into localized runtime json", () => {
    const tempRoot = createTempWorkspace();
    tempDirs.push(tempRoot);

    const { result, generatedJsonPath } = runLocalizedGenerator(tempRoot);
    expect(result.status).toBe(0);

    const runtimeJson = JSON.parse(readFileSync(generatedJsonPath, "utf8"));

    expect(runtimeJson._meta.name).toEqual({
      zh: "网络工具",
      en: "Network utility"
    });

    const httpCommand = runtimeJson.commands.find((command: { id: string }) => command.id === "http-server");
    expect(httpCommand).toBeDefined();
    expect(httpCommand?.name).toEqual({
      zh: "网络 HTTP 服务",
      en: "HTTP Server"
    });

    const args = httpCommand?.args ?? [];
    const portArg = args.find((arg: { key: string }) => arg.key === "port");
    expect(portArg).toBeDefined();
    expect(portArg?.label).toEqual({
      zh: "端口",
      en: "Port"
    });
    expect(portArg?.placeholder).toEqual({
      zh: "端口号",
      en: "Enter port"
    });

    const hostArg = args.find((arg: { key: string }) => arg.key === "host");
    expect(hostArg).toBeDefined();
    expect(hostArg?.label).toEqual({
      zh: "绑定地址",
      en: "Host"
    });
    expect(hostArg?.placeholder).toEqual({
      zh: "例如 0.0.0.0",
      en: "Bind host"
    });
  });

  it("writes localeConfig into builtin manifest index", () => {
    const tempRoot = createTempWorkspace();
    tempDirs.push(tempRoot);

    const { result, manifestPath } = runLocalizedGenerator(tempRoot);
    expect(result.status).toBe(0);

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    expect(manifest.localeConfig).toMatchObject({
      defaultLocale: "zh",
      requiredBuiltinLocales: ["zh", "en"],
      supportedLocales: ["zh", "en"],
      fallbackOrder: {
        "zh-CN": ["zh", "en"],
        zh: ["zh", "en"],
        "en-US": ["en", "zh"],
        en: ["en", "zh"]
      }
    });
  });

  it("emits zh/en localized runtime json for pilot builtin modules", () => {
    const gitModule = readRepoBuiltinJson<{
      _meta: { name: unknown };
      commands: Array<{ id: string; name?: unknown }>;
    }>("_git.json");
    const networkModule = readRepoBuiltinJson<{
      _meta: { name: unknown };
      commands: Array<{ id: string; name?: unknown; args?: Array<{ key: string; label?: unknown }> }>;
    }>("_network.json");
    const dockerModule = readRepoBuiltinJson<{
      _meta: { name: unknown };
      commands: Array<{ id: string; name?: unknown }>;
    }>("_docker.json");
    const devModule = readRepoBuiltinJson<{
      _meta: { name: unknown };
      commands: Array<{ id: string; name?: unknown }>;
    }>("_dev.json");
    const manifest = readRepoBuiltinJson<{
      localeConfig?: {
        defaultLocale: string;
        requiredBuiltinLocales: string[];
        supportedLocales: string[];
        fallbackOrder: Record<string, string[]>;
      };
    }>("index.json");

    expect(gitModule._meta.name).toEqual({
      zh: "Git 版本控制",
      en: "Git Version Control"
    });
    expect(gitModule.commands.find((command) => command.id === "git-status")?.name).toEqual({
      zh: "查看仓库状态",
      en: "Show Repository Status"
    });

    expect(networkModule._meta.name).toEqual({
      zh: "网络工具",
      en: "Network Tools"
    });
    expect(networkModule.commands.find((command) => command.id === "query-port-netstat")?.name).toEqual({
      zh: "查询端口占用 (netstat)",
      en: "Check Port Usage (netstat)"
    });
    expect(
      networkModule.commands
        .find((command) => command.id === "query-port-netstat")
        ?.args?.find((arg) => arg.key === "port")?.label
    ).toEqual({
      zh: "端口",
      en: "Port"
    });

    expect(dockerModule._meta.name).toEqual({
      zh: "Docker 容器管理",
      en: "Docker Container Management"
    });
    expect(dockerModule.commands.find((command) => command.id === "docker-ps")?.name).toEqual({
      zh: "查看运行中容器",
      en: "List Running Containers"
    });

    expect(devModule._meta.name).toEqual({
      zh: "开发工具",
      en: "Developer Tools"
    });
    expect(devModule.commands.find((command) => command.id === "jq-format-json")?.name).toEqual({
      zh: "使用 jq 格式化 JSON 文件",
      en: "Format JSON with jq"
    });

    expect(manifest.localeConfig).toEqual({
      defaultLocale: "zh",
      requiredBuiltinLocales: ["zh", "en"],
      supportedLocales: ["zh", "en"],
      fallbackOrder: {
        "zh-CN": ["zh", "en"],
        zh: ["zh", "en"],
        "en-US": ["en", "zh"],
        en: ["en", "zh"]
      }
    });
  });

  it("fails fast when a required builtin locale overlay is missing", () => {
    const tempRoot = createTempWorkspace();
    tempDirs.push(tempRoot);

    const sourceDir = path.join(tempRoot, "catalog");
    writeLocalizedCatalogFixture(sourceDir);
    rmSync(path.join(sourceDir, "locales", "en", "_network.yaml"));

    const result = runNodeBuiltinGeneratorWith(
      [
        "--sourceDir",
        sourceDir
      ],
      tempRoot
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Missing required builtin locale overlay");
    expect(result.stderr).toContain("_network.yaml");
    expect(result.stderr).toContain("en");
  });

  it("rejects inline localized text fields in base yaml after chunk 4", () => {
    const tempRoot = createTempWorkspace();
    tempDirs.push(tempRoot);

    const sourceDir = path.join(tempRoot, "catalog");
    writeYamlFixture(sourceDir);

    const result = runNodeBuiltinGeneratorWith(
      [
        "--sourceDir",
        sourceDir
      ],
      tempRoot
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("must not define localized text in base yaml");
    expect(result.stderr).toContain("meta.name");
  });
});
