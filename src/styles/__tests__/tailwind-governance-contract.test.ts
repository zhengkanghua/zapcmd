import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function collectComponentSourceFiles(dirPath: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") {
        continue;
      }
      files.push(...collectComponentSourceFiles(absolutePath));
      continue;
    }
    if (entry.isFile() && (absolutePath.endsWith(".vue") || absolutePath.endsWith(".ts"))) {
      files.push(absolutePath);
    }
  }
  return files;
}

function readProjectFile(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("tailwind governance contract", () => {
  it("高风险 arbitrary token class 已收口为语义类", () => {
    const sources = [
      readProjectFile("src/components/settings/ui/SSegmentNav.vue"),
      readProjectFile("src/components/settings/ui/SDropdown.vue"),
      readProjectFile("src/components/settings/ui/SToggle.vue"),
      readProjectFile("src/components/settings/ui/SHotkeyRecorder.vue"),
      readProjectFile("src/components/settings/parts/SettingsCommandsSection.vue"),
      readProjectFile("src/components/settings/parts/SettingsGeneralSection.vue"),
      readProjectFile("src/components/shared/ui/buttonPrimitives.ts")
    ];

    const bannedPatterns = [
      /text-\[color:var\(--ui-/,
      /border-\[color:var\(--ui-/,
      /focus-visible:shadow-\[0_0_0_2px_var\(--ui-brand-soft\)\]/,
      /focus-visible:shadow-\[0_0_0_3px_var\(--ui-settings-focus-ring\)\]/,
      /enabled:hover:bg-\[var\(--ui-control-muted-hover-bg\)\]/,
      /enabled:hover:border-\[var\(--ui-control-muted-hover-border\)\]/,
      /\[font-family:var\(--ui-font-mono\)\]/
    ];

    for (const source of sources) {
      for (const pattern of bannedPatterns) {
        expect(source).not.toMatch(pattern);
      }
    }
  });

  it("Launcher 重复 keycap / toast 样式改为共享 primitive", () => {
    const commandPanelSource = readProjectFile("src/components/launcher/parts/LauncherCommandPanel.vue");
    const searchPanelSource = readProjectFile("src/components/launcher/parts/LauncherSearchPanel.vue");
    const flowPanelSource = readProjectFile("src/components/launcher/parts/LauncherFlowPanel.vue");

    for (const source of [commandPanelSource, searchPanelSource, flowPanelSource]) {
      expect(source).toContain("ui-glass-toast");
    }

    for (const source of [searchPanelSource, flowPanelSource]) {
      expect(source).toContain("ui-keycap");
      expect(source).not.toContain(
        "shadow-[0_1px_1px_rgba(var(--ui-black-rgb),0.2),inset_0_1px_0_rgba(var(--ui-text-rgb),0.1)]"
      );
    }
  });

  it("预算统计覆盖共享 .ts 原语文件，但不扫描组件测试", () => {
    const componentRoot = path.resolve(process.cwd(), "src/components");
    const sourceFiles = collectComponentSourceFiles(componentRoot);

    expect(sourceFiles).toContain(path.resolve(process.cwd(), "src/components/shared/ui/buttonPrimitives.ts"));
    expect(sourceFiles.some((filePath) => filePath.includes("__tests__"))).toBe(false);
  });

  it("组件模板中不再保留 var(--ui-*) 驱动的 arbitrary utility", () => {
    const componentRoot = path.resolve(process.cwd(), "src/components");
    const sourceFiles = collectComponentSourceFiles(componentRoot);
    const arbitraryVarRegex = /\[[^\]\n]*var\(--ui-[^\]\n]*\]/g;

    const total = sourceFiles.reduce((sum, filePath) => {
      const source = readFileSync(filePath, "utf8");
      return sum + (source.match(arbitraryVarRegex)?.length ?? 0);
    }, 0);

    expect(total).toBe(0);
  });
});
