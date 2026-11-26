@echo off
chcp 65001 >nul
setlocal
title pojia doctor
echo.
echo  pojia status + environment check.
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "pojia doctor"
if not "%POJIA_NO_PAUSE%"=="1" pause
