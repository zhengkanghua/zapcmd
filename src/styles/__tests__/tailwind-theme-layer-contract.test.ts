import { readFileSync } from "node:fs";
import path from "node:path";

import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import { beforeAll, describe, expect, it } from "vitest";

const tailwindEntryPath = path.resolve(process.cwd(), "src/styles/tailwind.css");

async function buildTailwindCss(): Promise<string> {
  const source = readFileSync(tailwindEntryPath, "utf8");
  const result = await postcss([tailwindcss()]).process(source, { from: tailwindEntryPath });
  return result.css;
}

describe("tailwind theme layer contract", () => {
  let compiledCss = "";

  beforeAll(async () => {
    compiledCss = await buildTailwindCss();
  }, 60_000);

  it("生成默认 scale utilities（避免 Settings UI 退回成方形/拥挤）", () => {
    const requiredSelectors = [".p-5", ".gap-4", ".rounded-2xl", ".font-semibold"];
    for (const selector of requiredSelectors) {
      expect(compiledCss).toContain(selector);
    }

    const requiredThemeTokens = ["--radius-2xl", "--font-weight-semibold", "--spacing:"];
    for (const token of requiredThemeTokens) {
      expect(compiledCss).toContain(token);
    }
  });
});
