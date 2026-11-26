@echo off
chcp 65001 >nul
setlocal
title pojia revert
echo.
echo  Restoring original configs (codex + claude). Personas are kept.
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "pojia revert codex; pojia revert claude; pojia status"
if not "%POJIA_NO_PAUSE%"=="1" pause
