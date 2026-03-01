import { describe, expect, it } from "vitest";

import { commandTemplates } from "../commandTemplates";

describe("commandTemplates", () => {
  it("loads runtime templates from assets into memory", () => {
    expect(commandTemplates.length).toBeGreaterThan(50);
  });

  it("contains unique template ids", () => {
    const ids = commandTemplates.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ensures required display fields are present", () => {
    for (const template of commandTemplates) {
      expect(template.title.trim().length).toBeGreaterThan(0);
      expect(template.description.trim().length).toBeGreaterThan(0);
      expect(template.preview.trim().length).toBeGreaterThan(0);
      expect(template.folder.trim().length).toBeGreaterThan(0);
      expect(template.category.trim().length).toBeGreaterThan(0);
    }
  });

  it("keeps argument token contract consistent", () => {
    for (const template of commandTemplates) {
      if (!template.needsArgs) {
        continue;
      }

      if (template.args && template.args.length > 0) {
        const argKeys = template.args.map((arg) => arg.key);
        expect(new Set(argKeys).size).toBe(argKeys.length);
        for (const arg of template.args) {
          expect(template.preview.includes(arg.token)).toBe(true);
        }
      } else {
        expect(template.argToken).toBeTruthy();
        expect(template.preview.includes(template.argToken as string)).toBe(true);
      }
    }
  });
});
