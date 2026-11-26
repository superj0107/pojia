@echo off
chcp 65001 >nul
setlocal
title pojia uninstall
echo.
echo  Uninstall pojia CLI and restore codex/claude configs.
echo  Personas in ~/.pojia are kept.
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "pojia revert codex; pojia revert claude"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" -Uninstall
if not "%POJIA_NO_PAUSE%"=="1" pause
