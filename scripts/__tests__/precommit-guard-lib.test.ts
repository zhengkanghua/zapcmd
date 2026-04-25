import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

async function loadPrecommitGuardLib() {
  const targetPath = resolve(process.cwd(), "scripts/precommit-guard-lib.mjs");
  expect(existsSync(targetPath)).toBe(true);
  return import(pathToFileURL(targetPath).href);
}

describe("precommit-guard-lib", () => {
  it("does not treat workflow-only changes as docs-only skip targets", async () => {
    const { buildPrecommitGuardPlan } = await loadPrecommitGuardLib();

    const plan = buildPrecommitGuardPlan([".github/workflows/ci-gate.yml"]);

    expect(plan.skip).toBe(false);
    expect(
      plan.commands.some(
        (entry: { command: string; args: string[] }) =>
          entry.command === "npm" &&
          entry.args[0] === "run" &&
          entry.args[1] === "test:run" &&
          entry.args.includes("scripts/__tests__/ci-gate-workflow-contract.test.ts")
      )
    ).toBe(true);
  });

  it("requires builtin command sync check for builtin source changes", async () => {
    const { buildPrecommitGuardPlan } = await loadPrecommitGuardLib();

    const plan = buildPrecommitGuardPlan(["commands/catalog/_network.yaml"]);

    expect(
      plan.commands.some(
        (entry: { command: string; args: string[] }) =>
          entry.command === "npm" && entry.args[0] === "run" && entry.args[1] === "check:builtin-command-sync"
      )
    ).toBe(true);
  });

  it("treats terminal rust submodule changes as high risk and schedules cargo test", async () => {
    const { buildPrecommitGuardPlan } = await loadPrecommitGuardLib();

    const plan = buildPrecommitGuardPlan(["src-tauri/src/terminal/tests_exec.rs"]);

    expect(
      plan.commands.some(
        (entry: { command: string; args: string[] }) =>
          entry.command === "cargo" &&
          entry.args[0] === "test" &&
          entry.args.includes("src-tauri/Cargo.toml")
      )
    ).toBe(true);
  });

  it("still skips pure docs changes", async () => {
    const { buildPrecommitGuardPlan } = await loadPrecommitGuardLib();

    const plan = buildPrecommitGuardPlan(["docs/notes.md"]);

    expect(plan.skip).toBe(true);
  });
});
