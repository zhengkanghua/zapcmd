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

const legacyHiddenScrollbarUtility = `.scrollbar-${"none"}`;

describe("tailwind governance contract", () => {
  it("Tauri drag region 只保留视觉提示，不在 CSS 中重复注入 app-region 语义", () => {
    const tailwindSource = readProjectFile("src/styles/tailwind.css");

    expect(tailwindSource).toContain("[data-tauri-drag-region]");
    expect(tailwindSource).not.toMatch(/-webkit-app-region:\s*(drag|no-drag)/);
    expect(tailwindSource).not.toMatch(/(?<!-webkit-)app-region:\s*(drag|no-drag)/);
  });

  it("scrollbar-subtle utility 提供细滚动条契约，并清理旧的隐藏滚动条 utility", () => {
    const tailwindSource = readProjectFile("src/styles/tailwind.css");

    expect(tailwindSource).toContain(".scrollbar-subtle");
    expect(tailwindSource).toMatch(/\.scrollbar-subtle\s*\{[\s\S]*scrollbar-width:\s*thin;/);
    expect(tailwindSource).toMatch(
      /\.scrollbar-subtle\s*\{[\s\S]*scrollbar-color:\s*rgba\(var\(--ui-text-rgb\),\s*0\.(16|18)\)\s+transparent;/
    );
    expect(tailwindSource).toMatch(/\.scrollbar-subtle::-webkit-scrollbar\s*\{[\s\S]*width:\s*4px;/);
    expect(tailwindSource).toMatch(
      /\.scrollbar-subtle::-webkit-scrollbar-thumb\s*\{[\s\S]*background:\s*rgba\(var\(--ui-text-rgb\),\s*0\.(16|18)\);/
    );
    expect(tailwindSource).toMatch(
      /\.scrollbar-subtle::-webkit-scrollbar-thumb:hover\s*\{[\s\S]*background:\s*rgba\(var\(--ui-text-rgb\),\s*0\.(26|28)\);/
    );
    expect(tailwindSource).not.toContain(legacyHiddenScrollbarUtility);
  });

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

  it("Settings 高重复 transition/easing arbitrary 已收口为语义类", () => {
    const sources = [
      readProjectFile("src/components/settings/ui/SToggle.vue"),
      readProjectFile("src/components/settings/ui/SDropdown.vue"),
      readProjectFile("src/components/settings/ui/SHotkeyRecorder.vue"),
      readProjectFile("src/components/settings/parts/SettingsCommandsSection.vue")
    ];

    const requiredClasses = [
      "ease-settings-emphasized",
      "transition-settings-field",
      "transition-settings-interactive",
      "transition-settings-toggle-track",
      "transition-settings-toggle-thumb"
    ];

    for (const source of sources) {
      const hasAnyRequiredClass = requiredClasses.some((className) => source.includes(className));
      expect(hasAnyRequiredClass).toBe(true);
    }

    const bannedPatterns = [
      /ease-\[cubic-bezier\(0\.33,1,0\.68,1\)\]/,
      /transition-\[background,border-color,color,box-shadow\]/,
      /transition-\[border-color,box-shadow,background\]/,
      /transition-\[background,box-shadow\]/,
      /transition-\[transform,background\]/
    ];

    for (const source of sources) {
      for (const pattern of bannedPatterns) {
        expect(source).not.toMatch(pattern);
      }
    }
  });

  it("Launcher 高重复 transition/easing arbitrary 已收口为语义类", () => {
    const sources = [
      readProjectFile("src/components/launcher/parts/LauncherSearchPanel.vue"),
      readProjectFile("src/components/launcher/parts/LauncherStagingPanel.vue"),
      readProjectFile("src/components/launcher/parts/LauncherFlowPanel.vue"),
      readProjectFile("src/components/launcher/parts/LauncherCommandPanel.vue"),
      readProjectFile("src/components/launcher/parts/LauncherQueueSummaryPill.vue")
    ];

    const requiredClasses = [
      "ease-launcher-emphasized",
      "transition-launcher-surface",
      "transition-launcher-pressable",
      "transition-launcher-card",
      "transition-launcher-field",
      "transition-launcher-interactive",
      "transition-launcher-emphasis",
      "transition-launcher-width"
    ];

    for (const source of sources) {
      const hasAnyRequiredClass = requiredClasses.some((className) => source.includes(className));
      expect(hasAnyRequiredClass).toBe(true);
    }

    const bannedPatterns = [
      /transition-\[background-color,border-color\]/,
      /transition-\[background-color,transform\]/,
      /transition-\[transform,border-color,opacity,box-shadow\]/,
      /transition-\[color,background-color,box-shadow\]/,
      /transition-\[opacity,background-color,color,box-shadow\]/,
      /transition-\[border-color,box-shadow,background-color\]/,
      /transition-\[opacity,box-shadow\]/,
      /transition-\[width\]/,
      /transition-\[background,border-color\]/,
      /ease-\[cubic-bezier\(0\.175,0\.885,0\.32,1\.15\)\]/
    ];

    for (const source of sources) {
      for (const pattern of bannedPatterns) {
        expect(source).not.toMatch(pattern);
      }
    }
  });

  it("Settings 不再通过 descendant arbitrary 耦合子组件内部类名", () => {
    const sources = [
      readProjectFile("src/components/settings/parts/SettingsHotkeysSection.vue"),
      readProjectFile("src/components/settings/parts/SettingsCommandsSection.vue")
    ];

    for (const source of sources) {
      expect(source).not.toMatch(/\[&_.*\]/);
    }
  });

  it("Vue 组件不再保留 <style> 样式块例外", () => {
    const componentRoot = path.resolve(process.cwd(), "src/components");
    const sourceFiles = collectComponentSourceFiles(componentRoot);

    for (const filePath of sourceFiles.filter((candidate) => candidate.endsWith(".vue"))) {
      const source = readFileSync(filePath, "utf8");
      expect(source).not.toMatch(/<style\b/i);
    }
  });
});
