import { existsSync, readFileSync } from "node:fs";
import {
  createCommandSchemaValidatorSource,
  generatedValidatorPath
} from "./generate-command-schema-validator.mjs";

const expectedSource = createCommandSchemaValidatorSource();

if (!existsSync(generatedValidatorPath)) {
  console.error("[commands:schema:check] generated validator is missing.");
  console.error("Run: npm run commands:schema:generate");
  process.exit(1);
}

const currentSource = readFileSync(generatedValidatorPath, "utf8");
if (currentSource !== expectedSource) {
  console.error("[commands:schema:check] generated validator is out of sync.");
  console.error("Run: npm run commands:schema:generate");
  process.exit(1);
}

console.log("[commands:schema:check] generated validator is in sync.");
