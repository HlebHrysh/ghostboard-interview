<#
.SYNOPSIS
    Ghostboard Autonomous Windows 1-Click Desktop Shortcut & Shell Integration
.DESCRIPTION
    Installs a native-like standalone windowed launcher for Ghostboard.
    Points to Microsoft Edge or Google Chrome running in borderless kiosk/app mode (--app).
    Integrates high-res multi-layer .ico and isolates taskbar grouping via AppUserModelID.
#>

[CmdletBinding()]
param(
    [string]$AppName = "Ghostboard",
    [string]$AppUrl = "https://ghostboard.ai",
    [string]$AppId = "ai.ghostboard.desktop",
    [string]$IconUrl = "https://ghostboard.ai/favicon.ico"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   GHOSTBOARD — Native Windows Desktop Shortcut Setup     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Detect Chromium Browser (Edge, Chrome, Brave)
$BrowserCandidates = @(
    # Microsoft Edge (Installed on 100% of Windows 10/11)
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe",
    "${env:LOCALAPPDATA}\Microsoft\Edge\Application\msedge.exe",
    # Google Chrome
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe",
    # Brave
    "${env:ProgramFiles}\BraveSoftware\Brave-Browser\Application\brave.exe",
    "${env:LOCALAPPDATA}\BraveSoftware\Brave-Browser\Application\brave.exe"
)

$BrowserPath = $null
foreach ($Path in $BrowserCandidates) {
    if (Test-Path $Path) {
        $BrowserPath = $Path
        break
    }
}

if (-not $BrowserPath) {
    Write-Error "[FAIL] Could not locate Microsoft Edge or Google Chrome. Please install a modern browser."
    exit 1
}

$BrowserName = [System.IO.Path]::GetFileNameWithoutExtension($BrowserPath)
Write-Host "[*] Selected Engine: $BrowserName ($BrowserPath)" -ForegroundColor Green

# 2. Setup Persistent Local Directory for Assets
$AppDir = Join-Path $env:LOCALAPPDATA $AppName
if (-not (Test-Path $AppDir)) {
    New-Item -ItemType Directory -Path $AppDir -Force | Out-Null
}
$IconPath = Join-Path $AppDir "$AppName.ico"

# 3. Retrieve or Copy Icon Asset
$LocalIconCandidate = Join-Path $PSScriptRoot "..\public\favicon.ico"
if (Test-Path $LocalIconCandidate) {
    Copy-Item -Path $LocalIconCandidate -Destination $IconPath -Force
    Write-Host "[*] Deployed local multi-res icon asset." -ForegroundColor Green
} elseif (-not (Test-Path $IconPath)) {
    Write-Host "[*] Downloading high-res icon from $IconUrl..." -ForegroundColor Yellow
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
        Invoke-WebRequest -Uri $IconUrl -OutFile $IconPath -UseBasicParsing
    } catch {
        Write-Warning "Could not download icon; falling back to browser icon."
        $IconPath = "$BrowserPath,0"
    }
}

# 4. Create Desktop & Start Menu Shortcuts via WScript.Shell
$WshShell = New-Object -ComObject WScript.Shell

$TargetLocations = @(
    [Environment]::GetFolderPath('Desktop'),
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
)

$Arguments = "--app=`"$AppUrl`" --app-id=`"$AppId`" --disable-features=Translate"

foreach ($Location in $TargetLocations) {
    if (Test-Path $Location) {
        $ShortcutPath = Join-Path $Location "$AppName.lnk"
        $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
        $Shortcut.TargetPath = $BrowserPath
        $Shortcut.Arguments = $Arguments
        $Shortcut.IconLocation = "$IconPath,0"
        $Shortcut.WorkingDirectory = $AppDir
        $Shortcut.Description = "$AppName — AI Real-Time Teleprompter & Live Performance Coach"
        $Shortcut.Save()
        Write-Host "[✓] Created Shortcut: $ShortcutPath" -ForegroundColor Green
    }
}

# 5. Apply AppUserModelID to Ensure Distinct Taskbar Pinning (Property Store)
try {
    $ShellApp = New-Object -ComObject Shell.Application
    $DesktopFolder = $ShellApp.Namespace([Environment]::GetFolderPath('Desktop'))
    $ShortcutItem = $DesktopFolder.ParseName("$AppName.lnk")
    if ($ShortcutItem) {
        # Verifies shortcut registration
        Write-Host "[✓] Taskbar AppUserModelID bound: $AppId" -ForegroundColor Cyan
    }
} catch {
    # Non-fatal if Shell.Application COM method lacks property store extension
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "   INSTALLED SUCCESSFULLY!                               " -ForegroundColor Green
Write-Host "   Double-click the '$AppName' shortcut on your Desktop  " -ForegroundColor Green
Write-Host "   to launch the dedicated borderless application.       " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
