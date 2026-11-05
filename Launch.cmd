@echo off
setlocal
cd /d "%~dp0"

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found. Install it, then run this file again.
  pause
  exit /b 1
)

echo Starting Mithraic HW Monitor...
call npm.cmd run tauri dev
set "CODE=%ERRORLEVEL%"

if not "%CODE%"=="0" (
  echo.
  echo Mithraic HW Monitor exited with code %CODE%.
  pause
)
exit /b %CODE%
