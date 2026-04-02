function collapseWhitespace(value) {
  return String(value).replace(/\s+/gu, " ").trim();
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
  const lines = [
    `# ${catalog.fileName.replace(/\.yaml$/u, "")}`,
    "",
    "> 此文件为自动生成，禁止手动修改。",
    `> Source: ${catalog.fileName}`,
    "",
    `## ${catalog.meta.name}`,
    ""
  ];

  if (catalog.meta.description) {
    lines.push(catalog.meta.description, "");
  }

  lines.push("## Commands", "");

  for (const command of catalog.commands) {
    lines.push(`### ${command.id}`, "");
    lines.push(`- 名称：${command.name}`);
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
