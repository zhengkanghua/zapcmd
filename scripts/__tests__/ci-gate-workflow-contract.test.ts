import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(targetPath: string): string {
  return readFileSync(resolve(process.cwd(), targetPath), "utf8");
}

describe("ci gate workflow contract", () => {
  it("keeps builtin command sync guard PowerShell-safe on windows runner", () => {
    const workflow = readProjectFile(".github/workflows/ci-gate.yml");

    expect(workflow).toContain("name: 检查内置命令生成产物已同步提交");
    expect(workflow).toContain("shell: pwsh");
    expect(workflow).toContain("if ($LASTEXITCODE -ne 0) {");
    expect(workflow).not.toContain("|| (");
  });
});
