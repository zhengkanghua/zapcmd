import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import standaloneCode from "ajv/dist/standalone/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "../..");

export const commandSchemaPath = resolve(
  projectRoot,
  "docs/schemas/command-file.schema.json"
);
export const generatedValidatorPath = resolve(
  projectRoot,
  "src/features/commands/generated/commandSchemaValidator.ts"
);

function readCommandSchema() {
  return JSON.parse(readFileSync(commandSchemaPath, "utf8"));
}

/**
 * 运行时必须消费 committed standalone validator，而不是在客户端重复编译 schema。
 */
export function createCommandSchemaValidatorSource() {
  const schema = readCommandSchema();
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    code: {
      esm: true,
      source: true
    }
  });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const rawGeneratedSource = standaloneCode(ajv, validate);
  const runtimeImports = [];
  const generatedSource = rawGeneratedSource.replace(
    /const (\w+) = require\("([^"]+)"\)\.default;/gu,
    (_, symbolName, modulePath) => {
      runtimeImports.push(`import ${symbolName} from "${modulePath}";`);
      return "";
    }
  );

  return [
    "/* v8 ignore file */",
    "/* eslint-disable */",
    "// @ts-nocheck",
    "// 此文件由 scripts/commands/generate-command-schema-validator.mjs 生成，禁止手动修改。",
    'import type { ErrorObject } from "ajv";',
    ...runtimeImports,
    "",
    generatedSource,
    "",
    "export type StandaloneCommandSchemaValidator = ((value: unknown) => boolean) & {",
    "  errors?: ErrorObject[] | null;",
    "};",
    "",
    "export const validateCommandSchema = validate as StandaloneCommandSchemaValidator;",
    ""
  ].join("\n");
}

export function writeCommandSchemaValidator() {
  const source = createCommandSchemaValidatorSource();
  mkdirSync(dirname(generatedValidatorPath), { recursive: true });
  writeFileSync(generatedValidatorPath, source, "utf8");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeCommandSchemaValidator();
}
