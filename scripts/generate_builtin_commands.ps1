param(
  [string]$SourceDir = "docs/command_sources",
  [string]$SourcePattern = "_*.md",
  [string]$OutputDir = "assets/runtime_templates/commands/builtin",
  [string]$ManifestPath = "assets/runtime_templates/commands/builtin/index.json",
  [string]$GeneratedMarkdownPath = "docs/builtin_commands.generated.md",
  [int]$ExpectedLogicalCount = 0
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $PSScriptRoot "commands/generate-builtin-commands.mjs"

& node $scriptPath `
  --sourceDir $SourceDir `
  --sourcePattern $SourcePattern `
  --outputDir $OutputDir `
  --manifestPath $ManifestPath `
  --generatedMarkdownPath $GeneratedMarkdownPath `
  --expectedLogicalCount $ExpectedLogicalCount

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
