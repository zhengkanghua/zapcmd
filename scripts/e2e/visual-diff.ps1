param(
  [Parameter(Mandatory = $true)]
  [string]$BaselinePath,

  [Parameter(Mandatory = $true)]
  [string]$ActualPath,

  # 允许的差异像素占比（0~1），用于降低不同机器/不同渲染细节导致的 flaky。
  [double]$MaxDiffRatio = 0.005,

  # 单像素 RGB 差异阈值（sum(abs(dr,dg,db))）。用于忽略极小的抗锯齿噪声。
  [int]$PixelTolerance = 0,

  # 采样步长：1 表示逐像素；>1 表示抽样比较以换取速度。
  [int]$SampleStep = 1,

  # 可选：将 JSON 输出写入文件（避免某些受限环境无法通过 stdout 读取）。
  [string]$OutPath
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

Add-Type -AssemblyName System.Drawing

function Convert-ToArgb32Bitmap([System.Drawing.Bitmap]$Source) {
  $dest = New-Object System.Drawing.Bitmap $Source.Width, $Source.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($dest)
  try {
    $g.DrawImage($Source, 0, 0, $Source.Width, $Source.Height) | Out-Null
  } finally {
    $g.Dispose()
  }
  return $dest
}

function Read-BitmapFromFile([string]$ImagePath) {
  $bytes = [System.IO.File]::ReadAllBytes($ImagePath)
  $stream = New-Object System.IO.MemoryStream(, $bytes)
  try {
    $decoded = [System.Drawing.Bitmap]::new($stream)
    try {
      return New-Object System.Drawing.Bitmap $decoded
    } finally {
      $decoded.Dispose()
    }
  } finally {
    $stream.Dispose()
  }
}

function Compare-Bitmaps(
  [System.Drawing.Bitmap]$Baseline,
  [System.Drawing.Bitmap]$Actual,
  [int]$Step,
  [int]$Tolerance
) {
  if ($Baseline.Width -ne $Actual.Width -or $Baseline.Height -ne $Actual.Height) {
    return @{
      ok = $false
      reason = "size_mismatch"
      width = $Baseline.Width
      height = $Baseline.Height
      actualWidth = $Actual.Width
      actualHeight = $Actual.Height
      diffPixels = $null
      totalPixels = $null
      diffRatio = $null
    }
  }

  if ($Step -lt 1) { $Step = 1 }

  $rect = New-Object System.Drawing.Rectangle 0, 0, $Baseline.Width, $Baseline.Height
  $format = [System.Drawing.Imaging.PixelFormat]::Format32bppArgb

  $bData = $Baseline.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, $format)
  $aData = $Actual.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, $format)
  try {
    $bStride = $bData.Stride
    $aStride = $aData.Stride
    $bBytes = New-Object byte[] ($bStride * $Baseline.Height)
    $aBytes = New-Object byte[] ($aStride * $Actual.Height)

    [System.Runtime.InteropServices.Marshal]::Copy($bData.Scan0, $bBytes, 0, $bBytes.Length)
    [System.Runtime.InteropServices.Marshal]::Copy($aData.Scan0, $aBytes, 0, $aBytes.Length)

    $diffPixels = 0
    $totalPixels = 0

    for ($y = 0; $y -lt $Baseline.Height; $y += $Step) {
      for ($x = 0; $x -lt $Baseline.Width; $x += $Step) {
        $totalPixels++
        $bOffset = ($y * $bStride) + ($x * 4)
        $aOffset = ($y * $aStride) + ($x * 4)

        # BGRA order in Format32bppArgb
        $bB = $bBytes[$bOffset]
        $bG = $bBytes[$bOffset + 1]
        $bR = $bBytes[$bOffset + 2]
        $aB = $aBytes[$aOffset]
        $aG = $aBytes[$aOffset + 1]
        $aR = $aBytes[$aOffset + 2]

        if ($bR -eq $aR -and $bG -eq $aG -and $bB -eq $aB) {
          continue
        }

        $delta = [math]::Abs($bR - $aR) + [math]::Abs($bG - $aG) + [math]::Abs($bB - $aB)
        if ($delta -gt $Tolerance) {
          $diffPixels++
        }
      }
    }

    $ratio = if ($totalPixels -gt 0) { $diffPixels / $totalPixels } else { 0.0 }
    return @{
      ok = $true
      reason = "compared"
      width = $Baseline.Width
      height = $Baseline.Height
      diffPixels = $diffPixels
      totalPixels = $totalPixels
      diffRatio = $ratio
    }
  } finally {
    $Baseline.UnlockBits($bData)
    $Actual.UnlockBits($aData)
  }
}

function Write-ResultJson([hashtable]$Payload) {
  $json = $Payload | ConvertTo-Json -Compress
  if (-not $OutPath) {
    $json
    return
  }

  $parent = Split-Path -Parent $OutPath
  if ($parent) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }
  Set-Content -LiteralPath $OutPath -Value $json -Encoding utf8
}

if (-not (Test-Path -LiteralPath $BaselinePath)) {
  $payload = @{ ok = $false; reason = "baseline_missing"; path = $BaselinePath }
  Write-ResultJson $payload
  exit 2
}

if (-not (Test-Path -LiteralPath $ActualPath)) {
  $payload = @{ ok = $false; reason = "actual_missing"; path = $ActualPath }
  Write-ResultJson $payload
  exit 2
}

$baselineBitmap = Read-BitmapFromFile -ImagePath $BaselinePath
$actualBitmap = Read-BitmapFromFile -ImagePath $ActualPath
$baselineArgb = $null
$actualArgb = $null

try {
  $baselineArgb = Convert-ToArgb32Bitmap $baselineBitmap
  $actualArgb = Convert-ToArgb32Bitmap $actualBitmap

  $result = Compare-Bitmaps -Baseline $baselineArgb -Actual $actualArgb -Step $SampleStep -Tolerance $PixelTolerance

  if ($result.reason -eq "size_mismatch") {
    Write-ResultJson $result
    exit 1
  }

  $ratio = [double]$result.diffRatio
  $ok = $ratio -le $MaxDiffRatio

  $payload = @{
    ok = $ok
    reason = $result.reason
    width = $result.width
    height = $result.height
    diffPixels = $result.diffPixels
    totalPixels = $result.totalPixels
    diffRatio = $ratio
    maxDiffRatio = $MaxDiffRatio
    pixelTolerance = $PixelTolerance
    sampleStep = $SampleStep
  }

  Write-ResultJson $payload
  if ($ok) { exit 0 }
  exit 1
} finally {
  if ($baselineArgb) { $baselineArgb.Dispose() }
  if ($actualArgb) { $actualArgb.Dispose() }
  $baselineBitmap.Dispose()
  $actualBitmap.Dispose()
}
