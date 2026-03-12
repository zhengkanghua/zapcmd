import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options
  });
}

function main() {
  const forwardedArgs = process.argv.slice(2);

  const vitestResult = run("vitest", [
    "run",
    "--coverage",
    "--configLoader",
    "runner",
    "--config",
    "vitest.config.js",
    ...forwardedArgs
  ]);
  const vitestExitCode = vitestResult.status ?? 1;

  const reportScriptPath = fileURLToPath(
    new URL("./coverage-report.mjs", import.meta.url)
  );
  const reportResult = spawnSync(process.execPath, [reportScriptPath], {
    stdio: "inherit",
    shell: false,
    cwd: process.cwd()
  });

  if ((reportResult.status ?? 0) !== 0) {
    console.log("");
    console.log(
      `[coverage-report] 警告：诊断脚本退出码非 0（${reportResult.status}）。这不会改变 vitest 的退出结果。`
    );
  }

  process.exit(vitestExitCode);
}

main();
