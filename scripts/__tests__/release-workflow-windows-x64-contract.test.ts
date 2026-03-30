import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(targetPath: string): string {
  return readFileSync(resolve(process.cwd(), targetPath), "utf8");
}

function resolveWindowsX64BundlePath(): string {
  const packageJson = JSON.parse(readProjectFile("package.json")) as {
    scripts: Record<string, string>;
  };
  const buildScript = packageJson.scripts["tauri:build:windows:x64"];
  const targetMatch = buildScript.match(/--target\s+([^\s]+)/);

  expect(targetMatch?.[1]).toBeDefined();

  return `src-tauri/target/${targetMatch?.[1]}/release/bundle/`;
}

describe("windows x64 release workflow contract", () => {
  it("keeps upload-artifact bundle paths aligned with the target triple build script", () => {
    const expectedBundlePath = resolveWindowsX64BundlePath();
    const releaseWorkflow = readProjectFile(".github/workflows/release-build.yml");
    const dryRunWorkflow = readProjectFile(".github/workflows/release-dry-run.yml");

    expect(releaseWorkflow).toContain("npm run tauri:build:windows:x64");
    expect(releaseWorkflow).toContain(`path: ${expectedBundlePath}`);
    expect(dryRunWorkflow).toContain("npm run tauri:build:windows:x64");
    expect(dryRunWorkflow).toContain(`path: ${expectedBundlePath}`);
  });
});
