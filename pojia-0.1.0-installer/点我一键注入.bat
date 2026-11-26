@echo off
chcp 65001 >nul
setlocal
title pojia apply
echo.
echo  Inject current persona into codex + claude (sys layer for codex).
echo  Use "point me uninstall.bat" to restore.
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "pojia apply codex; pojia apply claude; pojia status"
if not "%POJIA_NO_PAUSE%"=="1" pause
