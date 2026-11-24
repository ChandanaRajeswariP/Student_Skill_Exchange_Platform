@echo off
cd /d "%~dp0backend"
"%~dp0runtime\node\node.exe" --test tests/validation.test.mjs
if errorlevel 1 goto end
"%~dp0runtime\node\node.exe" --env-file=.env scripts/test-database.mjs
if errorlevel 1 goto end
"%~dp0runtime\node\node.exe" --env-file=.env scripts/test-api.mjs
if errorlevel 1 goto end
"%~dp0runtime\node\node.exe" --env-file=.env scripts/test-resources.mjs
:end
pause
