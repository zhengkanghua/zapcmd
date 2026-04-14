function collapseWhitespace(value) {
  return String(value).replace(/\s+/gu, " ").trim();
}

function pickLocalizedText(value, defaultLocale) {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const direct = value[defaultLocale];
    if (typeof direct === "string" && direct.trim().length > 0) {
      return direct;
    }
  }
  return "";
}

function formatExecutionSummary(command) {
  if (command.exec) {
    return collapseWhitespace([command.exec.program, ...(command.exec.args ?? [])].join(" "));
  }
  return collapseWhitespace(`${command.script.runner}: ${command.script.command}`);
}

function formatPlatform(command) {
  if (Array.isArray(command.platform)) {
    return command.platform.join(", ");
  }
  return String(command.platform);
}

export function buildGeneratedMarkdown(catalog) {
  const defaultLocale =
    typeof catalog?.localeConfig?.defaultLocale === "string" &&
    catalog.localeConfig.defaultLocale.trim().length > 0
      ? catalog.localeConfig.defaultLocale.trim()
      : "zh";

  const moduleTitle =
    pickLocalizedText(catalog?.meta?.name, defaultLocale) ||
    catalog?.moduleSlug ||
    catalog.fileName.replace(/\.yaml$/u, "");

  const lines = [
    `# ${catalog.fileName.replace(/\.yaml$/u, "")}`,
    "",
    "> 此文件为自动生成，禁止手动修改。",
    `> Source: ${catalog.fileName}`,
    "",
    `## ${moduleTitle}`,
    ""
  ];

  if (catalog.meta.description) {
    const description = pickLocalizedText(catalog.meta.description, defaultLocale);
    if (description) {
      lines.push(description, "");
    }
  }

  lines.push("## Commands", "");

  for (const command of catalog.commands) {
    lines.push(`### ${command.id}`, "");
    const commandName =
      pickLocalizedText(command.name, defaultLocale) ||
      (typeof command.name === "string" ? command.name : "") ||
      command.id;
    lines.push(`- 名称：${commandName}`);
    lines.push(`- 平台：${formatPlatform(command)}`);
    lines.push(`- 分类：${command.category ?? catalog.moduleSlug}`);
    lines.push(`- 执行：${command.exec ? "exec" : "script"}`);
    lines.push(`- 预览：\`${formatExecutionSummary(command)}\``);
    if (Array.isArray(command.tags) && command.tags.length > 0) {
      lines.push(`- Tags：${command.tags.join(", ")}`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

export function buildGeneratedMarkdownIndex({
  sourceDir,
  outputDir,
  generatedDocsDir,
  entries
}) {
  const lines = [
    "# Generated Commands",
    "",
    "> 此文件为自动生成，禁止手动修改。",
    `> Source dir: ${sourceDir}`,
    `> Output dir: ${outputDir}`,
    `> Docs dir: ${generatedDocsDir}`,
    "",
    "| Module | Source | JSON | Logical | Physical |",
    "|---|---|---|---|---|"
  ];

  for (const entry of entries) {
    lines.push(
      `| ${entry.docFile} | ${entry.sourceFile} | ${entry.file} | ${entry.logicalCount} | ${entry.physicalCount} |`
    );
  }

  return `${lines.join("\n")}\n`;
}
