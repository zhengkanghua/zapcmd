import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(targetPath: string): string {
  return readFileSync(resolve(process.cwd(), targetPath), "utf8");
}

describe("ci gate workflow contract", () => {
  it("keeps builtin command sync guard aligned across package scripts and workflow", () => {
    const packageJson = JSON.parse(readProjectFile("package.json")) as {
      scripts: Record<string, string>;
    };
    const workflow = readProjectFile(".github/workflows/ci-gate.yml");
    const localParityScript = readProjectFile("scripts/check-ci-parity.mjs");

    expect(packageJson.scripts["check:builtin-command-sync"]).toBeDefined();
    expect(packageJson.scripts["check:ci-parity"]).toBeDefined();
    expect(localParityScript).toContain('"check:builtin-command-sync"');
    expect(packageJson.scripts["check:all"]).toContain("npm run check:ci-parity");
    expect(workflow).toContain("name: 检查内置命令生成产物已同步提交");
    expect(workflow).toContain("npm run check:builtin-command-sync");
    expect(workflow).not.toContain("|| (");
  });
});
