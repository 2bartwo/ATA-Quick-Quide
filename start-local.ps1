# ATA Quick Guide - local HTTP server (Python http.server)
# UTF-8 BOM recommended for Windows PowerShell 5.1 + Turkish Windows
$ErrorActionPreference = 'Continue'
Set-Location -LiteralPath $PSScriptRoot

$Port = 5500
$HomeUrl = "http://127.0.0.1:$Port/anasayfa/"

foreach ($dir in Get-ChildItem -Path "$env:LOCALAPPDATA\Programs\Python" -Directory -Filter 'Python*' -ErrorAction SilentlyContinue) {
    $env:PATH = "$($dir.FullName);$($dir.FullName)\Scripts;$env:PATH"
}

function Test-PortListening {
    param([int] $P)
    Get-NetTCPConnection -LocalPort $P -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
}

if (Test-PortListening -P $Port) {
    Write-Host "[Uyari] Port $Port kullanimda. Bu dosyada `$Port degistirin veya o islemi kapatin." -ForegroundColor Yellow
    Read-Host 'Cikmak icin Enter'
    exit 1
}

$pyExe = $null
$pyPrefix = @()
if (Get-Command py -ErrorAction SilentlyContinue) {
    try {
        & py -3 -c 'import sys' 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $pyExe = (Get-Command py).Source
            $pyPrefix = @('-3')
        }
    } catch { }
}
if (-not $pyExe -and (Get-Command py -ErrorAction SilentlyContinue)) {
    try {
        & py -c 'import sys' 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $pyExe = (Get-Command py).Source
            $pyPrefix = @()
        }
    } catch { }
}
if (-not $pyExe -and (Get-Command python -ErrorAction SilentlyContinue)) {
    try {
        & python -c 'import sys' 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $pyExe = (Get-Command python).Source
            $pyPrefix = @()
        }
    } catch { }
}

if (-not $pyExe) {
    Write-Host '[Hata] Python yok: https://www.python.org/downloads/' -ForegroundColor Red
    Read-Host 'Cikmak icin Enter'
    exit 1
}

Write-Host ""
Write-Host " ATA Quick Guide - yerel sunucu"
Write-Host " Ana sayfa: $HomeUrl"
Write-Host ""

$argLine = ($pyPrefix + @('-m', 'http.server', "$Port")) -join ' '
$cmdPayload = 'cd /d "{0}" && title ATA Quick Guide sunucu && echo. && echo  http.server {1} (Ctrl+C) && echo. && "{2}" {3}' -f @(
    $PSScriptRoot,
    $Port,
    $pyExe,
    $argLine
)
Start-Process -FilePath 'cmd.exe' -ArgumentList @('/k', $cmdPayload)

for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 1
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri $HomeUrl -TimeoutSec 2
        if ($r.StatusCode -eq 200) { break }
    } catch { }
}

Start-Process $HomeUrl
Write-Host "Tarayici: $HomeUrl"
Write-Host 'Sunucuyu durdurmak icin sunucu penceresinde Ctrl+C.'
Write-Host ''
Read-Host 'Bu pencereyi kapatmak icin Enter'
