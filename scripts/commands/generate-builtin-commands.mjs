import { fileURLToPath } from "node:url";
import { generateBuiltinCommands } from "./builtinCommandGenerator.mjs";

function parseCliArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unsupported argument '${token}'`);
    }

    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const key = rawKey.trim();
    const nextValue = inlineValue ?? argv[index + 1];
    if (!nextValue || nextValue.startsWith("--")) {
      throw new Error(`Missing value for '--${key}'`);
    }

    options[key] = key === "expectedLogicalCount" ? Number(nextValue) : nextValue;
    if (inlineValue === undefined) {
      index += 1;
    }
  }

  return options;
}

export function runCli(argv = process.argv.slice(2)) {
  generateBuiltinCommands(parseCliArgs(argv));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    runCli();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
}
