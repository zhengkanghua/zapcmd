import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createReadFailedIssue,
  getBuiltinCommandPayloadBuildCountForTest,
  loadCommandTemplatesFromPayloadEntries,
  loadBuiltinCommandTemplates,
  loadBuiltinCommandPayloadEntries,
  loadBuiltinCommandTemplatesWithReport,
  loadUserCommandTemplatesWithReport
} from "../runtimeLoader";
import { setAppLocale } from "../../../i18n";

describe("runtimeLoader", () => {
  afterEach(() => {
    setAppLocale("zh-CN");
  });

  it("loads templates directly from cached payload entries", () => {
    const loaded = loadCommandTemplatesFromPayloadEntries(
      [
        {
          sourceId: "C:/Users/test/.zapcmd/commands/cached.json",
          payload: {
            commands: [
              {
                id: "custom-cached",
                name: "Cached Command",
                tags: ["custom"],
                category: "custom",
                platform: "win",
                exec: {
                  program: "echo",
                  args: ["cached"]
                },
                adminRequired: false
              }
            ]
          }
        }
      ],
      { runtimePlatform: "win" }
    );

    expect(loaded.templates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "custom-cached",
          title: "Cached Command"
        })
      ])
    );
    expect(loaded.sourceByCommandId["custom-cached"]).toBe(
      "C:/Users/test/.zapcmd/commands/cached.json"
    );
    expect(loaded.issues).toHaveLength(0);
  });

  it("reuses builtin payload entry cache across repeated reads", () => {
    const before = getBuiltinCommandPayloadBuildCountForTest();

    const first = loadBuiltinCommandPayloadEntries();
    const afterFirst = getBuiltinCommandPayloadBuildCountForTest();
    const second = loadBuiltinCommandPayloadEntries();

    expect(second).toBe(first);
    expect(afterFirst === before || afterFirst === before + 1).toBe(true);
    expect(getBuiltinCommandPayloadBuildCountForTest()).toBe(afterFirst);
  });

  it("loads command templates for current platform", () => {
    const templates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });
    expect(templates.length).toBeGreaterThan(50);
    expect(templates.some((item) => item.id === "docker-ps")).toBe(true);
  });

  it("maps pilot builtin overlays to english runtime templates when locale is en-US", () => {
    setAppLocale("en-US");

    const templates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });
    const dockerPs = templates.find((item) => item.id === "docker-ps");
    const queryPortNetstat = templates.find((item) => item.id === "query-port-netstat");
    const jqFormatJson = templates.find((item) => item.id === "jq-format-json");

    expect(dockerPs?.title).toBe("List Running Containers");
    expect(queryPortNetstat?.title).toBe("Check Port Usage (netstat)");
    expect(queryPortNetstat?.argLabel).toBe("Port");
    expect(jqFormatJson?.title).toBe("Format JSON with jq");
  });

  it("keeps builtin command ids stable across locale remap while switching localized runtime text", () => {
    const zhTemplates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });
    const zhDockerPs = zhTemplates.find((item) => item.id === "docker-ps");

    setAppLocale("en-US");

    const enTemplates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });
    const enDockerPs = enTemplates.find((item) => item.id === "docker-ps");

    expect(zhDockerPs?.id).toBe("docker-ps");
    expect(enDockerPs?.id).toBe("docker-ps");
    expect(zhDockerPs?.title).not.toBe(enDockerPs?.title);
    expect(enDockerPs?.title).toBe("List Running Containers");
  });

  it("does not model shell builtins or powershell cmdlets as binary prerequisites", () => {
    const templates = loadBuiltinCommandTemplates({ runtimePlatform: "all" });
    const invalidBinaryPrerequisites = new Set([
      "echo",
      "get-childitem",
      "get-content",
      "measure-object",
      "get-process",
      "get-psdrive",
      "select-string",
      "select-object",
      "sort-object",
      "stop-process",
      "get-nettcpconnection",
      "test-netconnection",
      "compress-archive",
      "expand-archive"
    ]);

    const offenders = templates.flatMap((item) =>
      (item.prerequisites ?? [])
        .filter(
          (prerequisite) =>
            prerequisite.type === "binary" &&
            invalidBinaryPrerequisites.has(prerequisite.id)
        )
        .map((prerequisite) => `${item.id}:${prerequisite.id}`)
    );

    expect(offenders).toEqual([]);
  });

  it("does not keep generic shell prerequisite in builtin templates", () => {
    const templates = loadBuiltinCommandTemplates({ runtimePlatform: "all" });
    const offenders = templates.flatMap((item) =>
      (item.prerequisites ?? [])
        .filter((prerequisite) => prerequisite.type === "shell" && prerequisite.check === "shell:shell")
        .map((prerequisite) => `${item.id}:${prerequisite.id}`)
    );

    expect(offenders).toEqual([]);
  });

  it("keeps powershell prerequisite for powershell builtin commands without cmdlet-level binary checks", () => {
    const templates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });
    const command = templates.find((item) => item.id === "kill-port-win");

    expect(command?.prerequisites).toEqual([
      {
        id: "powershell",
        type: "shell",
        required: true,
        check: "shell:powershell",
        installHint: "",
        fallbackCommandId: undefined
      }
    ]);
  });

  it("only keeps prerequisite checks for explicit external dependencies", () => {
    const allTemplates = loadBuiltinCommandTemplates({ runtimePlatform: "all" });
    const winTemplates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });

    const dockerPs = allTemplates.find((item) => item.id === "docker-ps");
    const sshConfigList = allTemplates.find((item) => item.id === "ssh-config-list");
    const timestampNow = allTemplates.find((item) => item.id === "timestamp-now");
    const localIpWin = winTemplates.find((item) => item.id === "local-ip-win");

    expect(dockerPs?.prerequisites).toEqual([
      {
        id: "docker",
        type: "binary",
        required: true,
        check: "binary:docker",
        installHint: "",
        fallbackCommandId: undefined
      }
    ]);
    expect(sshConfigList?.prerequisites ?? []).toEqual([]);
    expect(timestampNow?.prerequisites ?? []).toEqual([]);
    expect(localIpWin?.prerequisites ?? []).toEqual([]);
  });

  it("filters out non-target platform templates", () => {
    const winTemplates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });
    expect(winTemplates.some((item) => item.id === "base64-encode-mac")).toBe(false);
    expect(winTemplates.some((item) => item.id === "base64-encode-linux")).toBe(false);
  });

  it("keeps command ids unique after loading", () => {
    const templates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });
    const ids = templates.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("exposes redis builtin category after source split", () => {
    const templates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });

    expect(templates.some((item) => item.category === "redis")).toBe(true);
    expect(templates.some((item) => item.category === "database")).toBe(false);
  });

  it("loads mysql/postgres/sqlite builtin categories", () => {
    const templates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });

    expect(templates.some((item) => item.category === "mysql")).toBe(true);
    expect(templates.some((item) => item.category === "postgres")).toBe(true);
    expect(templates.some((item) => item.category === "sqlite")).toBe(true);
  });

  it("loads database observability builtin commands", () => {
    const templates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });

    expect(templates.some((item) => item.id === "postgres-version")).toBe(true);
    expect(templates.some((item) => item.id === "postgres-current-db")).toBe(true);
    expect(templates.some((item) => item.id === "postgres-current-user")).toBe(true);
    expect(templates.some((item) => item.id === "postgres-list-extensions")).toBe(true);
    expect(templates.some((item) => item.id === "postgres-db-size")).toBe(true);
    expect(templates.some((item) => item.id === "postgres-active-queries")).toBe(true);

    expect(templates.some((item) => item.id === "mysql-version")).toBe(true);
    expect(templates.some((item) => item.id === "mysql-processlist")).toBe(true);
    expect(templates.some((item) => item.id === "mysql-show-status")).toBe(true);
    expect(templates.some((item) => item.id === "mysql-show-variables")).toBe(true);

    expect(templates.some((item) => item.id === "redis-dbsize")).toBe(true);
    expect(templates.some((item) => item.id === "redis-memory")).toBe(true);
    expect(templates.some((item) => item.id === "redis-client-list")).toBe(true);
    expect(templates.some((item) => item.id === "redis-slowlog-get")).toBe(true);
    expect(templates.some((item) => item.id === "redis-config-get")).toBe(true);

    expect(templates.some((item) => item.id === "sqlite-table-info")).toBe(true);
    expect(templates.some((item) => item.id === "sqlite-index-list")).toBe(true);
    expect(templates.some((item) => item.id === "sqlite-pragma-journal-mode")).toBe(true);
    expect(templates.some((item) => item.id === "sqlite-foreign-key-check")).toBe(true);
  });

  it("loads kubernetes builtin category", () => {
    const templates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });

    expect(templates.some((item) => item.category === "kubernetes")).toBe(true);
  });

  it("loads second-round network builtin commands with correct platform split", () => {
    const winTemplates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });
    const macTemplates = loadBuiltinCommandTemplates({ runtimePlatform: "mac" });
    const linuxTemplates = loadBuiltinCommandTemplates({ runtimePlatform: "linux" });

    expect(winTemplates.some((item) => item.id === "curl-json-get")).toBe(true);
    expect(winTemplates.some((item) => item.id === "curl-json-post")).toBe(true);
    expect(winTemplates.some((item) => item.id === "curl-json-put")).toBe(true);
    expect(winTemplates.some((item) => item.id === "curl-json-delete")).toBe(true);
    expect(winTemplates.some((item) => item.id === "curl-form-post")).toBe(true);
    expect(winTemplates.some((item) => item.id === "http-status-only-win")).toBe(true);
    expect(winTemplates.some((item) => item.id === "whois-mac")).toBe(false);
    expect(winTemplates.some((item) => item.id === "dig-short-mac")).toBe(false);
    expect(winTemplates.some((item) => item.id === "dig-short-linux")).toBe(false);

    expect(macTemplates.some((item) => item.id === "http-status-only-mac")).toBe(true);
    expect(macTemplates.some((item) => item.id === "whois-mac")).toBe(true);
    expect(macTemplates.some((item) => item.id === "dig-short-mac")).toBe(true);

    expect(linuxTemplates.some((item) => item.id === "http-status-only-linux")).toBe(true);
    expect(linuxTemplates.some((item) => item.id === "whois-linux")).toBe(true);
    expect(linuxTemplates.some((item) => item.id === "dig-short-linux")).toBe(true);
  });

  it("loads second-round dev builtin commands", () => {
    const winTemplates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });
    const macTemplates = loadBuiltinCommandTemplates({ runtimePlatform: "mac" });
    const linuxTemplates = loadBuiltinCommandTemplates({ runtimePlatform: "linux" });

    expect(winTemplates.some((item) => item.id === "jq-format-json")).toBe(true);
    expect(winTemplates.some((item) => item.id === "jwt-decode")).toBe(true);
    expect(winTemplates.some((item) => item.id === "epoch-ms-now-win")).toBe(true);
    expect(winTemplates.some((item) => item.id === "epoch-ms-convert-win")).toBe(true);
    expect(winTemplates.some((item) => item.id === "uuid-gen-win")).toBe(true);
    expect(winTemplates.some((item) => item.id === "base64-encode-win")).toBe(true);
    expect(winTemplates.some((item) => item.id === "base64-decode-win")).toBe(true);
    expect(winTemplates.some((item) => item.id === "sha256-hash-win")).toBe(true);
    expect(winTemplates.some((item) => item.id === "regex-test-win")).toBe(true);

    expect(macTemplates.some((item) => item.id === "epoch-ms-now-mac")).toBe(true);
    expect(macTemplates.some((item) => item.id === "epoch-ms-convert-mac")).toBe(true);
    expect(macTemplates.some((item) => item.id === "uuid-gen-win")).toBe(false);

    expect(linuxTemplates.some((item) => item.id === "epoch-ms-now-linux")).toBe(true);
    expect(linuxTemplates.some((item) => item.id === "epoch-ms-convert-linux")).toBe(true);
    expect(linuxTemplates.some((item) => item.id === "uuid-gen-win")).toBe(false);
  });

  it("loads cwd-transparent package builtin commands without introducing new categories", () => {
    const templates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });

    expect(templates.some((item) => item.id === "npm-install-project")).toBe(true);
    expect(templates.some((item) => item.id === "npm-ci")).toBe(true);
    expect(templates.some((item) => item.id === "npx-run")).toBe(true);
    expect(templates.some((item) => item.id === "pnpm-add")).toBe(true);
    expect(templates.some((item) => item.id === "pnpm-run")).toBe(true);
    expect(templates.some((item) => item.id === "pnpm-up")).toBe(true);
    expect(templates.some((item) => item.id === "pnpm-install-project")).toBe(true);
    expect(templates.some((item) => item.id === "pnpm-add-dev")).toBe(true);
    expect(templates.some((item) => item.id === "pnpm-dlx")).toBe(true);
    expect(templates.some((item) => item.id === "bun-install")).toBe(true);
    expect(templates.some((item) => item.id === "bun-run")).toBe(true);
    expect(templates.some((item) => item.id === "yarn-add")).toBe(true);
    expect(templates.some((item) => item.id === "yarn-install-project")).toBe(true);
    expect(templates.some((item) => item.id === "yarn-add-dev")).toBe(true);
    expect(templates.some((item) => item.id === "yarn-dlx")).toBe(true);

    expect(templates.some((item) => item.id === "pnpm-install")).toBe(false);
    expect(templates.some((item) => item.id === "yarn-install")).toBe(false);

    expect(templates.some((item) => item.category === "pnpm")).toBe(false);
    expect(templates.some((item) => item.category === "bun")).toBe(false);
  });

  it("loads split package modules without introducing new runtime categories", () => {
    const loaded = loadBuiltinCommandTemplatesWithReport({ runtimePlatform: "all" });
    const categories = new Set(loaded.templates.map((item) => item.category));

    expect(loaded.templates.some((item) => item.id === "npm-install")).toBe(true);
    expect(loaded.templates.some((item) => item.id === "npm-install-project")).toBe(true);
    expect(loaded.templates.some((item) => item.id === "npm-ci")).toBe(true);
    expect(loaded.templates.some((item) => item.id === "npx-run")).toBe(true);
    expect(loaded.templates.some((item) => item.id === "pnpm-add")).toBe(true);
    expect(loaded.templates.some((item) => item.id === "pnpm-run")).toBe(true);
    expect(loaded.templates.some((item) => item.id === "pnpm-remove")).toBe(true);
    expect(loaded.templates.some((item) => item.id === "pnpm-list")).toBe(true);
    expect(loaded.templates.some((item) => item.id === "pnpm-install-project")).toBe(true);
    expect(loaded.templates.some((item) => item.id === "pnpm-add-dev")).toBe(true);
    expect(loaded.templates.some((item) => item.id === "pnpm-dlx")).toBe(true);
    expect(loaded.templates.some((item) => item.id === "pnpm-install")).toBe(false);
    expect(loaded.templates.some((item) => item.id === "bun-run")).toBe(true);
    expect(loaded.templates.some((item) => item.id === "bun-add")).toBe(true);
    expect(loaded.templates.some((item) => item.id === "bun-remove")).toBe(true);
    expect(loaded.templates.some((item) => item.id === "yarn-add")).toBe(true);
    expect(loaded.templates.some((item) => item.id === "yarn-run")).toBe(true);
    expect(loaded.templates.some((item) => item.id === "yarn-remove")).toBe(true);
    expect(loaded.templates.some((item) => item.id === "yarn-upgrade")).toBe(true);
    expect(loaded.templates.some((item) => item.id === "yarn-install-project")).toBe(true);
    expect(loaded.templates.some((item) => item.id === "yarn-add-dev")).toBe(true);
    expect(loaded.templates.some((item) => item.id === "yarn-dlx")).toBe(true);
    expect(loaded.templates.some((item) => item.id === "yarn-install")).toBe(false);
    expect(loaded.templates.some((item) => item.id === "pip-freeze")).toBe(true);
    expect(loaded.templates.some((item) => item.id === "brew-list")).toBe(true);
    expect(loaded.templates.some((item) => item.id === "cargo-add")).toBe(true);

    expect(loaded.sourceByCommandId["npm-install"]).toContain("_npm.json");
    expect(loaded.sourceByCommandId["npm-install-project"]).toContain("_npm.json");
    expect(loaded.sourceByCommandId["npm-ci"]).toContain("_npm.json");
    expect(loaded.sourceByCommandId["npx-run"]).toContain("_npm.json");
    expect(loaded.sourceByCommandId["pnpm-add"]).toContain("_pnpm.json");
    expect(loaded.sourceByCommandId["pnpm-run"]).toContain("_pnpm.json");
    expect(loaded.sourceByCommandId["pnpm-remove"]).toContain("_pnpm.json");
    expect(loaded.sourceByCommandId["pnpm-list"]).toContain("_pnpm.json");
    expect(loaded.sourceByCommandId["pnpm-install-project"]).toContain("_pnpm.json");
    expect(loaded.sourceByCommandId["pnpm-add-dev"]).toContain("_pnpm.json");
    expect(loaded.sourceByCommandId["pnpm-dlx"]).toContain("_pnpm.json");
    expect(loaded.sourceByCommandId["bun-run"]).toContain("_bun.json");
    expect(loaded.sourceByCommandId["bun-add"]).toContain("_bun.json");
    expect(loaded.sourceByCommandId["bun-remove"]).toContain("_bun.json");
    expect(loaded.sourceByCommandId["yarn-add"]).toContain("_yarn.json");
    expect(loaded.sourceByCommandId["yarn-run"]).toContain("_yarn.json");
    expect(loaded.sourceByCommandId["yarn-remove"]).toContain("_yarn.json");
    expect(loaded.sourceByCommandId["yarn-upgrade"]).toContain("_yarn.json");
    expect(loaded.sourceByCommandId["yarn-install-project"]).toContain("_yarn.json");
    expect(loaded.sourceByCommandId["yarn-add-dev"]).toContain("_yarn.json");
    expect(loaded.sourceByCommandId["yarn-dlx"]).toContain("_yarn.json");
    expect(loaded.sourceByCommandId["pip-freeze"]).toContain("_pip.json");
    expect(loaded.sourceByCommandId["brew-list"]).toContain("_brew.json");
    expect(loaded.sourceByCommandId["cargo-add"]).toContain("_cargo.json");

    expect(categories.has("package")).toBe(true);
    expect(categories.has("pnpm")).toBe(false);
    expect(categories.has("bun")).toBe(false);
    expect(
      loaded.issues.some((item) => item.code === "duplicate-id" && item.sourceId.includes("_package.json"))
    ).toBe(false);
  });

  it("loads docker and kubernetes coverage additions", () => {
    const templates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });

    expect(templates.some((item) => item.id === "docker-compose-ps")).toBe(true);
    expect(templates.some((item) => item.id === "docker-system-df")).toBe(true);
    expect(templates.some((item) => item.id === "docker-compose-config")).toBe(true);
    expect(templates.some((item) => item.id === "docker-compose-pull")).toBe(true);
    expect(templates.some((item) => item.id === "kubectl-get-deployments")).toBe(true);
    expect(templates.some((item) => item.id === "kubectl-get-events")).toBe(true);
    expect(templates.some((item) => item.id === "kubectl-get-nodes")).toBe(true);
    expect(templates.some((item) => item.id === "kubectl-get-ingress")).toBe(true);
    expect(templates.some((item) => item.id === "kubectl-describe-deployment")).toBe(true);
    expect(templates.some((item) => item.id === "kubectl-get-configmaps")).toBe(true);
  });

  it("loads third-round docker and kubernetes readonly diagnostics", () => {
    const templates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });

    expect(templates.some((item) => item.id === "docker-info")).toBe(true);
    expect(templates.some((item) => item.id === "docker-image-inspect")).toBe(true);
    expect(templates.some((item) => item.id === "docker-volume-inspect")).toBe(true);
    expect(templates.some((item) => item.id === "docker-network-inspect")).toBe(true);
    expect(templates.some((item) => item.id === "docker-compose-images")).toBe(true);
    expect(templates.some((item) => item.id === "docker-compose-top")).toBe(true);
    expect(templates.some((item) => item.id === "docker-compose-exec-sh")).toBe(true);

    expect(templates.some((item) => item.id === "kubectl-get-all")).toBe(true);
    expect(templates.some((item) => item.id === "kubectl-top-pods")).toBe(true);
    expect(templates.some((item) => item.id === "kubectl-top-nodes")).toBe(true);
    expect(templates.some((item) => item.id === "kubectl-describe-service")).toBe(true);
    expect(templates.some((item) => item.id === "kubectl-get-pvc")).toBe(true);
    expect(templates.some((item) => item.id === "kubectl-get-statefulsets")).toBe(true);
    expect(templates.some((item) => item.id === "kubectl-get-jobs")).toBe(true);
    expect(templates.some((item) => item.id === "kubectl-get-cronjobs")).toBe(true);
  });

  it("loads service builtin commands with platform split", () => {
    const winTemplates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });
    const macTemplates = loadBuiltinCommandTemplates({ runtimePlatform: "mac" });
    const linuxTemplates = loadBuiltinCommandTemplates({ runtimePlatform: "linux" });

    expect(winTemplates.some((item) => item.category === "service")).toBe(true);
    expect(winTemplates.some((item) => item.id === "service-status-win")).toBe(true);
    expect(winTemplates.some((item) => item.id === "service-list-running-win")).toBe(true);
    expect(winTemplates.some((item) => item.id === "service-logs-linux")).toBe(false);
    expect(winTemplates.some((item) => item.id === "service-list-mac")).toBe(false);

    expect(macTemplates.some((item) => item.category === "service")).toBe(true);
    expect(macTemplates.some((item) => item.id === "service-list-mac")).toBe(true);
    expect(macTemplates.some((item) => item.id === "service-status-mac")).toBe(true);
    expect(macTemplates.some((item) => item.id === "service-status-linux")).toBe(false);

    expect(linuxTemplates.some((item) => item.category === "service")).toBe(true);
    expect(linuxTemplates.some((item) => item.id === "service-status-linux")).toBe(true);
    expect(linuxTemplates.some((item) => item.id === "service-list-running-linux")).toBe(true);
    expect(linuxTemplates.some((item) => item.id === "service-logs-linux")).toBe(true);
    expect(linuxTemplates.some((item) => item.id === "service-list-all-linux")).toBe(true);
    expect(linuxTemplates.some((item) => item.id === "service-list-failed-linux")).toBe(true);
    expect(linuxTemplates.some((item) => item.id === "service-enabled-linux")).toBe(true);
    expect(linuxTemplates.some((item) => item.id === "service-cat-linux")).toBe(true);
    expect(linuxTemplates.some((item) => item.id === "service-status-win")).toBe(false);
    expect(linuxTemplates.some((item) => item.id === "service-status-mac")).toBe(false);
  });

  it("loads gh builtin commands as a separate category", () => {
    const templates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });

    expect(templates.some((item) => item.category === "gh")).toBe(true);
    expect(templates.some((item) => item.id === "gh-auth-status")).toBe(true);
    expect(templates.some((item) => item.id === "gh-pr-list")).toBe(true);
    expect(templates.some((item) => item.id === "gh-pr-view")).toBe(true);
    expect(templates.some((item) => item.id === "gh-pr-checkout")).toBe(true);
    expect(templates.some((item) => item.id === "gh-issue-list")).toBe(true);
    expect(templates.some((item) => item.id === "gh-repo-view")).toBe(true);
    expect(templates.some((item) => item.id === "gh-run-list")).toBe(true);
    expect(templates.some((item) => item.id === "gh-run-view")).toBe(true);
    expect(templates.some((item) => item.id === "gh-run-watch")).toBe(true);
    expect(templates.some((item) => item.id === "gh-pr-checks")).toBe(true);
    expect(templates.some((item) => item.id === "gh-release-list")).toBe(true);
    expect(templates.some((item) => item.id === "gh-workflow-list")).toBe(true);
    expect(templates.some((item) => item.id === "gh-pr-diff")).toBe(true);
    expect(templates.some((item) => item.id === "gh-workflow-run")).toBe(true);
    expect(templates.some((item) => item.id === "gh-run-rerun")).toBe(true);
    expect(templates.some((item) => item.id === "gh-run-download")).toBe(true);
  });

  it("loads cert builtin commands as a separate category", () => {
    const templates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });

    expect(templates.some((item) => item.category === "cert")).toBe(true);
    expect(templates.some((item) => item.id === "openssl-x509-text")).toBe(true);
    expect(templates.some((item) => item.id === "openssl-cert-dates")).toBe(true);
    expect(templates.some((item) => item.id === "openssl-cert-fingerprint")).toBe(true);
    expect(templates.some((item) => item.id === "openssl-s-client")).toBe(true);
    expect(templates.some((item) => item.id === "openssl-pkey-text")).toBe(true);
  });

  it("reports invalid user command files", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const loaded = loadUserCommandTemplatesWithReport(
        [
          {
            path: "C:/Users/test/.zapcmd/commands/bad.json",
            content: "{invalid-json",
            modifiedMs: 1
          }
        ],
        { runtimePlatform: "win" }
      );
      expect(loaded.templates).toHaveLength(0);
      const issue = loaded.issues.find((item) => item.code === "invalid-json");
      expect(issue).toMatchObject({
        code: "invalid-json",
        stage: "parse",
        sourceId: "C:/Users/test/.zapcmd/commands/bad.json"
      });
      expect(issue?.reason.length).toBeGreaterThan(0);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("reports invalid schema with first failure reason", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const loaded = loadUserCommandTemplatesWithReport(
        [
          {
            path: "C:/Users/test/.zapcmd/commands/invalid-schema.json",
            content: JSON.stringify({
              commands: [
                {
                  id: "bad id",
                  name: "bad id",
                  tags: ["test"],
                  category: "custom",
                  platform: "win",
                  exec: {
                    program: "echo",
                    args: ["bad"]
                  },
                  adminRequired: false
                }
              ]
            }),
            modifiedMs: 1
          }
        ],
        { runtimePlatform: "win" }
      );

      expect(loaded.templates).toHaveLength(0);
      expect(loaded.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "invalid-schema",
            stage: "schema",
            sourceId: "C:/Users/test/.zapcmd/commands/invalid-schema.json"
          })
        ])
      );
      const issue = loaded.issues.find((item) => item.code === "invalid-schema");
      expect(issue?.reason).toContain("commands[0].id");
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("reports business-rule validation failures with readable reason", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const loaded = loadUserCommandTemplatesWithReport(
        [
          {
            path: "C:/Users/test/.zapcmd/commands/min-max-conflict.json",
            content: JSON.stringify({
              commands: [
                {
                  id: "port-range-conflict",
                  name: "Port Range Conflict",
                  tags: ["test"],
                  category: "custom",
                  platform: "win",
                  exec: {
                    program: "echo",
                    args: ["{{port}}"]
                  },
                  adminRequired: false,
                  args: [
                    {
                      key: "port",
                      label: "port",
                      type: "number",
                      required: true,
                      validation: {
                        min: 100,
                        max: 1
                      }
                    }
                  ]
                }
              ]
            }),
            modifiedMs: 1
          }
        ],
        { runtimePlatform: "win" }
      );

      expect(loaded.templates).toHaveLength(0);
      const issue = loaded.issues.find((item) => item.code === "invalid-schema");
      expect(issue).toMatchObject({
        code: "invalid-schema",
        stage: "schema",
        sourceId: "C:/Users/test/.zapcmd/commands/min-max-conflict.json"
      });
      expect(issue?.reason).toContain("min");
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("keeps command visible but marks it as invalid when arg regex pattern is broken", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const loaded = loadUserCommandTemplatesWithReport(
        [
          {
            path: "C:/Users/test/.zapcmd/commands/invalid-pattern.json",
            content: JSON.stringify({
              commands: [
                {
                  id: "broken-regex-command",
                  name: "Broken Regex Command",
                  tags: ["test"],
                  category: "custom",
                  platform: "win",
                  exec: {
                    program: "echo",
                    args: ["{{value}}"]
                  },
                  adminRequired: false,
                  args: [
                    {
                      key: "value",
                      label: "Value",
                      type: "text",
                      required: true,
                      validation: {
                        pattern: "["
                      }
                    }
                  ]
                }
              ]
            }),
            modifiedMs: 1
          }
        ],
        { runtimePlatform: "win" }
      );

      expect(loaded.templates).toHaveLength(1);
      expect(loaded.templates[0]).toMatchObject({
        id: "broken-regex-command",
        blockingIssue: {
          code: "invalid-arg-pattern"
        }
      });
      expect(loaded.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "invalid-command-config",
            stage: "command",
            sourceId: "C:/Users/test/.zapcmd/commands/invalid-pattern.json",
            commandId: "broken-regex-command"
          })
        ])
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("reports duplicate ids with merge stage reason", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const loaded = loadUserCommandTemplatesWithReport(
        [
          {
            path: "C:/Users/test/.zapcmd/commands/duplicate-id.json",
            content: JSON.stringify({
              commands: [
                {
                  id: "custom-dup",
                  name: "duplicate 1",
                  tags: ["test"],
                  category: "custom",
                  platform: "win",
                  exec: {
                    program: "echo",
                    args: ["one"]
                  },
                  adminRequired: false
                },
                {
                  id: "custom-dup",
                  name: "duplicate 2",
                  tags: ["test"],
                  category: "custom",
                  platform: "win",
                  exec: {
                    program: "echo",
                    args: ["two"]
                  },
                  adminRequired: false
                }
              ]
            }),
            modifiedMs: 1
          }
        ],
        { runtimePlatform: "win" }
      );

      const duplicateIssue = loaded.issues.find((item) => item.code === "duplicate-id");
      expect(duplicateIssue).toMatchObject({
        code: "duplicate-id",
        stage: "merge",
        sourceId: "C:/Users/test/.zapcmd/commands/duplicate-id.json",
        commandId: "custom-dup"
      });
      expect(duplicateIssue?.reason).toContain("custom-dup");
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("rejects command-level shell field because it is no longer part of the runtime contract", () => {
    const loaded = loadUserCommandTemplatesWithReport(
      [
        {
          path: "C:/Users/test/.zapcmd/commands/custom-shell.json",
          content: JSON.stringify({
            commands: [
              {
                id: "custom-shell",
                name: "Custom shell command",
                tags: ["test"],
                category: "custom",
                platform: "win",
                exec: {
                  program: "echo",
                  args: ["hello"]
                },
                shell: "powershell",
                adminRequired: false
              }
            ]
          }),
          modifiedMs: 1
        }
      ],
      { runtimePlatform: "win" }
    );

    expect(loaded.templates).toHaveLength(0);
    expect(loaded.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid-schema",
          stage: "schema",
          sourceId: "C:/Users/test/.zapcmd/commands/custom-shell.json",
          reason: expect.stringContaining("shell")
        })
      ])
    );
  });

  it("loads user commands with custom slug category", () => {
    const loaded = loadUserCommandTemplatesWithReport(
      [
        {
          path: "C:/Users/test/.zapcmd/commands/redis.json",
          content: JSON.stringify({
            commands: [
              {
                id: "redis-shell",
                name: "Redis Shell",
                tags: ["redis"],
                category: "redis",
                platform: "win",
                exec: {
                  program: "redis-cli",
                  args: []
                },
                adminRequired: false
              }
            ]
          }),
          modifiedMs: 1
        }
      ],
      { runtimePlatform: "win" }
    );

    expect(loaded.templates[0]?.category).toBe("redis");
    expect(loaded.issues).toHaveLength(0);
  });

  it("creates read-failed issues with read stage reason", () => {
    const issue = createReadFailedIssue("C:/Users/test/.zapcmd/commands", new Error("permission denied"));
    expect(issue).toEqual(
      expect.objectContaining({
        code: "read-failed",
        stage: "read",
        sourceId: "C:/Users/test/.zapcmd/commands"
      })
    );
    expect(issue.reason).toContain("permission denied");
  });

  it("normalizes string read failures and truncates oversized reasons", () => {
    const issue = createReadFailedIssue(
      "C:/Users/test/.zapcmd/commands",
      `  ${"permission denied ".repeat(20)}  `
    );

    expect(issue.reason.endsWith("...")).toBe(true);
    expect(issue.reason.length).toBe(180);
    expect(issue.reason).not.toContain("  ");
  });

  it("falls back to default read failure reason for unknown error shapes", () => {
    const issue = createReadFailedIssue("C:/Users/test/.zapcmd/commands", { code: "EACCES" });

    expect(issue.reason).toBe("Failed to read command source.");
  });
});
