import { describe, expect, it } from "vitest";
import { mapRuntimeCommandToTemplate, resolveRuntimeText } from "../runtimeMapper";
import type { RuntimeCommand } from "../runtimeTypes";

describe("runtimeMapper", () => {
  it("picks preferred localized text in zh/en order", () => {
    expect(
      resolveRuntimeText({
        en: "English",
        zh: "中文"
      })
    ).toBe("中文");
  });

  it("maps runtime command to launcher command template", () => {
    const runtimeCommand: RuntimeCommand = {
      id: "docker-logs",
      name: "查看容器日志",
      description: "查看日志",
      tags: ["docker", "logs"],
      category: "docker",
      platform: "all",
      template: "docker logs --tail {{lines}} {{container}}",
      adminRequired: false,
      dangerous: false,
      args: [
        {
          key: "container",
          label: "container",
          type: "text",
          required: true
        },
        {
          key: "lines",
          label: "lines",
          type: "number",
          default: "100"
        }
      ]
    };

    const template = mapRuntimeCommandToTemplate(runtimeCommand);
    expect(template.id).toBe("docker-logs");
    expect(template.folder).toBe("@_docker");
    expect(template.needsArgs).toBe(true);
    expect(template.args?.[0]?.token).toBe("{{container}}");
    expect(template.argToken).toBe("{{container}}");
    expect(template.adminRequired).toBe(false);
    expect(template.dangerous).toBe(false);
  });
});
