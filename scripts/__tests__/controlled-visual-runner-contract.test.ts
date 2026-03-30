import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(targetPath: string): string {
  return readFileSync(resolve(process.cwd(), targetPath), "utf8");
}

describe("controlled visual runner contract", () => {
  it("aligns package scripts, workflow, docs and local gate wording", () => {
    const packageJson = JSON.parse(readProjectFile("package.json")) as {
      scripts: Record<string, string>;
    };
    const workflow = readProjectFile(".github/workflows/ci-gate.yml");

    expect(packageJson.scripts["test:visual:ui:runner"]).toBeDefined();
    expect(workflow).toContain("npm run test:visual:ui:runner");
    expect(workflow).toContain("Resolve controlled runner browser contract");
    expect(workflow).toContain('Get-Command "msedge"');
    expect(workflow).toContain("GITHUB_ENV");
    expect(readProjectFile("scripts/README.md")).toContain("blocking visual gate 只来自 `controlled-runner`");
    expect(readProjectFile("scripts/README.md")).toContain("本地 mismatch 不等价于最终 visual gate 失败");
    expect(readProjectFile("scripts/verify-local-gate.mjs")).toContain("non-blocking compare");
  });
});
