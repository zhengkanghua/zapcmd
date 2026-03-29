import { describe, expect, it } from "vitest";
import { validateRuntimeCommandFile } from "../schemaValidation";

function createValidPayload() {
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

function createPayloadWithMinMax(min: number, max: number) {
  const payload = createValidPayload();
  payload.commands[0].args[0].validation = { min, max };
  return payload;
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
    expect(result.reason).toContain("commands[0].id");
  });

  it("rejects numeric args when min is greater than max", () => {
    const result = validateRuntimeCommandFile(createPayloadWithMinMax(100, 1));

    expect(result.valid).toBe(false);
    expect(result.reason).toContain("min");
  });
});
