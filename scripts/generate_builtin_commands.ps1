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

  $allowedTypes = @("binary", "shell", "env", "network", "permission")
  $items = $Cell.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
  $result = @()

  foreach ($token in $items) {
    if ($token -notmatch '^\s*([a-zA-Z]+)\s*:(.+)\s*$') {
      throw "Invalid prerequisite token '$token'. Expected typed prerequisite token '<type>:<target>'."
    }

    $type = $matches[1].Trim().ToLowerInvariant()
    $id = $matches[2].Trim()

    if (-not ($allowedTypes -contains $type)) {
      throw "Unsupported prerequisite type '$type' in token '$token'."
    }

    if ([string]::IsNullOrWhiteSpace($id)) {
      throw "Invalid prerequisite token '$token'. Target cannot be empty."
    }

    $result += [pscustomobject][ordered]@{
      id       = $id
      type     = $type
      required = $true
      check    = "${type}:$id"
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

function Unquote-InlineCodeCell {
  param([string]$Cell)

  $value = $Cell.Trim()
  if ($value.Length -ge 2 -and $value.StartsWith('`') -and $value.EndsWith('`')) {
    return $value.Substring(1, $value.Length - 2)
  }
  return $value
}

function Split-MarkdownTableRow {
  param([string]$Line)

  if ([string]::IsNullOrWhiteSpace($Line)) {
    return @()
  }

  $trimmed = $Line.Trim()
  if (-not $trimmed.StartsWith('|')) {
    return @()
  }

  $cells = @()
  $buffer = ""
  $insideInlineCode = $false
  for ($i = 0; $i -lt $trimmed.Length; $i++) {
    $ch = $trimmed[$i]
    $previous = if ($i -gt 0) { $trimmed[$i - 1] } else { [char]0 }

    if ($ch -eq '`' -and $previous -ne '\') {
      $insideInlineCode = -not $insideInlineCode
      $buffer += $ch
      continue
    }

    if ($ch -eq '|' -and -not $insideInlineCode -and $previous -ne '\') {
      $cells += $buffer.Trim()
      $buffer = ""
      continue
    }

    $buffer += $ch
  }

  if ($buffer.Length -gt 0) {
    $cells += $buffer.Trim()
  }

  if ($cells.Count -gt 0 -and $cells[0] -eq "") {
    $cells = if ($cells.Count -gt 1) { @($cells[1..($cells.Count - 1)]) } else { @() }
  }
  if ($cells.Count -gt 0 -and $cells[$cells.Count - 1] -eq "") {
    $cells = if ($cells.Count -gt 1) { @($cells[0..($cells.Count - 2)]) } else { @() }
  }

  return @($cells)
}

function Test-MarkdownTableSeparatorRow {
  param([string[]]$Cells)

  if ($null -eq $Cells -or $Cells.Count -eq 0) {
    return $false
  }

  foreach ($cell in $Cells) {
    if ($cell.Trim() -notmatch '^:?-{3,}:?$') {
      return $false
    }
  }

  return $true
}

function Get-CommandSourceTableLayout {
  param(
    [string[]]$Cells,
    [Parameter(Mandatory = $true)][string]$ExpectedFileId
  )

  $legacyHeader = @("#", "ID", "名称", "平台", "模板", "参数", "高危", "adminRequired", "prerequisites", "tags")
  $rowRuntimeHeader = @("#", "ID", "名称", "运行时分类", "平台", "模板", "参数", "高危", "adminRequired", "prerequisites", "tags")
  $joinedCells = $Cells -join "`n"

  if ($joinedCells -ceq ($legacyHeader -join "`n")) {
    return [pscustomobject]@{
      hasRowRuntimeCategory = $false
      expectedColumnCount = $legacyHeader.Count
    }
  }

  if ($joinedCells -ceq ($rowRuntimeHeader -join "`n")) {
    return [pscustomobject]@{
      hasRowRuntimeCategory = $true
      expectedColumnCount = $rowRuntimeHeader.Count
    }
  }

  throw "Unsupported command table header in '$ExpectedFileId'"
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

function Get-SourceHeaderMetadata {
  param(
    [AllowEmptyString()][string[]]$Lines,
    [Parameter(Mandatory = $true)][string]$ExpectedFileId
  )

  $titleIndex = -1
  for ($i = 0; $i -lt $Lines.Count; $i++) {
    if (-not [string]::IsNullOrWhiteSpace($Lines[$i])) {
      $titleIndex = $i
      break
    }
  }

  if ($titleIndex -lt 0) {
    throw "Missing required # _slug header in '$ExpectedFileId'"
  }

  $titleLine = $Lines[$titleIndex]
  if ($titleLine -cnotmatch '^\#\s+(_[a-z0-9]+(?:-[a-z0-9]+)*)\s*$') {
    throw "First non-empty line must be '# _slug' in '$ExpectedFileId'"
  }

  $declaredFileId = $matches[1]
  if ($declaredFileId -cne $ExpectedFileId) {
    throw "Header slug '$declaredFileId' must match filename '$ExpectedFileId'"
  }

  for ($i = $titleIndex + 1; $i -lt $Lines.Count; $i++) {
    if ($Lines[$i] -match '^\#\s+') {
      throw "Duplicate # _slug header found in '$ExpectedFileId'"
    }
  }

  $displayName = $null
  $runtimeCategory = $null
  $metadataIndex = $titleIndex + 1
  while ($metadataIndex -lt $Lines.Count -and [string]::IsNullOrWhiteSpace($Lines[$metadataIndex])) {
    $metadataIndex++
  }

  while ($metadataIndex -lt $Lines.Count) {
    $line = $Lines[$metadataIndex]
    if ([string]::IsNullOrWhiteSpace($line) -or $line -notmatch '^\>\s*') {
      break
    }

    if ($line -match '^\>\s*([^：:]+)\s*[：:]\s*(.*)$') {
      $key = $matches[1].Trim()
      $value = $matches[2].Trim()
      switch ($key) {
        "分类" {
          if ($null -ne $displayName) {
            throw "Duplicate 分类 metadata in '$ExpectedFileId'"
          }
          if ([string]::IsNullOrWhiteSpace($value)) {
            throw "分类 metadata cannot be empty in '$ExpectedFileId'"
          }
          $displayName = $value
        }
        "运行时分类" {
          if ($null -ne $runtimeCategory) {
            throw "Duplicate 运行时分类 metadata in '$ExpectedFileId'"
          }
          if ([string]::IsNullOrWhiteSpace($value)) {
            throw "运行时分类 metadata cannot be empty in '$ExpectedFileId'"
          }
          if ($value -cnotmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$') {
            throw "运行时分类 metadata must be a valid slug in '$ExpectedFileId': '$value'"
          }
          $runtimeCategory = $value
        }
        default { }
      }
    }

    $metadataIndex++
  }

  if ([string]::IsNullOrWhiteSpace($displayName)) {
    throw "Missing required 分类 metadata in '$ExpectedFileId'"
  }

  return [pscustomobject]@{
    displayName = $displayName
    runtimeCategory = if ($null -ne $runtimeCategory) { $runtimeCategory } else { $ExpectedFileId.TrimStart('_') }
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
  if ($fileId -cnotmatch '^_[a-z0-9]+(?:-[a-z0-9]+)*$') {
    throw ('Source filename must be _<slug>.md and category slug must match ^[a-z0-9]+(?:-[a-z0-9]+)*$: ' + $sourceFile.Name)
  }

  $moduleSlug = $fileId.TrimStart('_')
  $lines = Get-Content $sourceFile.FullName
  $headerMetadata = Get-SourceHeaderMetadata -Lines $lines -ExpectedFileId $fileId
  $displayName = $headerMetadata.displayName
  $defaultRuntimeCategory = $headerMetadata.runtimeCategory

  $rowCount = 0
  $commands = @()
  $runtimeCategoriesSeen = @{}
  $tableLayout = $null
  foreach ($line in $lines) {
    $cells = @(Split-MarkdownTableRow -Line $line)
    if ($cells.Count -eq 0) {
      continue
    }
    if (Test-MarkdownTableSeparatorRow -Cells $cells) {
      continue
    }
    if ($null -eq $tableLayout) {
      $tableLayout = Get-CommandSourceTableLayout -Cells $cells -ExpectedFileId $fileId
      continue
    }
    if ($cells[0] -eq "#") {
      throw "Duplicate command table header found in '$fileId'"
    }
    if ($cells.Count -ne $tableLayout.expectedColumnCount) {
      throw "Command row in '$fileId' must contain $($tableLayout.expectedColumnCount) cells"
    }

    $order = [int]$cells[0].Trim()
    $id = Unquote-InlineCodeCell -Cell $cells[1]
    $name = $cells[2].Trim()
    $rowRuntimeCategoryCell = $null
    if ($tableLayout.hasRowRuntimeCategory) {
      $rowRuntimeCategoryCell = $cells[3].Trim()
      $platform = $cells[4].Trim()
      $templateCell = $cells[5]
      $argsSpec = $cells[6].Trim()
      $riskCell = $cells[7].Trim()
      $adminRequired = [System.Convert]::ToBoolean($cells[8].Trim())
      $prereqCell = $cells[9].Trim()
      $tagsCell = $cells[10].Trim()
    } else {
      $platform = $cells[3].Trim()
      $templateCell = $cells[4]
      $argsSpec = $cells[5].Trim()
      $riskCell = $cells[6].Trim()
      $adminRequired = [System.Convert]::ToBoolean($cells[7].Trim())
      $prereqCell = $cells[8].Trim()
      $tagsCell = $cells[9].Trim()
    }

    $template = (Unquote-InlineCodeCell -Cell $templateCell) -replace '\\\|', '|'
    $runtimeCategory = $defaultRuntimeCategory
    if (-not [string]::IsNullOrWhiteSpace($rowRuntimeCategoryCell) -and $rowRuntimeCategoryCell -ne '-') {
      if ($rowRuntimeCategoryCell -cnotmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$') {
        throw "运行时分类 column must be a valid slug in '$fileId': '$rowRuntimeCategoryCell'"
      }
      $runtimeCategory = $rowRuntimeCategoryCell
    }

    $rowCount++
    $logicalCount++

    $runtimeCategoriesSeen[$runtimeCategory] = $true
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
        category      = $runtimeCategory
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
    moduleSlug = $moduleSlug
    runtimeCategories = @($runtimeCategoriesSeen.Keys | Sort-Object)
  }
}

if ($ExpectedLogicalCount -gt 0 -and $logicalCount -ne $ExpectedLogicalCount) {
  throw "Expected logical count $ExpectedLogicalCount, got $logicalCount"
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$manifestFiles = @()
$generatedJsonByFile = @{}
$expectedOutputFiles = @{}
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

  $generatedJsonByFile[$fileId] = $doc | ConvertTo-Json -Depth 100
  $expectedOutputFiles["$fileId.json"] = $true

  $summary = $summaryByFile[$fileId]
  $manifestFiles += [pscustomobject][ordered]@{
    file = "$fileId.json"
    sourceFile = $summary.sourceFile
    moduleSlug = $summary.moduleSlug
    runtimeCategories = $summary.runtimeCategories
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
$manifestContent = $manifest | ConvertTo-Json -Depth 20

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
$md += "| File | Source | Module | Runtime Categories | Logical | Physical |"
$md += "|---|---|---|---|---|---|"
foreach ($f in $manifestFiles) {
  $md += "| $($f.file) | $($f.sourceFile) | $($f.moduleSlug) | $([string]::Join(', ', $f.runtimeCategories)) | $($f.logicalCount) | $($f.physicalCount) |"
}
$snapshotContent = $md -join [Environment]::NewLine

foreach ($fileId in ($generatedJsonByFile.Keys | Sort-Object)) {
  $targetPath = Join-Path $OutputDir "$fileId.json"
  $generatedJsonByFile[$fileId] | Set-Content -Encoding UTF8 $targetPath
}
$manifestContent | Set-Content -Encoding UTF8 $ManifestPath
$snapshotContent | Set-Content -Encoding UTF8 $GeneratedMarkdownPath

# 只有在全部新产物落盘成功后，才允许清理已经失去源文件对应关系的旧 builtin JSON。
$staleJsonFiles = @(Get-ChildItem -Path $OutputDir -Filter "_*.json" -File | Where-Object {
  -not $expectedOutputFiles.ContainsKey($_.Name)
})
foreach ($staleFile in $staleJsonFiles) {
  try {
    Remove-Item -LiteralPath $staleFile.FullName -Force -ErrorAction Stop
  } catch {
    throw "Failed to remove stale builtin json file: $($staleFile.FullName)"
  }
}

Write-Output "Generated builtin command files:"
Write-Output "  SourceDir: $SourceDir"
Write-Output "  SourceFiles: $($sourceFiles.Count)"
Write-Output "  Logical: $logicalCount"
Write-Output "  Physical: $physicalCount"
Write-Output "  Output: $OutputDir"
Write-Output "  Manifest: $ManifestPath"
Write-Output "  Snapshot: $GeneratedMarkdownPath"
