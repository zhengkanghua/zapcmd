import { describe, expect, it } from "vitest";
import { isRuntimeCommandFile } from "../schemaGuard";

describe("isRuntimeCommandFile", () => {
  it("accepts a schema-compliant command file", () => {
    const payload = {
      _meta: {
        name: "network",
        author: "zapcmd",
        version: "1.0.0"
      },
      commands: [
        {
          id: "kill-port-win",
          name: "结束端口进程",
          tags: ["port", "kill"],
          category: "network",
          platform: "win",
          template: "Stop-Process -Id {{pid}} -Force",
          shell: "powershell",
          adminRequired: false,
          args: [
            {
              key: "pid",
              label: "PID",
              type: "number",
              required: true
            }
          ]
        }
      ]
    };

    expect(isRuntimeCommandFile(payload)).toBe(true);
  });

  it("rejects unsupported top-level properties", () => {
    const payload = {
      commands: [
        {
          id: "test",
          name: "test",
          tags: ["t"],
          category: "dev",
          platform: "all",
          template: "echo test",
          adminRequired: false
        }
      ],
      unknown: true
    };

    expect(isRuntimeCommandFile(payload)).toBe(false);
  });

  it("rejects select arg without options", () => {
    const payload = {
      commands: [
        {
          id: "select-missing-options",
          name: "select missing options",
          tags: ["select"],
          category: "dev",
          platform: "all",
          template: "echo {{mode}}",
          adminRequired: false,
          args: [
            {
              key: "mode",
              label: "Mode",
              type: "select",
              required: true
            }
          ]
        }
      ]
    };

    expect(isRuntimeCommandFile(payload)).toBe(false);
  });
});
