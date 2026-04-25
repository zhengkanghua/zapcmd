import { describe, expect, it } from "vitest";
import { analyzeComplexity } from "../complexity-guard-lib.mjs";

describe("complexity-guard", () => {
  it("flags files that exceed the configured line limit", () => {
    const content = Array.from({ length: 405 }, () => "const a = 1;").join("\n");

    const violations = analyzeComplexity({
      files: [{ path: "src/demo.ts", content }]
    });

    expect(violations).toContainEqual(
      expect.objectContaining({
        rule: "file-max-lines",
        file: "src/demo.ts"
      })
    );
  });

  it("flags long arrow functions", () => {
    const body = Array.from({ length: 52 }, (_, index) => `  const line${index} = ${index};`).join("\n");
    const content = `const oversized = () => {\n${body}\n};\n`;

    const violations = analyzeComplexity({
      files: [{ path: "src/demo.ts", content }]
    });

    expect(violations).toContainEqual(
      expect.objectContaining({
        rule: "function-max-lines",
        file: "src/demo.ts",
        line: 1
      })
    );
  });

  it("ignores generated and i18n payload files", () => {
    const content = Array.from({ length: 600 }, () => "const a = 1;").join("\n");

    const violations = analyzeComplexity({
      files: [
        { path: "src/features/commands/generated/demo.ts", content },
        { path: "src/i18n/messages.ts", content }
      ]
    });

    expect(violations).toEqual([]);
  });
});
