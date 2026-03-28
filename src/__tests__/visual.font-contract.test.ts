import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("visual font contract", () => {
  it("scopes stable font variables to the visual harness only", () => {
    const appVisual = readProjectFile("src/AppVisual.vue");
    const tokens = readProjectFile("src/styles/tokens.css");

    expect(appVisual).toContain("visual-regression-root");
    expect(appVisual).toContain("font-family: var(--ui-font-visual-sans);");
    expect(appVisual).toContain("--ui-font-mono: var(--ui-font-visual-mono);");
    expect(tokens).toContain("--ui-font-visual-sans:");
    expect(tokens).toContain("--ui-font-visual-mono:");
  });
});
