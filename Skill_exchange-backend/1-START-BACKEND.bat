@echo off
cd /d "%~dp0backend"
"%~dp0runtime\node\node.exe" "%~dp0backend\scripts\portable-start.mjs"
pause
