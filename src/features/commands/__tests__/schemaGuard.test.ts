import { describe, expect, it } from "vitest";
import { isRuntimeCommandFile } from "../schemaGuard";

type UnknownRecord = Record<string, unknown>;

function createValidPayload() {
  return {
    _meta: {
      name: "network",
      author: "zapcmd",
      version: "1.0.0",
      description: {
        "zh-CN": "内置命令文件",
        "en-US": "builtin command file"
      },
      source: "builtin"
    },
    commands: [
      {
        id: "kill-port-win",
        name: "结束端口进程",
        description: {
          "zh-CN": "通过 PID 结束进程",
          "en-US": "Kill a process by PID"
        },
        tags: ["port", "kill"],
        category: "network",
        platform: "win",
        script: {
          runner: "powershell",
          command: "Stop-Process -Id {{pid}} -Force"
        },
        adminRequired: false,
        dangerous: false,
        args: [
          {
            key: "pid",
            label: {
              "zh-CN": "PID",
              "en-US": "PID"
            },
            type: "number",
            required: true,
            placeholder: "1234",
            validation: {
              min: 1,
              max: 65535,
              errorMessage: "PID must be between 1 and 65535"
            }
          },
          {
            key: "mode",
            label: "Mode",
            type: "select",
            required: true,
            validation: {
              options: ["fast", "safe"]
            }
          }
        ],
        prerequisites: [
          {
            id: "powershell",
            type: "shell",
            required: true,
            check: "shell:powershell",
            displayName: {
              "zh-CN": "PowerShell 7",
              "en-US": "PowerShell 7"
            },
            resolutionHint: {
              "zh-CN": "安装 PowerShell 7 后重试",
              "en-US": "Install PowerShell 7 and retry"
            },
            installHint: {
              "zh-CN": "兼容旧字段",
              "en-US": "legacy"
            },
            fallbackCommandId: "install-pwsh"
          }
        ]
      }
    ]
  };
}

type ValidPayload = ReturnType<typeof createValidPayload>;
type ValidCommand = ValidPayload["commands"][number];
type ValidArgs = ValidCommand["args"];
type ValidPrerequisites = ValidCommand["prerequisites"];

describe("isRuntimeCommandFile", () => {
  it("accepts a schema-compliant command file", () => {
    expect(isRuntimeCommandFile(createValidPayload())).toBe(true);
  });

  it("accepts a command file with custom slug category", () => {
    const payload = createValidPayload();
    payload.commands[0].category = "redis" as ValidCommand["category"];

    expect(isRuntimeCommandFile(payload)).toBe(true);
  });

  it("accepts a valid command file without _meta", () => {
    const { _meta: _ignored, ...payload } = createValidPayload();
    expect(isRuntimeCommandFile(payload)).toBe(true);
  });

  it("accepts a valid command file without optional command fields", () => {
    const payload = createValidPayload();
    payload.commands[0] = {
      id: "hello",
      name: { "en-US": "Hello", "zh-CN": "你好" },
      tags: ["hello"],
      category: "dev",
      platform: "all",
      exec: {
        program: "echo",
        args: ["hello"]
      },
      adminRequired: false
    } as unknown as ValidCommand;

    expect(isRuntimeCommandFile(payload)).toBe(true);
  });

  const invalidTopLevelCases: Array<{ name: string; value: unknown }> = [
    { name: "non-object payload", value: "not-an-object" },
    { name: "null payload", value: null },
    { name: "array payload", value: [] }
  ];

  for (const testCase of invalidTopLevelCases) {
    it(`rejects top-level: ${testCase.name}`, () => {
      expect(isRuntimeCommandFile(testCase.value)).toBe(false);
    });
  }

  const invalidPayloadMutations: Array<{ name: string; mutate: (payload: UnknownRecord) => void }> = [
    {
      name: "unsupported top-level key",
      mutate: (payload) => {
        payload.unknown = true;
      }
    },
    {
      name: "_meta is not an object",
      mutate: (payload) => {
        payload._meta = "oops";
      }
    },
    {
      name: "_meta.name is empty localized object",
      mutate: (payload) => {
        const meta = payload._meta as UnknownRecord;
        meta.name = {};
      }
    },
    {
      name: "_meta.author is empty string",
      mutate: (payload) => {
        const meta = payload._meta as UnknownRecord;
        meta.author = "   ";
      }
    },
    {
      name: "_meta.version is not a string",
      mutate: (payload) => {
        const meta = payload._meta as UnknownRecord;
        meta.version = 123;
      }
    },
    {
      name: "_meta.description localized text has empty key",
      mutate: (payload) => {
        const meta = payload._meta as UnknownRecord;
        meta.description = { "": "bad" };
      }
    },
    {
      name: "_meta.source is empty string",
      mutate: (payload) => {
        const meta = payload._meta as UnknownRecord;
        meta.source = "";
      }
    },
    {
      name: "commands is not an array",
      mutate: (payload) => {
        payload.commands = {};
      }
    },
    {
      name: "commands is empty array",
      mutate: (payload) => {
        payload.commands = [];
      }
    }
  ];

  for (const testCase of invalidPayloadMutations) {
    it(`rejects payload: ${testCase.name}`, () => {
      const payload = createValidPayload();
      testCase.mutate(payload as unknown as UnknownRecord);
      expect(isRuntimeCommandFile(payload)).toBe(false);
    });
  }

  const invalidCommandMutations: Array<{ name: string; mutate: (command: UnknownRecord) => void }> = [
    {
      name: "command contains unknown key",
      mutate: (command) => {
        command.extra = true;
      }
    },
    {
      name: "id is empty string",
      mutate: (command) => {
        command.id = " ";
      }
    },
    {
      name: "id does not match pattern",
      mutate: (command) => {
        command.id = "bad id";
      }
    },
    {
      name: "name is empty string",
      mutate: (command) => {
        command.name = "";
      }
    },
    {
      name: "name is localized text with empty value",
      mutate: (command) => {
        command.name = { "en-US": "" };
      }
    },
    {
      name: "tags is not an array",
      mutate: (command) => {
        command.tags = "not-an-array";
      }
    },
    {
      name: "tags is empty array",
      mutate: (command) => {
        command.tags = [];
      }
    },
    {
      name: "tags contains empty string",
      mutate: (command) => {
        command.tags = ["ok", " "];
      }
    },
    {
      name: "tags contains duplicates",
      mutate: (command) => {
        command.tags = ["dup", "dup"];
      }
    },
    {
      name: "platform is invalid enum",
      mutate: (command) => {
        command.platform = "android";
      }
    },
    {
      name: "template field is not allowed anymore",
      mutate: (command) => {
        command.template = "echo hello";
      }
    },
    {
      name: "adminRequired is not boolean",
      mutate: (command) => {
        command.adminRequired = "false";
      }
    },
    {
      name: "description is empty localized object",
      mutate: (command) => {
        command.description = {};
      }
    },
    {
      name: "shell field is not allowed anymore",
      mutate: (command) => {
        command.shell = "powershell";
      }
    },
    {
      name: "dangerous is not boolean",
      mutate: (command) => {
        command.dangerous = "yes";
      }
    },
    {
      name: "args is not an array",
      mutate: (command) => {
        command.args = {};
      }
    },
    {
      name: "args contains non-object item",
      mutate: (command) => {
        command.args = [null];
      }
    },
    {
      name: "prerequisites is not an array",
      mutate: (command) => {
        command.prerequisites = {};
      }
    },
    {
      name: "prerequisites contains non-object item",
      mutate: (command) => {
        command.prerequisites = [123];
      }
    }
  ];

  for (const testCase of invalidCommandMutations) {
    it(`rejects command: ${testCase.name}`, () => {
      const payload = createValidPayload();
      testCase.mutate(payload.commands[0] as unknown as UnknownRecord);
      expect(isRuntimeCommandFile(payload)).toBe(false);
    });
  }

  it("rejects command categories that violate the slug contract", () => {
    const invalidCategories = ["Redis", "mysql tools", "postgres_tools"];

    for (const category of invalidCategories) {
      const payload = createValidPayload();
      payload.commands[0].category = category as ValidCommand["category"];
      expect(isRuntimeCommandFile(payload)).toBe(false);
    }
  });

  const invalidArgMutations: Array<{ name: string; mutate: (arg: UnknownRecord) => void }> = [
    {
      name: "arg contains unknown key",
      mutate: (arg) => {
        arg.extra = true;
      }
    },
    {
      name: "key is empty string",
      mutate: (arg) => {
        arg.key = "";
      }
    },
    {
      name: "key does not match pattern",
      mutate: (arg) => {
        arg.key = "bad key";
      }
    },
    {
      name: "label is invalid type",
      mutate: (arg) => {
        arg.label = 123;
      }
    },
    {
      name: "type is invalid enum",
      mutate: (arg) => {
        arg.type = "date";
      }
    },
    {
      name: "required is not boolean",
      mutate: (arg) => {
        arg.required = "true";
      }
    },
    {
      name: "default is not string",
      mutate: (arg) => {
        arg.default = 1;
      }
    },
    {
      name: "placeholder is not string",
      mutate: (arg) => {
        arg.placeholder = 2;
      }
    },
    {
      name: "validation is not an object",
      mutate: (arg) => {
        arg.validation = "oops";
      }
    },
    {
      name: "validation contains unknown key",
      mutate: (arg) => {
        arg.validation = { unknown: true };
      }
    },
    {
      name: "validation.pattern is not string",
      mutate: (arg) => {
        arg.validation = { pattern: 123 };
      }
    },
    {
      name: "validation.min is not number",
      mutate: (arg) => {
        arg.validation = { min: "1" };
      }
    },
    {
      name: "validation.max is not number",
      mutate: (arg) => {
        arg.validation = { max: "2" };
      }
    },
    {
      name: "validation.options is empty array",
      mutate: (arg) => {
        arg.validation = { options: [] };
      }
    },
    {
      name: "validation.options has duplicates",
      mutate: (arg) => {
        arg.validation = { options: ["a", "a"] };
      }
    },
    {
      name: "validation.errorMessage invalid localized text",
      mutate: (arg) => {
        arg.validation = { errorMessage: {} };
      }
    }
  ];

  for (const testCase of invalidArgMutations) {
    it(`rejects arg: ${testCase.name}`, () => {
      const payload = createValidPayload();
      const command = payload.commands[0];
      command.args = [
        {
          key: "value",
          label: "Value",
          type: "text",
          required: true
        }
      ] as unknown as ValidArgs;
      testCase.mutate(command.args[0] as unknown as UnknownRecord);
      expect(isRuntimeCommandFile(payload)).toBe(false);
    });
  }

  it("rejects select arg without options", () => {
    const payload = createValidPayload();
    payload.commands[0].args = [
      {
        key: "mode",
        label: "Mode",
        type: "select",
        required: true
      }
    ] as unknown as ValidArgs;

    expect(isRuntimeCommandFile(payload)).toBe(false);
  });

  it("rejects select arg with duplicate options", () => {
    const payload = createValidPayload();
    payload.commands[0].args = [
      {
        key: "mode",
        label: "Mode",
        type: "select",
        required: true,
        validation: {
          options: ["dup", "dup"]
        }
      }
    ] as unknown as ValidArgs;

    expect(isRuntimeCommandFile(payload)).toBe(false);
  });

  const invalidPrerequisiteMutations: Array<{ name: string; mutate: (item: UnknownRecord) => void }> = [
    {
      name: "prerequisite contains unknown key",
      mutate: (item) => {
        item.extra = true;
      }
    },
    {
      name: "id is empty string",
      mutate: (item) => {
        item.id = "";
      }
    },
    {
      name: "type is invalid enum",
      mutate: (item) => {
        item.type = "os";
      }
    },
    {
      name: "required is not boolean",
      mutate: (item) => {
        item.required = "true";
      }
    },
    {
      name: "check is empty string",
      mutate: (item) => {
        item.check = " ";
      }
    },
    {
      name: "installHint invalid localized text",
      mutate: (item) => {
        item.installHint = { "zh-CN": "" };
      }
    },
    {
      name: "fallbackCommandId does not match pattern",
      mutate: (item) => {
        item.fallbackCommandId = "bad id";
      }
    }
  ];

  for (const testCase of invalidPrerequisiteMutations) {
    it(`rejects prerequisite: ${testCase.name}`, () => {
      const payload = createValidPayload();
      payload.commands[0].prerequisites = [
        {
          id: "git",
          type: "binary",
          required: true,
          check: "git --version"
        }
      ] as unknown as ValidPrerequisites;
      testCase.mutate(payload.commands[0].prerequisites[0] as unknown as UnknownRecord);
      expect(isRuntimeCommandFile(payload)).toBe(false);
    });
  }
});
