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

function diffHasChanges() {
  const result = spawnSync(
    "git",
    [
      "diff",
      "--quiet",
      "--",
      "commands/catalog",
      "assets/runtime_templates/commands/builtin",
      "docs/generated_commands"
    ],
    {
      stdio: "inherit",
      shell: process.platform === "win32"
    }
  );

  if (result.error) {
    throw result.error;
  }

  return result.status !== 0;
}

run("npm", ["run", "commands:builtin:generate"]);

if (diffHasChanges()) {
  console.error("检测到内置命令生成产物未同步提交。请先执行并提交：");
  console.error("  npm run commands:builtin:generate");
  console.error("  git add commands/catalog assets/runtime_templates/commands/builtin docs/generated_commands");
  process.exit(1);
}
