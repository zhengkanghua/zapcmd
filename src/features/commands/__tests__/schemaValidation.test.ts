import { describe, expect, it } from "vitest";
import { validateRuntimeCommandFile } from "../schemaValidation";
import type { RuntimeCommandFile } from "../runtimeTypes";

function createValidPayload(): RuntimeCommandFile {
  return {
    commands: [
      {
        id: "network-port-check",
        name: "Network Port Check",
        tags: ["network"],
        category: "custom",
        platform: "win",
        template: "echo {{port}}",
        adminRequired: false,
        args: [
          {
            key: "port",
            label: "port",
            type: "number",
            required: true,
            default: "3000",
            validation: {
              min: 1,
              max: 65535
            }
          }
        ]
      }
    ]
  };
}

function createPayloadWithMinMax(min: number, max: number): RuntimeCommandFile {
  const payload = createValidPayload();
  const firstArg = payload.commands[0].args?.[0];
  if (!firstArg) {
    throw new Error("expected first arg to exist");
  }
  firstArg.validation = { min, max };
  return payload;
}

function expectInvalidReason(payload: RuntimeCommandFile): string {
  const result = validateRuntimeCommandFile(payload);
  expect(result.valid).toBe(false);
  if (result.valid) {
    throw new Error("expected invalid result");
  }
  return result.reason;
}

describe("schemaValidation", () => {
  it("rejects payloads that violate schema structure", () => {
    const result = validateRuntimeCommandFile({
      commands: [
        {
          id: "bad id",
          name: "bad",
          tags: ["t"],
          category: "custom",
          platform: "win",
          template: "echo",
          adminRequired: false
        }
      ]
    });

    expect(result.valid).toBe(false);
    if (result.valid) {
      throw new Error("expected invalid schema result");
    }
    expect(result.reason).toContain("commands[0].id");
  });

  it("rejects numeric args when min is greater than max", () => {
    const result = validateRuntimeCommandFile(createPayloadWithMinMax(100, 1));

    expect(result.valid).toBe(false);
    if (result.valid) {
      throw new Error("expected invalid business-rule result");
    }
    expect(result.reason).toContain("min");
  });

  it("allows non-argument handlebars syntax inside template literals", () => {
    const payload = createValidPayload();
    payload.commands[0].template = "docker ps --format '{{.Names}}'";
    payload.commands[0].args = undefined;

    const result = validateRuntimeCommandFile(payload);

    expect(result.valid).toBe(true);
  });

  it("accepts custom slug categories that satisfy the shared contract", () => {
    const categories = ["redis", "mysql-tools"];

    for (const category of categories) {
      const payload = createValidPayload();
      payload.commands[0].category = category;

      const result = validateRuntimeCommandFile(payload);

      expect(result.valid).toBe(true);
    }
  });

  it("rejects templates that reference undefined argument tokens", () => {
    const payload = createValidPayload();
    payload.commands[0].template = "echo {{port}} {{missing}}";

    expect(expectInvalidReason(payload)).toContain('undefined token "missing"');
  });

  it("rejects number defaults that cannot be parsed", () => {
    const payload = createValidPayload();
    const firstArg = payload.commands[0].args?.[0];
    if (!firstArg) {
      throw new Error("expected first arg to exist");
    }
    firstArg.default = "oops";

    expect(expectInvalidReason(payload)).toContain("valid number string");
  });

  it("rejects number defaults below min", () => {
    const payload = createValidPayload();
    const firstArg = payload.commands[0].args?.[0];
    if (!firstArg) {
      throw new Error("expected first arg to exist");
    }
    firstArg.default = "0";

    expect(expectInvalidReason(payload)).toContain("greater than or equal to min");
  });

  it("rejects duplicate arg keys within the same command", () => {
    const payload = createValidPayload();
    payload.commands[0].args?.push({
      key: "port",
      label: "Port copy",
      type: "number"
    });

    expect(expectInvalidReason(payload)).toContain("must be unique");
  });

  it("rejects blank localized locale keys that schema cannot express", () => {
    const payload = createValidPayload();
    payload.commands[0].name = {
      "": "bad"
    };

    expect(expectInvalidReason(payload)).toContain("empty locale key");
  });

  it("rejects whitespace-only meta author values", () => {
    const payload = createValidPayload();
    payload._meta = {
      author: "   "
    };

    expect(expectInvalidReason(payload)).toContain("_meta.author");
  });

  it("rejects blank prerequisite checks after structural validation", () => {
    const payload = createValidPayload();
    payload.commands[0].prerequisites = [
      {
        id: "docker",
        type: "binary",
        required: true,
        check: " "
      }
    ];

    expect(expectInvalidReason(payload)).toContain("prerequisites[0].check");
  });

  it("rejects command-level shell field because it is no longer part of the schema", () => {
    const result = validateRuntimeCommandFile({
      commands: [
        {
          id: "custom-shell",
          name: "Custom Shell",
          tags: ["test"],
          category: "custom",
          platform: "win",
          template: "echo hello",
          shell: "powershell",
          adminRequired: false
        }
      ]
    } as unknown as RuntimeCommandFile);

    expect(result.valid).toBe(false);
    if (result.valid) {
      throw new Error("expected invalid schema result");
    }
    expect(result.reason).toContain("shell");
  });
});
