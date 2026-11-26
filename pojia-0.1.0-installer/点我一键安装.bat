@echo off
chcp 65001 >nul
setlocal
title pojia installer
echo.
echo  Installing pojia CLI...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" %*
set "RC=%ERRORLEVEL%"
echo.
if not "%RC%"=="0" echo [X] Install failed. See above.
if not "%POJIA_NO_PAUSE%"=="1" pause
exit /b %RC%
