import { describe, expect, it } from "vitest";
import { validateRuntimeCommandFile } from "../schemaValidation";
import type {
  RuntimeCommandArg,
  RuntimeCommandFileMeta,
  RuntimeCommandPrerequisite,
  RuntimeExecCommand,
  RuntimeLocalizedTextOrString,
  RuntimePlatform,
  RuntimeScriptCommand
} from "../runtimeTypes";

type TestRuntimeCommandPrerequisite = RuntimeCommandPrerequisite & {
  displayName?: RuntimeLocalizedTextOrString;
  resolutionHint?: RuntimeLocalizedTextOrString;
};

interface TestRuntimeCommand {
  id: string;
  name: RuntimeLocalizedTextOrString;
  tags: string[];
  category: string;
  platform: RuntimePlatform;
  adminRequired: boolean;
  dangerous?: boolean;
  args?: RuntimeCommandArg[];
  prerequisites?: TestRuntimeCommandPrerequisite[];
  exec?: RuntimeExecCommand;
  script?: RuntimeScriptCommand;
  template?: string;
  shell?: string;
}

interface TestRuntimeCommandFile {
  _meta?: RuntimeCommandFileMeta;
  commands: TestRuntimeCommand[];
}

function getFirstCommand(payload: TestRuntimeCommandFile): TestRuntimeCommand {
  const command = payload.commands[0];
  if (!command) {
    throw new Error("expected first command to exist");
  }
  return command;
}

function getFirstArg(payload: TestRuntimeCommandFile): RuntimeCommandArg {
  const firstArg = getFirstCommand(payload).args?.[0];
  if (!firstArg) {
    throw new Error("expected first arg to exist");
  }
  return firstArg;
}

function getExec(payload: TestRuntimeCommandFile): RuntimeExecCommand {
  const exec = getFirstCommand(payload).exec;
  if (!exec) {
    throw new Error("expected exec command to exist");
  }
  return exec;
}

function getArgs(payload: TestRuntimeCommandFile): RuntimeCommandArg[] {
  const args = getFirstCommand(payload).args;
  if (!args) {
    throw new Error("expected args to exist");
  }
  return args;
}

function createValidPayload(): TestRuntimeCommandFile {
  return {
    commands: [
      {
        id: "echo-text",
        name: "Echo",
        tags: ["echo"],
        category: "dev",
        platform: "all",
        exec: {
          program: "echo",
          args: ["{{text}}"]
        },
        adminRequired: false,
        args: [
          {
            key: "text",
            label: "Text",
            type: "text",
            required: true,
          }
        ]
      }
    ]
  };
}

function createPayloadWithMinMax(min: number, max: number): TestRuntimeCommandFile {
  const payload = createValidPayload();
  const firstArg = getFirstArg(payload);
  firstArg.type = "number";
  firstArg.default = "3000";
  firstArg.validation = { min, max };
  return payload;
}

function createScriptPayload(): TestRuntimeCommandFile {
  return {
    commands: [
      {
        id: "kill-port-win",
        name: "Kill Port Win",
        tags: ["network"],
        category: "network",
        platform: "win",
        script: {
          runner: "powershell",
          command: "Stop-Process -Id {{pid}} -Force"
        },
        adminRequired: false,
        args: [
          {
            key: "pid",
            label: "PID",
            type: "number",
            required: true
          }
        ],
        prerequisites: [
          {
            id: "powershell",
            type: "shell",
            required: true,
            check: "shell:powershell"
          }
        ]
      }
    ]
  };
}

function expectInvalidReason(payload: unknown): string {
  const result = validateRuntimeCommandFile(payload);
  expect(result.valid).toBe(false);
  if (result.valid) {
    throw new Error("expected invalid result");
  }
  return result.reason;
}

describe("schemaValidation", () => {
  it("accepts exec commands under the structured runtime schema", () => {
    const result = validateRuntimeCommandFile(createValidPayload());

    expect(result.valid).toBe(true);
  });

  it("accepts prerequisites with displayName and resolutionHint", () => {
    const payload = createScriptPayload();
    payload.commands[0].prerequisites = [
      {
        id: "powershell",
        type: "shell",
        required: true,
        check: "shell:powershell",
        displayName: { "zh-CN": "PowerShell 7" },
        resolutionHint: { "zh-CN": "安装 PowerShell 7 后重试" }
      }
    ];

    expect(validateRuntimeCommandFile(payload).valid).toBe(true);
  });

  it("rejects payloads that still use the legacy template field", () => {
    const result = validateRuntimeCommandFile({
      commands: [
        {
          id: "bad-template",
          name: "Bad",
          tags: ["bad"],
          category: "dev",
          platform: "all",
          template: "echo hello",
          adminRequired: false
        }
      ]
    });

    expect(result.valid).toBe(false);
    if (result.valid) {
      throw new Error("expected invalid schema result");
    }
  });

  it("rejects numeric args when min is greater than max", () => {
    const result = validateRuntimeCommandFile(createPayloadWithMinMax(100, 1));

    expect(result.valid).toBe(false);
    if (result.valid) {
      throw new Error("expected invalid business-rule result");
    }
    expect(result.reason).toContain("min");
  });

  it("allows non-argument handlebars syntax inside exec args", () => {
    const payload = createValidPayload();
    getExec(payload).args = ["--format", "{{.Names}}"];
    getFirstCommand(payload).args = undefined;

    const result = validateRuntimeCommandFile(payload);

    expect(result.valid).toBe(true);
  });

  it("accepts custom slug categories that satisfy the shared contract", () => {
    const categories = ["redis", "mysql-tools"];

    for (const category of categories) {
      const payload = createValidPayload();
      getFirstCommand(payload).category = category;

      const result = validateRuntimeCommandFile(payload);

      expect(result.valid).toBe(true);
    }
  });

  it("rejects execution payloads that reference undefined argument tokens", () => {
    const payload = createValidPayload();
    getExec(payload).args = ["{{text}}", "{{missing}}"];

    expect(expectInvalidReason(payload)).toContain('undefined token "missing"');
  });

  it("rejects number defaults that cannot be parsed", () => {
    const payload = createValidPayload();
    const firstArg = getFirstArg(payload);
    firstArg.type = "number";
    firstArg.default = "oops";

    expect(expectInvalidReason(payload)).toContain("valid number string");
  });

  it("rejects number defaults below min", () => {
    const payload = createValidPayload();
    const firstArg = getFirstArg(payload);
    firstArg.type = "number";
    firstArg.validation = {
      min: 1
    };
    firstArg.default = "0";

    expect(expectInvalidReason(payload)).toContain("greater than or equal to min");
  });

  it("rejects duplicate arg keys within the same command", () => {
    const payload = createValidPayload();
    getArgs(payload).push({
      key: "text",
      label: "Text copy",
      type: "text"
    });

    expect(expectInvalidReason(payload)).toContain("must be unique");
  });

  it("rejects blank localized locale keys that schema cannot express", () => {
    const payload = createValidPayload();
    getFirstCommand(payload).name = {
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
    getFirstCommand(payload).prerequisites = [
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
          exec: {
            program: "echo",
            args: ["hello"]
          },
          shell: "powershell",
          adminRequired: false
        }
      ]
    });

    expect(result.valid).toBe(false);
    if (result.valid) {
      throw new Error("expected invalid schema result");
    }
    expect(result.reason).toContain("shell");
  });

  it("rejects script runners without a matching shell prerequisite", () => {
    const payload = createScriptPayload();
    getFirstCommand(payload).prerequisites = [
      {
        id: "pwsh",
        type: "binary",
        required: true,
        check: "pwsh -v"
      }
    ];

    expect(expectInvalidReason(payload)).toContain("matching shell prerequisite");
  });

  it("rejects commands that define both exec and script", () => {
    const payload = createValidPayload();
    getFirstCommand(payload).script = {
      runner: "powershell",
      command: "Write-Host {{text}}"
    };

    expect(expectInvalidReason(payload)).toContain("exactly one");
  });

  it("rejects stdinArgKey values that do not reference a declared arg", () => {
    const payload = createValidPayload();
    getExec(payload).stdinArgKey = "missing";

    expect(expectInvalidReason(payload)).toContain("stdinArgKey");
  });
});
