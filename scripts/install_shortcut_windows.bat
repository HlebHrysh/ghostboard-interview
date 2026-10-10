@echo off
:: ============================================================================
:: Ghostboard 1-Click Windows Shortcut Installer
:: Double-click to install Ghostboard as a native-like desktop app.
:: ============================================================================
title Installing Ghostboard Desktop Shortcut...
color 0B

echo.
echo ==========================================================
echo    Installing Ghostboard Desktop Shortcut...
echo ==========================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install_shortcut_windows.ps1"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Installation completed successfully!
    timeout /t 3 >nul
) else (
    echo.
    echo Installation failed with exit code %ERRORLEVEL%.
    pause
)
exit /b %ERRORLEVEL%
