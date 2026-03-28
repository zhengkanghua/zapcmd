import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("visual font contract", () => {
  it("scopes controlled fonts to the visual harness entry only", () => {
    const mainVisual = readProjectFile("src/main-visual.ts");
    const visualFonts = readProjectFile("src/styles/visual-fonts.css");
    const tokens = readProjectFile("src/styles/tokens.css");

    expect(mainVisual).toContain('import "./styles/visual-fonts.css"');
    expect(visualFonts).toContain("@font-face");
    expect(visualFonts).toContain("/fonts/visual-regression/zapcmd-visual-sans-subset.woff2");
    expect(visualFonts).toContain("/fonts/visual-regression/zapcmd-visual-mono-subset.woff2");
    expect(tokens).toContain("--ui-font-visual-sans-fallback:");
    expect(tokens).toContain("--ui-font-visual-sans: var(--ui-font-visual-sans-fallback);");
    expect(tokens).toContain("--ui-font-visual-mono-fallback:");
    expect(tokens).toContain("--ui-font-visual-mono: var(--ui-font-visual-mono-fallback);");
  });

  it("freezes launcher motion surfaces inside the visual harness", () => {
    const visualApp = readProjectFile("src/AppVisual.vue");
    const visualFonts = readProjectFile("src/styles/visual-fonts.css");

    expect(visualApp).toContain("visual-regression-root--freeze-motion");
    expect(visualApp).toContain("launcher-motion-surfaces-expressive");
    expect(visualApp).toContain("launcher-motion-surfaces-steady-tool");
    expect(visualFonts).toContain(".visual-regression-root--freeze-motion");
    expect(visualFonts).toContain("animation: none !important;");
    expect(visualFonts).toContain("transition: none !important;");
  });
});
