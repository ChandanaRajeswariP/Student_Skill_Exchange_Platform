@echo off
cd /d "%~dp0backend"
"%~dp0runtime\node\node.exe" --env-file=.env scripts/present-backend.mjs
pause
