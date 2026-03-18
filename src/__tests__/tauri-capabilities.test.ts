import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8")) as T;
}

describe("Tauri capabilities contract", () => {
  it("grants close permission to the settings window capability", () => {
    const capability = readJson<{
      windows: string[];
      permissions: string[];
    }>("src-tauri/capabilities/default.json");

    expect(capability.windows).toContain("settings");
    expect(capability.permissions).toContain("core:window:allow-close");
    expect(capability.permissions).toContain("updater:default");
  });

  it("keeps generated capabilities schema snapshot in sync", () => {
    const generated = readJson<{
      default: {
        windows: string[];
        permissions: string[];
      };
    }>("src-tauri/gen/schemas/capabilities.json");

    expect(generated.default.windows).toContain("settings");
    expect(generated.default.permissions).toContain("core:window:allow-close");
    expect(generated.default.permissions).toContain("updater:default");
  });

  it("does not keep custom-titlebar-only window permissions in default capability", () => {
    const capability = readJson<{ permissions: string[] }>("src-tauri/capabilities/default.json");

    expect(capability.permissions).not.toContain("core:window:allow-toggle-maximize");
    expect(capability.permissions).not.toContain("core:window:allow-minimize");
    expect(capability.permissions).not.toContain("core:window:allow-is-maximized");
  });
});
