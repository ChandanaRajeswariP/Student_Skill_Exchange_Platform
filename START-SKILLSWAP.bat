@echo off
setlocal
cd /d "%~dp0Skill_exchange-backend\backend"
"..\runtime\node\node.exe" scripts\portable-start.mjs
if errorlevel 1 (
  echo See Skill_exchange-backend\backend\work\logs for details.
  pause
  exit /b 1
)
start "" "http://127.0.0.1:3000/"
