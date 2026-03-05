param(
  [switch]$Force = $false,
  [string]$InstallRoot = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Info([string]$Message) {
  Write-Host "[msedgedriver] $Message"
}

function Try-Run([string]$Command, [string[]]$Args, [int]$TimeoutSec = 20) {
  try {
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $Command
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true

    foreach ($arg in $Args) {
      [void]$startInfo.ArgumentList.Add($arg)
    }

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    [void]$process.Start()

    if (-not $process.WaitForExit($TimeoutSec * 1000)) {
      try { $process.Kill($true) } catch {}
      return @{ ok = $false; output = ""; timedOut = $true }
    }

    $output = $process.StandardOutput.ReadToEnd()
    if ($process.ExitCode -eq 0) {
      return @{ ok = $true; output = ($output | Out-String).Trim(); timedOut = $false }
    }
  } catch {}
  return @{ ok = $false; output = ""; timedOut = $false }
}

if (-not $Force) {
  Write-Info "Probing existing msedgedriver..."
  $existing = Try-Run "msedgedriver" @("--version")
  if ($existing.ok) {
    Write-Info "Found existing: $($existing.output)"
    exit 0
  }
  if ($existing.timedOut) {
    Write-Info "Existing msedgedriver probe timed out; continue with fresh install."
  }
}

function Get-EdgeVersion() {
  $candidates = @()

  try {
    $cmd = Get-Command "msedge" -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source) { $candidates += $cmd.Source }
  } catch {}

  $pf = $env:ProgramFiles
  $pf86 = ${env:ProgramFiles(x86)}

  if ($pf86) { $candidates += (Join-Path $pf86 "Microsoft\Edge\Application\msedge.exe") }
  if ($pf) { $candidates += (Join-Path $pf "Microsoft\Edge\Application\msedge.exe") }

  foreach ($edgePath in ($candidates | Where-Object { $_ -and $_.Length -gt 0 } | Select-Object -Unique)) {
    if (-not (Test-Path -LiteralPath $edgePath)) { continue }

    $probe = Try-Run $edgePath @("--version")
    if ($probe.ok -and $probe.output) {
      # "Microsoft Edge 123.0.1234.5"
      $m = [regex]::Match($probe.output, "(\d+\.\d+\.\d+\.\d+)")
      if ($m.Success) { return $m.Groups[1].Value }
    }

    try {
      $productVersion = (Get-Item -LiteralPath $edgePath).VersionInfo.ProductVersion
      if ($productVersion) {
        $m2 = [regex]::Match($productVersion, "^(\d+\.\d+\.\d+\.\d+)")
        if ($m2.Success) { return $m2.Groups[1].Value }
      }
    } catch {}
  }

  return ""
}

function Test-UrlExists([string]$Url) {
  try {
    $resp = Invoke-WebRequest -Uri $Url -Method Head -TimeoutSec 15
    return ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300)
  } catch {
    return $false
  }
}

function Get-DriverVersionFromIndex([string]$IndexUrl) {
  $raw = Invoke-RestMethod -Uri $IndexUrl -TimeoutSec 30
  $text = ($raw | Out-String)
  $normalized = ($text -replace "`0", "" -replace "[^0-9\.]", "").Trim()
  $m = [regex]::Match($normalized, "^(\d+\.\d+\.\d+\.\d+)$")
  if (-not $m.Success) {
    throw "Failed to parse EdgeDriver version from index: $IndexUrl"
  }
  return $m.Groups[1].Value
}

$edgeVersion = Get-EdgeVersion
if (-not $edgeVersion) {
  throw "Unable to detect Microsoft Edge version. Please ensure Edge is installed on this machine."
}

$zipName = "edgedriver_win64.zip"
if ($env:PROCESSOR_ARCHITECTURE -and $env:PROCESSOR_ARCHITECTURE -eq "ARM64") {
  $zipName = "edgedriver_arm64.zip"
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$defaultRoot = Join-Path $repoRoot ".tmp\webdriver"
if ($env:RUNNER_TEMP) {
  $defaultRoot = Join-Path $env:RUNNER_TEMP "zapcmd-webdriver"
}

$root = if ($InstallRoot -and $InstallRoot.Trim().Length -gt 0) { $InstallRoot } else { $defaultRoot }

Write-Info "Edge version: $edgeVersion"
Write-Info "Install root: $root"

$driverHost = "https://msedgedriver.microsoft.com"

$candidateVersion = $edgeVersion
$candidateUrl = "$driverHost/$candidateVersion/$zipName"

$driverVersion = ""
$downloadUrl = ""

if (Test-UrlExists $candidateUrl) {
  $driverVersion = $candidateVersion
  $downloadUrl = $candidateUrl
  Write-Info "Using exact match driver version: $driverVersion"
} else {
  Write-Info "No exact match driver for $edgeVersion, falling back to LATEST_STABLE"
  $driverVersion = Get-DriverVersionFromIndex "$driverHost/LATEST_STABLE"
  if (-not $driverVersion) {
    throw "Failed to resolve EdgeDriver version from LATEST_STABLE"
  }
  $downloadUrl = "$driverHost/$driverVersion/$zipName"
  Write-Info "Using LATEST_STABLE driver version: $driverVersion"
}

$installDir = Join-Path $root (Join-Path "msedgedriver" $driverVersion)
New-Item -ItemType Directory -Force -Path $installDir | Out-Null

$zipPath = Join-Path $installDir $zipName
Write-Info "Downloading: $downloadUrl"
Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -TimeoutSec 180

Write-Info "Extracting to: $installDir"
Expand-Archive -Path $zipPath -DestinationPath $installDir -Force

$exe = Get-ChildItem -Path $installDir -Recurse -Filter "msedgedriver.exe" | Select-Object -First 1
if (-not $exe) {
  throw "msedgedriver.exe not found after extraction under: $installDir"
}

$binDir = $exe.Directory.FullName
$env:PATH = "$binDir;$env:PATH"

if ($env:GITHUB_PATH) {
  Add-Content -Path $env:GITHUB_PATH -Value $binDir
}

$versionOut = Try-Run $exe.FullName @("--version") 15
if ($versionOut.ok) {
  Write-Info "Installed: $($versionOut.output)"
} elseif ($versionOut.timedOut) {
  Write-Info "Installed at: $($exe.FullName)"
  Write-Info "Version probe timed out; continue and let desktop smoke verify runtime launch."
} else {
  Write-Info "Installed at: $($exe.FullName)"
  Write-Info "Version probe failed; continue and let desktop smoke verify runtime launch."
}
