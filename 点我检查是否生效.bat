@echo off
chcp 65001 >nul
setlocal
title pojia doctor
echo.
where pojia >nul 2>nul
if errorlevel 1 (
  echo [X] pojia CLI not found. Run the installer bat first.
  if not "%POJIA_NO_PAUSE%"=="1" pause
  exit /b 2
)
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "pojia doctor"
if not "%POJIA_NO_PAUSE%"=="1" pause
