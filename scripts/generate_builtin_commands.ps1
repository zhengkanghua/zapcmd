param(
  [string]$SourceDir = "commands/catalog",
  [string]$SourcePattern = "_*.yaml",
  [string]$OutputDir = "assets/runtime_templates/commands/builtin",
  [string]$ManifestPath = "assets/runtime_templates/commands/builtin/index.json",
  [string]$GeneratedDocsDir = "docs/generated_commands",
  [string]$GeneratedIndexPath = "docs/generated_commands/index.md",
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
  --generatedDocsDir $GeneratedDocsDir `
  --generatedIndexPath $GeneratedIndexPath `
  --expectedLogicalCount $ExpectedLogicalCount

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
