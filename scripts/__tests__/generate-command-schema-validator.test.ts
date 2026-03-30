import { describe, expect, it } from "vitest";

import { createCommandSchemaValidatorSource } from "../commands/generate-command-schema-validator.mjs";

describe("generate-command-schema-validator", () => {
  it("emits ESM runtime imports with explicit js extension", () => {
    const source = createCommandSchemaValidatorSource();

    expect(source).toContain('from "ajv/dist/runtime/ucs2length.js";');
    expect(source).not.toContain('from "ajv/dist/runtime/ucs2length";');
  });
});
