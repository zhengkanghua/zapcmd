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

function Split-TopLevel {
  param(
    [Parameter(Mandatory = $true)][string]$Text,
    [char]$Delimiter = ','
  )

  $result = @()
  $buffer = ""
  $depth = 0
  foreach ($ch in $Text.ToCharArray()) {
    if ($ch -eq '(') {
      $depth++
      $buffer += $ch
      continue
    }
    if ($ch -eq ')') {
      if ($depth -gt 0) { $depth-- }
      $buffer += $ch
      continue
    }
    if ($ch -eq $Delimiter -and $depth -eq 0) {
      $result += $buffer.Trim()
      $buffer = ""
      continue
    }
    $buffer += $ch
  }
  if ($buffer.Trim().Length -gt 0) {
    $result += $buffer.Trim()
  }
  return @($result)
}

function Convert-NumberLiteral {
  param([Parameter(Mandatory = $true)][string]$Value)

  $parsed = [double]::Parse($Value, [System.Globalization.CultureInfo]::InvariantCulture)
  if ($parsed -eq [math]::Truncate($parsed)) {
    return [int]$parsed
  }
  return $parsed
}

function Convert-ArgsSpec {
  param([string]$Spec)

  if ([string]::IsNullOrWhiteSpace($Spec) -or $Spec.Trim() -eq '-') {
    return @()
  }

  $args = @()
  $items = @(Split-TopLevel -Text $Spec -Delimiter ',')
  foreach ($item in $items) {
    if ($item -notmatch '^([a-zA-Z0-9_\-]+)\((.+)\)$') {
      throw "Unrecognized args token: '$item'"
    }

    $key = $matches[1].Trim()
    $inner = $matches[2].Trim()
    $arg = [ordered]@{
      key      = $key
      label    = $key
      type     = "text"
      required = $true
    }

    if ($inner.TrimStart().StartsWith("select:", [System.StringComparison]::OrdinalIgnoreCase)) {
      $arg.type = "select"
      $optionsRaw = $inner.Substring($inner.IndexOf(':') + 1).Trim()
      $options = @()
      if ($optionsRaw.Contains(',')) {
        $options = $optionsRaw.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
      } elseif ($optionsRaw.Contains('/')) {
        $options = $optionsRaw.Split('/') | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
      } else {
        if ($optionsRaw -ne "") { $options = @($optionsRaw) }
      }
      if ($options.Count -eq 0) {
        throw "Select arg '$key' has no options: '$item'"
      }
      $arg.validation = [ordered]@{ options = $options }
    } else {
      $innerParts = @(Split-TopLevel -Text $inner -Delimiter ',')
      $baseType = $innerParts[0].Trim().ToLowerInvariant()
      switch ($baseType) {
        "text" { $arg.type = "text" }
        "number" { $arg.type = "number" }
        "path" { $arg.type = "path" }
        default { throw "Unsupported arg type '$baseType' in '$item'" }
      }

      if ($innerParts.Count -gt 1) {
        $validation = [ordered]@{}
        for ($i = 1; $i -lt $innerParts.Count; $i++) {
          $kv = $innerParts[$i]
          if ($kv -match '^\s*default\s*:\s*(.+)\s*$') {
            $arg.default = $matches[1].Trim()
            continue
          }
          if ($kv -match '^\s*min\s*:\s*(.+)\s*$') {
            $validation.min = Convert-NumberLiteral -Value $matches[1].Trim()
            continue
          }
          if ($kv -match '^\s*max\s*:\s*(.+)\s*$') {
            $validation.max = Convert-NumberLiteral -Value $matches[1].Trim()
            continue
          }
        }
        if ($validation.Count -gt 0) {
          $arg.validation = $validation
        }
      }
    }

    $args += [pscustomobject]$arg
  }

  return @($args)
}

function Convert-Prerequisites {
  param([string]$Cell)

  if ([string]::IsNullOrWhiteSpace($Cell) -or $Cell.Trim() -eq '-') {
    return @()
  }

  $shellIds = @("powershell", "cmd", "bash", "zsh", "shell")
  $items = $Cell.Split(',') | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ -ne "" }
  $result = @()

  foreach ($id in $items) {
    $type = if ($shellIds -contains $id) { "shell" } else { "binary" }
    $check = if ($type -eq "shell") { "shell:$id" } else { "binary:$id" }
    $result += [pscustomobject][ordered]@{
      id       = $id
      type     = $type
      required = $true
      check    = $check
    }
  }
  return @($result)
}

function Convert-Tags {
  param([string]$Cell)

  if ([string]::IsNullOrWhiteSpace($Cell)) {
    return @()
  }

  $seen = @{}
  $tags = @()
  foreach ($tag in ($Cell -split '\s+')) {
    $t = $tag.Trim()
    if ($t -eq "") { continue }
    if (-not $seen.ContainsKey($t)) {
      $seen[$t] = $true
      $tags += $t
    }
  }
  return @($tags)
}

function Get-PlatformVariants {
  param(
    [Parameter(Mandatory = $true)][string]$Id,
    [Parameter(Mandatory = $true)][string]$Platform
  )

  $p = $Platform.Trim().ToLowerInvariant()
  switch ($p) {
    "all" { return @([pscustomobject]@{ id = $Id; platform = "all" }) }
    "win" { return @([pscustomobject]@{ id = $Id; platform = "win" }) }
    "mac" { return @([pscustomobject]@{ id = $Id; platform = "mac" }) }
    "linux" { return @([pscustomobject]@{ id = $Id; platform = "linux" }) }
    "mac/linux" {
      $result = @()
      foreach ($target in @("mac", "linux")) {
        $newId = $Id
        if ($Id -notmatch '-(win|mac|linux)$') {
          $newId = "$Id-$target"
        } elseif ($Id -notmatch "-$target$") {
          $newId = "$Id-$target"
        }
        $result += [pscustomobject]@{ id = $newId; platform = $target }
      }
      return @($result)
    }
    default {
      throw "Unsupported platform '$Platform' for id '$Id'"
    }
  }
}

if (-not (Test-Path $SourceDir)) {
  throw "Source directory not found: $SourceDir"
}

$sourceFiles = @(Get-ChildItem -Path $SourceDir -Filter $SourcePattern -File | Sort-Object Name)
if ($sourceFiles.Count -eq 0) {
  throw "No source markdown matched '$SourcePattern' in '$SourceDir'"
}

$logicalCount = 0
$physicalCount = 0
$globalIdSeen = @{}
$outputByFile = @{}
$summaryByFile = @{}

foreach ($sourceFile in $sourceFiles) {
  $fileId = [System.IO.Path]::GetFileNameWithoutExtension($sourceFile.Name)
  if ($fileId -notmatch '^_[a-zA-Z0-9_\-]+$') {
    throw "Source filename must start with '_' and only use [a-zA-Z0-9_-]: $($sourceFile.Name)"
  }

  $category = $fileId.TrimStart('_')
  $lines = Get-Content $sourceFile.FullName
  $displayName = $fileId
  foreach ($line in $lines) {
    if ($line -match '^\>\s*分类：(.+)$') {
      $displayName = $matches[1].Trim()
      break
    }
  }

  $rowCount = 0
  $commands = @()
  foreach ($line in $lines) {
    if ($line -match '^\|\s*(\d+)\s*\|\s*`([^`]+)`\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*`([^`]*)`\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*((?i:true|false))\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|$') {
      $order = [int]$matches[1]
      $id = $matches[2].Trim()
      $name = $matches[3].Trim()
      $platform = $matches[4].Trim()
      $template = ($matches[5] -replace '\\\|', '|').Trim()
      $argsSpec = $matches[6].Trim()
      $riskCell = $matches[7].Trim()
      $adminRequired = [System.Convert]::ToBoolean($matches[8].Trim())
      $prereqCell = $matches[9].Trim()
      $tagsCell = $matches[10].Trim()

      $rowCount++
      $logicalCount++

      $tags = @(Convert-Tags -Cell $tagsCell)
      if ($tags.Count -eq 0) {
        throw "Empty tags in $($sourceFile.Name), id '$id'"
      }
      $argList = @(Convert-ArgsSpec -Spec $argsSpec)
      $prereqs = @(Convert-Prerequisites -Cell $prereqCell)
      $dangerous = $false
      if ($riskCell -eq "⚠️" -or $riskCell.ToLowerInvariant() -eq "true") {
        $dangerous = $true
      }

      $variants = @(Get-PlatformVariants -Id $id -Platform $platform)
      foreach ($variant in $variants) {
        $cmd = [ordered]@{
          id            = $variant.id
          name          = $name
          tags          = $tags
          category      = $category
          platform      = $variant.platform
          template      = $template
          adminRequired = [bool]$adminRequired
          dangerous     = [bool]$dangerous
        }
        if ($argList.Count -gt 0) { $cmd.args = $argList }
        if ($prereqs.Count -gt 0) { $cmd.prerequisites = $prereqs }

        if ($globalIdSeen.ContainsKey($cmd.id)) {
          throw "Duplicate generated id '$($cmd.id)'"
        }
        $globalIdSeen[$cmd.id] = $true
        $commands += [pscustomobject]$cmd
        $physicalCount++
      }
    }
  }

  if ($rowCount -eq 0) {
    throw "No command rows found in source file: $($sourceFile.Name)"
  }

  $outputByFile[$fileId] = [pscustomobject]@{
    displayName = $displayName
    commands = $commands
  }
  $summaryByFile[$fileId] = [pscustomobject]@{
    sourceFile = $sourceFile.Name
    logicalCount = $rowCount
    physicalCount = $commands.Count
    category = $category
  }
}

if ($ExpectedLogicalCount -gt 0 -and $logicalCount -ne $ExpectedLogicalCount) {
  throw "Expected logical count $ExpectedLogicalCount, got $logicalCount"
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$manifestFiles = @()
foreach ($fileId in ($outputByFile.Keys | Sort-Object)) {
  $entry = $outputByFile[$fileId]
  $commands = $entry.commands

  $doc = [ordered]@{
    _meta = [ordered]@{
      name = $entry.displayName
      author = "zapcmd-team"
      version = "1.0.0"
      description = "Generated from docs/command_sources"
      source = "docs/command_sources/$fileId.md"
    }
    commands = $commands
  }

  $targetPath = Join-Path $OutputDir "$fileId.json"
  $doc | ConvertTo-Json -Depth 100 | Set-Content -Encoding UTF8 $targetPath

  $summary = $summaryByFile[$fileId]
  $manifestFiles += [pscustomobject][ordered]@{
    file = "$fileId.json"
    sourceFile = $summary.sourceFile
    category = $summary.category
    logicalCount = $summary.logicalCount
    physicalCount = $summary.physicalCount
  }
}

$manifest = [ordered]@{
  sourceDir = $SourceDir
  sourcePattern = $SourcePattern
  logicalCommandCount = $logicalCount
  physicalCommandCount = $physicalCount
  generatedFiles = $manifestFiles
}
$manifest | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 $ManifestPath

$md = @()
$md += "# Builtin Commands Generated Snapshot"
$md += ""
$md += "> Source dir: $SourceDir"
$md += "> Source pattern: $SourcePattern"
$md += "> This file is generated by scripts/generate_builtin_commands.ps1."
$md += ""
$md += "## Summary"
$md += ""
$md += "- Logical commands: $logicalCount"
$md += "- Physical commands (after platform split): $physicalCount"
$md += "- Output directory: $OutputDir"
$md += ""
$md += "## Files"
$md += ""
$md += "| File | Source | Category | Logical | Physical |"
$md += "|---|---|---|---|---|"
foreach ($f in $manifestFiles) {
  $md += "| $($f.file) | $($f.sourceFile) | $($f.category) | $($f.logicalCount) | $($f.physicalCount) |"
}
($md -join [Environment]::NewLine) | Set-Content -Encoding UTF8 $GeneratedMarkdownPath

Write-Output "Generated builtin command files:"
Write-Output "  SourceDir: $SourceDir"
Write-Output "  SourceFiles: $($sourceFiles.Count)"
Write-Output "  Logical: $logicalCount"
Write-Output "  Physical: $physicalCount"
Write-Output "  Output: $OutputDir"
Write-Output "  Manifest: $ManifestPath"
Write-Output "  Snapshot: $GeneratedMarkdownPath"
