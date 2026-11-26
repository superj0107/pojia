@echo off
chcp 65001 >nul
setlocal
title pojia apply
echo.
where pojia >nul 2>nul
if errorlevel 1 (
  echo [X] pojia CLI not found. Run the installer bat first.
  if not "%POJIA_NO_PAUSE%"=="1" pause
  exit /b 2
)
echo  Inject current persona into codex + claude.
echo  codex: use pojia-codex to launch (add ~/.pojia/bin to PATH).
echo  Restore with the revert bat.
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "pojia apply codex; pojia apply claude; pojia status"
if not "%POJIA_NO_PAUSE%"=="1" pause
