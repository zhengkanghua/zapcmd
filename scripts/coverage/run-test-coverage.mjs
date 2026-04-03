import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function runAsync(command, args, options = {}) {
  return new Promise((resolveExitCode, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options
    });

    child.once("error", reject);
    child.once("exit", (code) => {
      resolveExitCode(code ?? 1);
    });
  });
}

async function main() {
  const forwardedArgs = process.argv.slice(2);
  const coverageDir = resolve(process.cwd(), "coverage");
  const coverageTmpDir = resolve(coverageDir, ".tmp");

  rmSync(coverageDir, { recursive: true, force: true });
  mkdirSync(coverageTmpDir, { recursive: true });
  const ensureTmpDirTimer = setInterval(() => {
    mkdirSync(coverageTmpDir, { recursive: true });
  }, 50);

  let vitestExitCode = 1;
  try {
    vitestExitCode = await runAsync(
      process.execPath,
      [
        "-r",
        "./scripts/vitest/patch-vite-net-use.cjs",
        "./node_modules/vitest/vitest.mjs",
        "run",
        "--coverage",
        "--configLoader",
        "runner",
        "--config",
        "vitest.config.js",
        ...forwardedArgs
      ],
      {
        shell: false
      }
    );
  } finally {
    clearInterval(ensureTmpDirTimer);
    mkdirSync(coverageTmpDir, { recursive: true });
  }

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

void main();
