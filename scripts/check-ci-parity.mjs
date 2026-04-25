import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("npm", ["run", "check:builtin-command-sync"]);
run("npm", [
  "run",
  "test:run",
  "--",
  "scripts/__tests__/ci-gate-workflow-contract.test.ts",
  "scripts/__tests__/controlled-visual-runner-contract.test.ts",
  "scripts/__tests__/release-workflow-windows-x64-contract.test.ts"
]);
