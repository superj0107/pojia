@echo off
chcp 65001 >nul
setlocal
title pojia revert
echo.
where pojia >nul 2>nul
if errorlevel 1 (
  echo [X] pojia CLI not found. Nothing to revert.
  if not "%POJIA_NO_PAUSE%"=="1" pause
  exit /b 2
)
echo  Restoring codex + claude configs. Personas are kept.
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "pojia revert codex; pojia revert claude; pojia status"
if not "%POJIA_NO_PAUSE%"=="1" pause
